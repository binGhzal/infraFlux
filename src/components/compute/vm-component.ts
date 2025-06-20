/**
 * VM Component for InfraFlux v2.0
 * 
 * Manages individual virtual machine provisioning from templates
 * with full support for resource configuration, networking, and cloud-init
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { NodeConfig, VMOutput, ComponentProps } from '../../types';
import { VMTemplateComponent } from '../storage/vm-template';
import { NetworkComponent } from '../network/network-component';
import { logger } from '../../utils/logger';

/**
 * VM component properties
 */
export interface VMComponentProps extends ComponentProps {
  /** Node configuration from cluster definition */
  nodeConfig: NodeConfig;
  
  /** Proxmox provider instance */
  proxmoxProvider: proxmoxve.Provider;
  
  /** Target Proxmox node for VM placement */
  proxmoxNode: string;
  
  /** VM template to clone from */
  template: VMTemplateComponent | string;
  
  /** Network component for IP allocation */
  networkComponent?: NetworkComponent;
  
  /** Cloud-init configuration */
  cloudInit?: CloudInitConfig;
  
  /** VM lifecycle options */
  lifecycle?: VMLifecycleOptions;
  
  /** Clone options */
  cloneOptions?: CloneOptions;
}

/**
 * Cloud-init configuration for VM initialization
 */
export interface CloudInitConfig {
  /** User data (cloud-config format) */
  userData?: string;
  
  /** Network configuration */
  networkConfig?: string;
  
  /** SSH public keys for default user */
  sshKeys?: string[];
  
  /** Default user configuration */
  user?: {
    name: string;
    password?: string;
    sudo?: boolean;
  };
  
  /** Packages to install on first boot */
  packages?: string[];
  
  /** Commands to run on first boot */
  runCmd?: string[];
  
  /** Files to write on first boot */
  writeFiles?: Array<{
    path: string;
    content: string;
    permissions?: string;
    owner?: string;
  }>;
}

/**
 * VM lifecycle management options
 */
export interface VMLifecycleOptions {
  /** Start VM on Proxmox node boot */
  onBoot?: boolean;
  
  /** Start VM after creation */
  startAfterCreate?: boolean;
  
  /** Protection from accidental deletion */
  protection?: boolean;
  
  /** VM startup order and delays */
  startup?: {
    order?: number;
    up?: number;
    down?: number;
  };
}

/**
 * Clone configuration options
 */
export interface CloneOptions {
  /** Full clone (true) or linked clone (false) */
  full?: boolean;
  
  /** Target storage for clone */
  targetStorage?: string;
  
  /** Clone description */
  description?: string;
}

/**
 * Enhanced VM output with additional details
 */
export interface VMOutputExtended extends VMOutput {
  /** Clone source information */
  cloneSource?: {
    templateId: number;
    templateName: string;
    cloneType: 'full' | 'linked';
  };
  
  /** Network configuration details */
  networkDetails?: {
    interfaces: Array<{
      name: string;
      mac: string;
      bridge: string;
      vlan?: number;
      ip?: string;
      gateway?: string;
    }>;
  };
  
  /** Cloud-init status */
  cloudInitStatus?: {
    ready: boolean;
    userData: boolean;
    networkConfig: boolean;
  };
  
  /** Resource utilization */
  resources?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };
}

export class VMComponent extends pulumi.ComponentResource {
  public readonly vm: VMOutput;
  public readonly ipAddress: pulumi.Output<string>;

  constructor(name: string, props: VMComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:compute:VM', name, {}, opts);

    const { nodeConfig, proxmoxNode, template } = props;
    // networkBridge will be used when implementing network configuration
    
    logger.info(`Creating VM: ${nodeConfig.name}`, {
      role: nodeConfig.role,
      cores: nodeConfig.specs.cores,
      memory: nodeConfig.specs.memory,
    });

    // TODO: Implement VM creation
    // - Create VM from template
    // - Configure specifications
    // - Set up cloud-init
    // - Configure network interfaces
    // - Apply node labels and taints

    // Placeholder VM output
    this.vm = {
      id: `vm-${nodeConfig.name}`,
      name: nodeConfig.name,
      status: 'running',
      node: proxmoxNode,
      template,
      specs: nodeConfig.specs,
      macAddress: '00:00:00:00:00:00', // Will be generated
    };

    this.ipAddress = pulumi.output('192.168.1.100'); // Will be assigned by DHCP/static

    this.registerOutputs({
      vm: this.vm,
      ipAddress: this.ipAddress,
    });
  }
}