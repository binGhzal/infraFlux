/**
 * Network Component - manages network infrastructure
 */

import * as pulumi from '@pulumi/pulumi';
import { NetworkConfig } from '../../types';
import { logger } from '../../utils/logger';

export interface NetworkComponentProps {
  config: NetworkConfig;
  proxmoxNode: string;
}

export class NetworkComponent extends pulumi.ComponentResource {
  public readonly bridgeName: string;
  public readonly vlanIds: number[];

  constructor(name: string, props: NetworkComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:network:Network', name, {}, opts);

    const { config, proxmoxNode } = props;
    
    logger.info(`Creating network infrastructure on node: ${proxmoxNode}`);

    // TODO: Implement network setup
    // - Configure VLANs
    // - Set up bridges
    // - Configure firewall rules
    // - Set up DHCP if enabled

    this.bridgeName = 'vmbr0'; // Default bridge
    this.vlanIds = config.vlans.map(vlan => vlan.id);

    this.registerOutputs({
      bridgeName: this.bridgeName,
      vlanIds: this.vlanIds,
    });
  }
}