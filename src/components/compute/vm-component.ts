/**
 * VM Component - manages individual virtual machine
 */

import * as pulumi from '@pulumi/pulumi';
import { NodeConfig, VMOutput } from '../../types';
import { logger } from '../../utils/logger';

export interface VMComponentProps {
  nodeConfig: NodeConfig;
  proxmoxNode: string;
  networkBridge: string;
  template: string;
}

export class VMComponent extends pulumi.ComponentResource {
  public readonly vm: VMOutput;
  public readonly ipAddress: pulumi.Output<string>;

  constructor(name: string, props: VMComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:compute:VM', name, {}, opts);

    const { nodeConfig, proxmoxNode, networkBridge, template } = props;
    
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