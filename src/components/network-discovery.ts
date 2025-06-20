import * as pulumi from '@pulumi/pulumi';
import * as command from '@pulumi/command';
import { config } from '@/config';
import { logResource } from '@/utils/logger';

export interface NetworkDiscoveryArgs {
  vmIds: number[];
  timeout?: number;
}

export interface DiscoveredVM {
  vmId: number;
  macAddress: string;
  dhcpIP?: string;
  staticIP: string;
  ready: boolean;
}

/**
 * NetworkDiscovery - Handles the transition from DHCP to static IPs
 *
 * This component solves the chicken-and-egg problem:
 * 1. VMs boot and get DHCP addresses
 * 2. We discover their actual IPs
 * 3. We apply Talos config to transition to static IPs
 * 4. We wait for the transition to complete
 */
export class NetworkDiscovery extends pulumi.ComponentResource {
  public readonly discoveredVMs: pulumi.Output<DiscoveredVM[]>;
  public readonly ready: pulumi.Output<boolean>;

  constructor(
    name: string,
    args: NetworkDiscoveryArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:network:NetworkDiscovery', name, {}, opts);

    const timeout = args.timeout ?? 300; // 5 minute timeout

    logResource('NetworkDiscovery', 'Starting', {
      vmIds: args.vmIds,
      timeout: `${timeout}s`,
    });

    // Script to discover VM IPs via MAC address matching
    const discoveryScript = new command.local.Command(
      `${name}-discover`,
      {
        create: pulumi.interpolate`
          #!/bin/bash
          set -e

          echo "Starting network discovery for VMs: ${args.vmIds.join(',')}"

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

            for vmid in ${args.vmIds.join(' ')}; do
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
          for vmid in ${args.vmIds.join(' ')}; do
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
          echo "}"
        `,
        triggers: [new Date().toISOString()], // Force re-run on each deployment
      },
      { parent: this }
    );

    // Parse the discovery results
    this.discoveredVMs = discoveryScript.stdout.apply((output) => {
      try {
        const results = JSON.parse(output.split('\n').slice(-6).join('\n')); // Get last 6 lines (JSON output)
        return args.vmIds.map((vmId) => {
          const result = results[vmId.toString()];
          return {
            vmId,
            macAddress: result?.mac || '',
            dhcpIP: result?.dhcp_ip || undefined,
            staticIP: this.calculateStaticIP(vmId),
            ready: result?.ready || false,
          };
        });
      } catch (error) {
        logResource('NetworkDiscovery', 'ParseError', {
          error: error.toString(),
        });
        // Return fallback data
        return args.vmIds.map((vmId) => ({
          vmId,
          macAddress: '',
          dhcpIP: undefined,
          staticIP: this.calculateStaticIP(vmId),
          ready: false,
        }));
      }
    });

    this.ready = this.discoveredVMs.apply((vms) =>
      vms.every((vm) => vm.ready && vm.dhcpIP)
    );

    this.registerOutputs({
      discoveredVMs: this.discoveredVMs,
      ready: this.ready,
    });
  }

  private calculateStaticIP(vmId: number): string {
    const baseIP = config.network.gateway.split('.').slice(0, 3).join('.');

    // Calculate static IP based on VM ID
    if (vmId >= 8000 && vmId < 8100) {
      // Master nodes: 10.0.0.200+
      return `${baseIP}.${200 + (vmId - 8000)}`;
    } else if (vmId >= 8100 && vmId < 8200) {
      // Worker nodes: 10.0.0.201+ (after masters)
      const masterCount = config.kubernetes.masterNodes;
      return `${baseIP}.${200 + masterCount + (vmId - 8100)}`;
    } else {
      // Fallback
      return `${baseIP}.${vmId - 7800}`;
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
   * Check if all VMs are ready for Talos configuration
   */
  public allVMsReady(): pulumi.Output<boolean> {
    return this.ready;
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
                echo "Monitoring transition for VM ${vm.vmId}: ${vm.dhcpIP} → ${vm.staticIP}"

                # Wait for static IP to become available
                for i in $(seq 1 ${timeout}); do
                  if nc -z -w 2 "${vm.staticIP}" 50000 2>/dev/null; then
                    echo "✅ VM ${vm.vmId} transitioned to static IP ${vm.staticIP}"
                    break
                  fi
                  sleep 1
                done
              `;
            })
            .filter(Boolean)
            .join('\n');

          return `
            #!/bin/bash
            echo "Starting network transition monitoring..."
            ${vmChecks}
            echo "Network transition monitoring complete"
          `;
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
