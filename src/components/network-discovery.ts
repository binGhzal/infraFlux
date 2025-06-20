import * as pulumi from '@pulumi/pulumi';
import * as command from '@pulumi/command';
import { config } from '@/config';
import { logResource } from '@/utils/logger';

export interface NetworkDiscoveryArgs {
  clusterName: string;
  masterCount?: number;
  workerCount?: number;
  startingIP?: number;
  timeout?: number;
}

export interface DiscoveredVM {
  vmId: number;
  nodeType: 'master' | 'worker';
  macAddress: string;
  dhcpIP?: string;
  staticIP: string;
  ready: boolean;
}

export interface ClusterVMIds {
  masters: number[];
  workers: number[];
  all: number[];
}

/**
 * NetworkDiscovery - Configuration-aware network discovery for Talos clusters
 *
 * This component automatically:
 * 1. Calculates VM IDs based on cluster configuration
 * 2. Discovers DHCP IPs for all cluster VMs
 * 3. Maps them to intended static IPs
 * 4. Handles variable cluster sizes dynamically
 */
export class NetworkDiscovery extends pulumi.ComponentResource {
  public readonly discoveredVMs: pulumi.Output<DiscoveredVM[]>;
  public readonly ready: pulumi.Output<boolean>;
  public readonly vmIds: ClusterVMIds;

  constructor(
    name: string,
    args: NetworkDiscoveryArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:network:NetworkDiscovery', name, {}, opts);

    // Use config values or provided args
    const masterCount = args.masterCount ?? config.kubernetes.masterNodes;
    const workerCount = args.workerCount ?? config.kubernetes.workerNodes;
    const startingIP = args.startingIP ?? 200;
    const timeout = args.timeout ?? 300;

    // Generate VM IDs based on actual cluster configuration
    this.vmIds = this.generateVMIds(masterCount, workerCount);

    logResource('NetworkDiscovery', 'Starting', {
      clusterName: args.clusterName,
      masterCount,
      workerCount,
      vmIds: this.vmIds,
      timeout: `${timeout}s`,
    });

    // Create dynamic discovery script based on actual cluster configuration
    const discoveryScript = new command.local.Command(
      `${name}-discover`,
      {
        create: this.createDiscoveryScript(this.vmIds.all, timeout),
        triggers: [
          new Date().toISOString(), // Force re-run on each deployment
          JSON.stringify(this.vmIds), // Re-run if cluster config changes
        ],
      },
      { parent: this }
    );

    // Parse the discovery results with configuration-aware mapping
    this.discoveredVMs = discoveryScript.stdout.apply((output) => {
      try {
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON output found in discovery script');
        }

        const results = JSON.parse(jsonMatch[0]);
        return this.mapDiscoveryResults(
          results,
          masterCount,
          workerCount,
          startingIP
        );
      } catch (error) {
        logResource('NetworkDiscovery', 'ParseError', {
          error: error instanceof Error ? error.message : String(error),
          rawOutput: output.slice(-500), // Last 500 chars for debugging
        });
        // Return fallback data
        return this.createFallbackResults(masterCount, workerCount, startingIP);
      }
    });

    this.ready = this.discoveredVMs.apply((vms) =>
      vms.every((vm) => vm.ready && vm.dhcpIP)
    );

