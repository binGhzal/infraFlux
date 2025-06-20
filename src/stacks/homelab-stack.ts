/**
 * Main HomeLabStack component - orchestrates all infrastructure components
 */

import * as pulumi from '@pulumi/pulumi';
import { StackConfig, GlobalConfig, VMOutput, ClusterOutput } from '../types';
import { logger } from '../utils/logger';

export interface HomeLabStackProps {
  config: GlobalConfig;
  stack: string;
}

export class HomeLabStack extends pulumi.ComponentResource {
  public readonly cluster: ClusterOutput;
  public readonly nodes: VMOutput[];
  public readonly proxmoxNode: string;

  constructor(name: string, props: HomeLabStackProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:homelab:Stack', name, {}, opts);

    const { config } = props;
    
    logger.info(`Creating HomeLabStack: ${name}`, {
      environment: config.project.environment,
      nodeCount: config.cluster.nodes.length,
    });

    // TODO: Implement modular components
    // - NetworkComponent for network setup
    // - StorageComponent for storage configuration  
    // - VMTemplateComponent for VM template management
    // - VMComponent for individual VMs
    // - TalosClusterComponent for Kubernetes cluster
    // - GitOpsComponent for FluxCD setup

    // Placeholder implementations
    this.proxmoxNode = config.proxmox.node;
    this.nodes = [];
    this.cluster = {
      name: config.cluster.name,
      endpoint: '',
      version: config.cluster.version,
      nodes: [],
      kubeconfig: '',
      status: 'pending',
      components: [],
    };

    this.registerOutputs({
      cluster: this.cluster,
      nodes: this.nodes,
      proxmoxNode: this.proxmoxNode,
    });
  }
}