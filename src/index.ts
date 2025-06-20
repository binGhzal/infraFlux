import * as pulumi from '@pulumi/pulumi';
import { HomeLabStack } from './stacks/homelab-stack';
import { validateConfig } from './config/validation';
import { logger } from './utils/logger';

/**
 * Main entry point for InfraFlux v2.0 Pulumi program
 *
 * This program creates a complete homelab infrastructure on Proxmox
 * including VM templates, virtual machines, and Kubernetes cluster.
 */
async function main(): Promise<void> {
  try {
    // Get current stack configuration
    const stack = pulumi.getStack();
    const config = new pulumi.Config();

    logger.info(`Deploying InfraFlux v2.0 to stack: ${stack}`);

    // Validate configuration
    const validatedConfig = await validateConfig(config);

    // Create the homelab stack
    const homelab = new HomeLabStack('homelab', {
      config: validatedConfig,
      stack,
    });

    // Export important outputs
    const outputs = {
      clusterName: homelab.cluster.name,
      clusterEndpoint: homelab.cluster.endpoint,
      clusterKubeconfig: homelab.cluster.kubeconfig,
      nodeIPs: homelab.nodes.map(node => node.ipAddress),
      proxmoxNode: homelab.proxmoxNode,
      deploymentTime: new Date().toISOString(),
    };
    
    return outputs;

  } catch (error) {
    logger.error('Failed to deploy infrastructure:', error);
    throw error;
  }
}

// Export the main function result
export = main();
