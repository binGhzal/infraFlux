import * as pulumi from '@pulumi/pulumi';
import { createSimpleHomeLabStack } from './stacks/simple-homelab-stack';
import { validateConfig } from './config/validation';
import { logger } from './utils/logger';

/**
 * Simplified InfraFlux v2.0 Pulumi program
 *
 * Creates a streamlined homelab infrastructure using native providers
 */

// Get current stack configuration
const stack = pulumi.getStack();
const config = new pulumi.Config();

logger.info(`Deploying simplified InfraFlux v2.0 to stack: ${stack}`);

// Validate configuration and create infrastructure
const homelab = pulumi.output(validateConfig(config)).apply(validatedConfig => {
  return createSimpleHomeLabStack('homelab', {
    config: validatedConfig,
    stack,
  });
});

// Export outputs
export const clusterName = homelab.apply(h => h.outputs).apply(o => o.clusterName);
export const clusterEndpoint = homelab.apply(h => h.outputs).apply(o => o.clusterEndpoint);
export const kubeconfig = homelab.apply(h => h.outputs).apply(o => o.kubeconfig);
export const nodeIPs = homelab.apply(h => h.outputs).apply(o => o.nodeIPs);
export const proxmoxNode = homelab.apply(h => h.outputs).apply(o => o.proxmoxNode);
export const deploymentTime = new Date().toISOString();