    this.registerOutputs({
      discoveredVMs: this.discoveredVMs,
      ready: this.ready,
      vmIds: this.vmIds,
    });
  }

  /**
   * Generate VM IDs based on cluster configuration
   */
  private generateVMIds(
    masterCount: number,
    workerCount: number
  ): ClusterVMIds {
    const masters: number[] = [];
    const workers: number[] = [];

    // Generate master VM IDs (8000, 8001, 8002, ...)
    for (let i = 0; i < masterCount; i++) {
      masters.push(8000 + i);
    }

    // Generate worker VM IDs (8100, 8101, 8102, ...)
    for (let i = 0; i < workerCount; i++) {
      workers.push(8100 + i);
    }

    return {
      masters,
      workers,
      all: [...masters, ...workers],
    };
  }

  /**
   * Create the discovery script with dynamic VM ID list
   */
  private createDiscoveryScript(vmIds: number[], timeout: number): string {
    const vmIdList = vmIds.join(' ');

    return `#!/bin/bash
set -e

echo "Starting network discovery for cluster VMs..."
echo "VM IDs to discover: ${vmIdList}"
echo "Master count: ${config.kubernetes.masterNodes}"
echo "Worker count: ${config.kubernetes.workerNodes}"

# Extract Proxmox host from endpoint
PROXMOX_HOST="${config.proxmox.endpoint.replace(/https?:\/\/([^:]+).*/, '$1')}"

# Function to get VM MAC address
get_vm_mac() {
  local vmid=$1
  ssh "${config.proxmox.username}@$PROXMOX_HOST" \
    "qm config $vmid | grep -o 'virtio=[^,]*' | cut -d= -f2" 2>/dev/null || echo ""
}

# Function to find IP by MAC in ARP table
find_ip_by_mac() {
  local mac=$1
  # Try both local ARP and remote ARP
  {
    arp -a | grep -i "$mac" | grep -o '[0-9]*\\.[0-9]*\\.[0-9]*\\.[0-9]*' | head -1
    ssh "${config.proxmox.username}@$PROXMOX_HOST" \
      "arp -a | grep -i '$mac' | grep -o '[0-9]*\\.[0-9]*\\.[0-9]*\\.[0-9]*' | head -1" 2>/dev/null
  } | grep -v '^$' | head -1
}

# Wait for VMs to boot and get network connectivity
echo "Waiting for VMs to boot and acquire DHCP addresses..."
sleep 30

# Discovery loop with timeout
start_time=$(date +%s)
timeout_time=$((start_time + ${timeout}))

declare -A vm_results

while [ $(date +%s) -lt $timeout_time ]; do
  all_found=true

  for vmid in ${vmIdList}; do
    if [ -z "\${vm_results[$vmid]:-}" ]; then
      echo "Discovering VM $vmid..."

      # Get MAC address
      mac=$(get_vm_mac "$vmid")
      if [ -z "$mac" ]; then
        echo "  ERROR: Could not get MAC for VM $vmid"
        all_found=false
        continue
      fi

      echo "  MAC: $mac"

      # Find IP address
      ip=$(find_ip_by_mac "$mac")
      if [ -z "$ip" ]; then
        echo "  Waiting for DHCP address..."
        all_found=false
        continue
      fi

      echo "  DHCP IP: $ip"

      # Test connectivity to Talos API
      if nc -z -w 5 "$ip" 50000 2>/dev/null; then
        echo "  ✅ Talos API accessible at $ip:50000"
        vm_results[$vmid]="$mac,$ip,ready"
      else
        echo "  ⏳ Waiting for Talos API at $ip:50000"
        all_found=false
      fi
    fi
  done

  if [ "$all_found" = true ]; then
    echo "✅ All VMs discovered successfully!"
    break
  fi

  echo "Retrying in 10 seconds..."
  sleep 10
done

# Output results as JSON
echo "{"
first=true
for vmid in ${vmIdList}; do
  if [ "$first" = false ]; then
    echo ","
  fi
  first=false

  result="\${vm_results[$vmid]:-}"
  if [ -n "$result" ]; then
    IFS=',' read -r mac dhcp_ip status <<< "$result"
    echo "  \"$vmid\": {\"mac\": \"$mac\", \"dhcp_ip\": \"$dhcp_ip\", \"ready\": true}"
  else
    echo "  \"$vmid\": {\"mac\": \"\", \"dhcp_ip\": \"\", \"ready\": false}"
  fi
done
echo "}"`;
  }

  /**
   * Map discovery results to DiscoveredVM objects with proper node types and IPs
   */
  private mapDiscoveryResults(
    results: Record<string, any>,
    masterCount: number,
    workerCount: number,
    startingIP: number
  ): DiscoveredVM[] {
    const vms: DiscoveredVM[] = [];

    // Map master nodes
    for (let i = 0; i < masterCount; i++) {
      const vmId = 8000 + i;
      const result = results[vmId.toString()];
      vms.push({
        vmId,
        nodeType: 'master',
        macAddress: result?.mac || '',
        dhcpIP: result?.dhcp_ip || undefined,
        staticIP: this.calculateStaticIP(
          vmId,
          masterCount,
          workerCount,
          startingIP
        ),
        ready: result?.ready || false,
      });
    }

    // Map worker nodes
    for (let i = 0; i < workerCount; i++) {
      const vmId = 8100 + i;
      const result = results[vmId.toString()];
      vms.push({
        vmId,
        nodeType: 'worker',
        macAddress: result?.mac || '',
        dhcpIP: result?.dhcp_ip || undefined,
        staticIP: this.calculateStaticIP(
          vmId,
          masterCount,
          workerCount,
          startingIP
        ),
        ready: result?.ready || false,
      });
    }

    return vms;
  }

  /**
   * Create fallback results when discovery fails
   */
  private createFallbackResults(
    masterCount: number,
    workerCount: number,
    startingIP: number
  ): DiscoveredVM[] {
    const vms: DiscoveredVM[] = [];

    // Create fallback master nodes
    for (let i = 0; i < masterCount; i++) {
      const vmId = 8000 + i;
      vms.push({
        vmId,
        nodeType: 'master',
        macAddress: '',
        dhcpIP: undefined,
        staticIP: this.calculateStaticIP(
          vmId,
          masterCount,
          workerCount,
          startingIP
        ),
        ready: false,
      });
    }

    // Create fallback worker nodes
    for (let i = 0; i < workerCount; i++) {
      const vmId = 8100 + i;
      vms.push({
        vmId,
        nodeType: 'worker',
        macAddress: '',
        dhcpIP: undefined,
        staticIP: this.calculateStaticIP(
          vmId,
          masterCount,
          workerCount,
          startingIP
        ),
        ready: false,
      });
    }

    return vms;
  }

  /**
   * Calculate static IP based on VM ID and cluster configuration
   */
  private calculateStaticIP(
    vmId: number,
    masterCount: number,
    workerCount: number,
    startingIP: number
  ): string {
    const baseIP = config.network.gateway.split('.').slice(0, 3).join('.');

    if (vmId >= 8000 && vmId < 8100) {
      // Master nodes: startingIP + master index
      const masterIndex = vmId - 8000;
      return `${baseIP}.${startingIP + masterIndex}`;
    } else if (vmId >= 8100 && vmId < 8200) {
      // Worker nodes: startingIP + masterCount + worker index
      const workerIndex = vmId - 8100;
      return `${baseIP}.${startingIP + masterCount + workerIndex}`;
    } else {
      // Fallback for unexpected VM IDs
      return `${baseIP}.${startingIP + (vmId - 8000)}`;
    }
  }

  /**
   * Get the discovered IP for a specific VM ID
   */
  public getVMIP(vmId: number): pulumi.Output<string> {
    return this.discoveredVMs.apply((vms) => {
      const vm = vms.find((v) => v.vmId === vmId);
      return vm?.dhcpIP || vm?.staticIP || '';
    });
  }

  /**
   * Get discovered VMs by node type
   */
  public getVMsByType(
    nodeType: 'master' | 'worker'
  ): pulumi.Output<DiscoveredVM[]> {
    return this.discoveredVMs.apply((vms) =>
      vms.filter((vm) => vm.nodeType === nodeType)
    );
  }

  /**
   * Check if all VMs are ready for Talos configuration
   */
  public allVMsReady(): pulumi.Output<boolean> {
    return this.ready;
  }

  /**
   * Get cluster summary
   */
  public getClusterSummary(): pulumi.Output<{
    masterNodes: number;
    workerNodes: number;
    totalNodes: number;
    readyNodes: number;
    discoveredNodes: number;
  }> {
    return this.discoveredVMs.apply((vms) => {
      const masters = vms.filter((vm) => vm.nodeType === 'master');
      const workers = vms.filter((vm) => vm.nodeType === 'worker');
      const ready = vms.filter((vm) => vm.ready);
      const discovered = vms.filter((vm) => vm.dhcpIP);

      return {
        masterNodes: masters.length,
        workerNodes: workers.length,
        totalNodes: vms.length,
        readyNodes: ready.length,
        discoveredNodes: discovered.length,
      };
    });
  }
}

