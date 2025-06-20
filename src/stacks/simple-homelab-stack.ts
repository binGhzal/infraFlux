/**
 * Simplified HomeLabStack using Native Providers
 * 
 * Replaces complex stack orchestration with direct provider usage
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { GlobalConfig, VMOutput, ClusterOutput } from '../types';
import { createTalosImage } from '../components/talos/talos-image';
import { createSimpleVM } from '../components/compute/simple-vm';
import { createSimpleTalosCluster } from '../components/kubernetes/simple-talos-cluster';
// Removed unused NetworkUtils import
import { logger } from '../utils/logger';

export interface SimpleHomeLabStackProps {
  config: GlobalConfig;
  stack: string;
}

export class SimpleHomeLabStack extends pulumi.ComponentResource {
  public readonly proxmoxProvider: proxmoxve.Provider;
  public readonly talosImage: ReturnType<typeof createTalosImage>;
  public readonly vms: ReturnType<typeof createSimpleVM>[];
  public readonly cluster: ReturnType<typeof createSimpleTalosCluster>;
  public readonly outputs: pulumi.Output<{
    clusterName: string;
    clusterEndpoint: string;
    kubeconfig: string;
    nodeIPs: string[];
    proxmoxNode: string;
  }>;

  constructor(
    name: string,
    props: SimpleHomeLabStackProps,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:homelab:SimpleStack', name, {}, opts);

    const { config } = props;

    logger.info(`Creating simplified HomeLabStack: ${name}`, {
      environment: config.project.environment,
      nodeCount: config.cluster.nodes.length,
      proxmoxNode: config.proxmox.node,
    });

    // Create Proxmox provider
    this.proxmoxProvider = new proxmoxve.Provider(
      'proxmox',
      {
        endpoint: config.proxmox.endpoint,
        username: config.proxmox.apiToken.id,
        apiToken: config.proxmox.apiToken.secret,
        insecure: !config.proxmox.ssl.verify,
      },
      { parent: this }
    );

    // Create Talos image using native provider
    this.talosImage = createTalosImage(
      'talos',
      {
        version: config.cluster.version,
        extensions: [
          'siderolabs/qemu-guest-agent',
          'siderolabs/intel-ucode',
        ],
        proxmoxProvider: this.proxmoxProvider,
        nodeName: config.proxmox.node,
        datastore: config.proxmox.datastore,
      },
      { parent: this }
    );

    // Create VMs using simplified component
    this.vms = config.cluster.nodes.map((nodeConfig, index) => {
      logger.debug(`Creating VM: ${nodeConfig.name}`, {
        role: nodeConfig.role,
        index,
      });

      return createSimpleVM(
        nodeConfig.name,
        {
          nodeConfig,
          proxmoxProvider: this.proxmoxProvider,
          proxmoxNode: config.proxmox.node,
          talosTemplate: this.talosImage.template,
          projectConfig: config.project,
          vmId: 100 + index, // Simple ID assignment
        },
        { parent: this }
      );
    });

    // Extract node IPs (placeholder for now, would be populated by DHCP/cloud-init)
    const nodeIPs = this.vms.map((_, index) => `192.168.1.${100 + index}`);
    const controlPlaneIPs = nodeIPs.filter((_, index) => 
      config.cluster.nodes[index]?.role === 'control-plane'
    );
    const workerIPs = nodeIPs.filter((_, index) => 
      config.cluster.nodes[index]?.role === 'worker'
    );

    // Create cluster using simplified Talos component
    const clusterEndpoint = controlPlaneIPs[0] || nodeIPs[0];
    this.cluster = createSimpleTalosCluster(
      'cluster',
      {
        clusterConfig: config.cluster,
        controlPlaneIPs,
        workerIPs,
        endpoint: `https://${clusterEndpoint}:6443`,
      },
      { parent: this }
    );

    // Create outputs
    this.outputs = pulumi.all([
      this.cluster.clusterOutput,
      this.cluster.kubeconfig.kubeconfigRaw,
    ]).apply(([clusterOutput, kubeconfig]) => ({
      clusterName: config.cluster.name,
      clusterEndpoint: clusterOutput.endpoint,
      kubeconfig: kubeconfig || '',
      nodeIPs: nodeIPs,
      proxmoxNode: config.proxmox.node,
    }));

    logger.info(`SimpleHomeLabStack created successfully`, {
      vmCount: this.vms.length,
      controlPlaneNodes: controlPlaneIPs.length,
      workerNodes: workerIPs.length,
    });

    this.registerOutputs({
      proxmoxProvider: this.proxmoxProvider,
      talosImage: this.talosImage,
      vms: this.vms,
      cluster: this.cluster,
      outputs: this.outputs,
    });
  }

  /**
   * Get all VM outputs
   */
  getVMOutputs(): pulumi.Output<VMOutput[]> {
    return pulumi.all(this.vms.map(vm => vm.vmOutput));
  }

  /**
   * Get cluster output
   */
  getClusterOutput(): pulumi.Output<ClusterOutput> {
    return this.cluster.clusterOutput;
  }
}

/**
 * Utility function to create a simple homelab stack
 */
export function createSimpleHomeLabStack(
  name: string,
  props: SimpleHomeLabStackProps,
  opts?: pulumi.ComponentResourceOptions
): SimpleHomeLabStack {
  return new SimpleHomeLabStack(name, props, opts);
}