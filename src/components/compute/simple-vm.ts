/**
 * Simplified VM Component using Native Providers
 * 
 * Replaces complex VM component with streamlined native provider usage
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { NodeConfig, VMOutput } from '../../types';
import { TalosImageComponent } from '../talos/talos-image';
import { NetworkUtils } from '../network/simple-network';
import { logger } from '../../utils/logger';

/**
 * Simplified VM component properties
 */
export interface SimpleVMProps {
  /** Node configuration */
  nodeConfig: NodeConfig;
  
  /** Proxmox provider */
  proxmoxProvider: proxmoxve.Provider;
  
  /** Target Proxmox node */
  proxmoxNode: string;
  
  /** Talos image to clone from */
  talosImage: TalosImageComponent;
  
  /** VM ID (optional, auto-generated if not provided) */
  vmId?: number;
}

/**
 * Simplified VM Component
 */
export class SimpleVMComponent extends pulumi.ComponentResource {
  public readonly vm: proxmoxve.vm.VirtualMachine;
  public readonly vmOutput: pulumi.Output<VMOutput>;

  constructor(
    name: string,
    props: SimpleVMProps,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:compute:SimpleVM', name, {}, opts);

    const { nodeConfig, proxmoxProvider, proxmoxNode } = props;

    logger.info(`Creating VM: ${nodeConfig.name}`, {
      role: nodeConfig.role,
      cores: nodeConfig.specs.cores,
      memory: nodeConfig.specs.memory,
      node: proxmoxNode,
    });

    // Generate VM ID if not provided
    const vmId = props.vmId || this.generateVMId(nodeConfig.name);

    // Create network devices from network configuration
    const networkDevices = nodeConfig.specs.network.map((netInterface) => 
      NetworkUtils.createDevice(netInterface.bridge, {
        vlan: netInterface.vlan,
        macAddress: netInterface.mac,
      })
    );

    // Create VM using native provider
    this.vm = new proxmoxve.vm.VirtualMachine(
      `${name}-vm`,
      {
        // Basic VM configuration
        nodeName: proxmoxNode,
        vmId: vmId,
        name: nodeConfig.name,
        description: `VM ${nodeConfig.name} (${nodeConfig.role})`,

        // Clone from Talos image
        clone: {
          vmId: 9000, // Template ID (will be managed by separate template creation)
          full: true, // Full clone for isolation
        },

        // Resource configuration
        cpu: {
          cores: nodeConfig.specs.cores,
          sockets: 1,
          type: 'host',
        },
        
        memory: {
          dedicated: nodeConfig.specs.memory,
        },

        // Disk configuration
        disks: nodeConfig.specs.disk.map((disk, index) => ({
          interface: `scsi${index}`,
          datastoreId: 'local-lvm',
          size: parseInt(disk.size.replace(/[^0-9]/g, '')),
          fileFormat: disk.format,
        })),

        // Network configuration
        networkDevices: networkDevices,

        // Basic VM settings
        onBoot: false,
        started: true,
        protection: false,

        // Operating system
        operatingSystem: {
          type: 'l26', // Linux 2.6+
        },

        // QEMU guest agent
        agent: {
          enabled: true,
          trim: true,
          type: 'virtio',
        },
      },
      {
        provider: proxmoxProvider,
        parent: this,
      }
    );

    // Create simplified VM output
    this.vmOutput = pulumi.output({
      id: vmId.toString(),
      name: nodeConfig.name,
      ipAddress: '192.168.1.100', // Placeholder IP
      macAddress: networkDevices[0]?.macAddress || '00:00:00:00:00:00',
      status: 'running' as const,
      node: proxmoxNode,
      template: 'talos-image',
      specs: nodeConfig.specs,
      // uptime will be undefined initially
      cloneSource: {
        templateId: 9000,
        templateName: 'talos-template',
        cloneType: 'full' as const,
      },
      networkDetails: {
        interfaces: networkDevices.map((device, index) => {
          const result: any = {
            name: `eth${index}`,
            mac: device.macAddress || NetworkUtils.generateMac(),
            bridge: device.bridge,
          };
          if (device.vlanId !== undefined) result.vlan = device.vlanId;
          if (nodeConfig.specs.network[index]?.ip) result.ip = nodeConfig.specs.network[index].ip;
          if (nodeConfig.specs.network[index]?.gateway) result.gateway = nodeConfig.specs.network[index].gateway;
          return result;
        }),
      },
      cloudInitStatus: {
        ready: false,
        userData: false,
        networkConfig: false,
      },
      // resources will be populated once VM is running
    });

    logger.debug(`VM created successfully: ${nodeConfig.name}`, {
      vmId,
      networkDevices: networkDevices.length,
    });

    this.registerOutputs({
      vm: this.vm,
      vmOutput: this.vmOutput,
    });
  }

  /**
   * Simple VM ID generation
   */
  private generateVMId(nodeName: string): number {
    // Simple hash-based ID generation
    let hash = 0;
    for (let i = 0; i < nodeName.length; i++) {
      const char = nodeName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Ensure positive and within valid range (100-999)
    const vmId = 100 + (Math.abs(hash) % 900);
    
    logger.debug(`Generated VM ID: ${vmId} for node: ${nodeName}`);
    return vmId;
  }
}

/**
 * Utility function to create a simple VM
 */
export function createSimpleVM(
  name: string,
  props: SimpleVMProps,
  opts?: pulumi.ComponentResourceOptions
): SimpleVMComponent {
  return new SimpleVMComponent(name, props, opts);
}