/**
 * Helper function to wait for network transition from DHCP to static
 */
export class NetworkTransition extends pulumi.ComponentResource {
  public readonly transitionComplete: pulumi.Output<boolean>;

  constructor(
    name: string,
    args: {
      discoveredVMs: pulumi.Output<DiscoveredVM[]>;
      timeout?: number;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:network:NetworkTransition', name, {}, opts);

    const timeout = args.timeout ?? 300;

    // Monitor the transition from DHCP to static IPs
    const transitionMonitor = new command.local.Command(
      `${name}-monitor`,
      {
        create: args.discoveredVMs.apply((vms) => {
          const vmChecks = vms
            .map((vm) => {
              if (!vm.dhcpIP || !vm.staticIP) return '';
              return `
echo "Monitoring transition for ${vm.nodeType} VM ${vm.vmId}: ${vm.dhcpIP} → ${vm.staticIP}"

# Wait for static IP to become available
for i in $(seq 1 ${timeout}); do
  if nc -z -w 2 "${vm.staticIP}" 50000 2>/dev/null; then
    echo "✅ VM ${vm.vmId} (${vm.nodeType}) transitioned to static IP ${vm.staticIP}"
    break
  fi
  sleep 1
done`;
            })
            .filter(Boolean)
            .join('\n');

          return `#!/bin/bash
echo "Starting network transition monitoring..."
echo "Monitoring ${vms.length} VMs (${vms.filter((vm) => vm.nodeType === 'master').length} masters, ${vms.filter((vm) => vm.nodeType === 'worker').length} workers)"
${vmChecks}
echo "Network transition monitoring complete"`;
        }),
      },
      { parent: this }
    );

    this.transitionComplete = transitionMonitor.stdout.apply((output) =>
      output.includes('Network transition monitoring complete')
    );

    this.registerOutputs({
      transitionComplete: this.transitionComplete,
    });
  }
}
