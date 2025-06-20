/**
 * InfraFlux v2.0 - Talos-Exclusive Infrastructure Automation
 *
 * Deploys Talos Linux Kubernetes clusters on Proxmox with GitOps.
 * Uses custom Talos Image Factory with qemu-guest-agent and cloudflared.
 */

// Register TypeScript path mappings for runtime resolution
import 'tsconfig-paths/register';

import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { config, gitOpsConfig } from './config';
import { TalosTemplate, TalosCluster, GitOps } from './components';
import { logger, logResource } from './utils/logger';

// Log startup
logger.info('Starting InfraFlux v2.0 - Talos-Exclusive Infrastructure', {
  environment: config.environment,
  proxmoxEndpoint: config.proxmox.endpoint,
  proxmoxNode: config.proxmox.node,
  distribution: 'talos-factory-custom',
  talosVersion: config.kubernetes.version,
});

// Create Proxmox provider
const proxmoxProvider = new proxmox.Provider('proxmox', {
  endpoint: config.proxmox.endpoint,
  username: config.proxmox.username,
  password: config.proxmox.password,
  insecure: config.proxmox.insecure,
});

// Step 1: Create Custom Talos OS Template from Image Factory
logger.info('Creating custom Talos OS template from Image Factory...');

const talosTemplate = TalosTemplate.create(proxmoxProvider);

// Step 2: Deploy Talos Kubernetes Cluster (if configured)
let cluster: TalosCluster | undefined;
let gitops: GitOps | undefined;

if (config.kubernetes.masterNodes > 0) {
  logger.info('Deploying Talos Kubernetes cluster with custom image...');

  cluster = new TalosCluster(
    'homelab-k8s',
    {
      provider: proxmoxProvider,
      talosTemplate, // Pass the template with custom installer
      startingIP: 200, // Start IPs at 192.168.1.200+
    },
    {
      dependsOn: [talosTemplate],
    }
  );

  // Step 3: Setup GitOps (if enabled and configured)
  if (gitOpsConfig.enabled && gitOpsConfig.repoUrl) {
    logger.info('Setting up GitOps with FluxCD...');

    gitops = new GitOps(
      'homelab-gitops',
      {
        kubeconfig: cluster.output.kubeconfig,
        clusterName: 'homelab-k8s', // Use string instead of Output
      },
      {
        dependsOn: [cluster],
      }
    );
  }
}

// Export template information
export const templates = {
  talos: {
    id: talosTemplate.templateId,
    ready: talosTemplate.ready,
    schematic: talosTemplate.schematic,
    installerImage: talosTemplate.installerImage,
    version: config.kubernetes.version,
  },
};

// Export cluster information (if created)
export const kubernetes = cluster
  ? {
      cluster: cluster.output,
      talosConfig: cluster.talosConfig,
      gitopsReady: gitops?.ready,
    }
  : undefined;

// Create status output
export const status = pulumi
  .all([talosTemplate.ready, cluster?.output.name, gitops?.ready])
  .apply((values: [boolean, string | undefined, boolean | undefined]) => {
    const [talosReady, clusterName, gitopsReady] = values;
    const statuses = [];

    // Template status
    if (talosReady) {
      statuses.push('✅ Custom Talos OS template created from Image Factory');
    } else {
      statuses.push('⏳ Creating custom Talos OS template...');
    }

    // Cluster status
    if (cluster) {
      if (clusterName) {
        statuses.push(`✅ Talos Kubernetes cluster "${clusterName}" deployed`);
      } else {
        statuses.push('⏳ Deploying Talos Kubernetes cluster...');
      }
    }

    // GitOps status
    if (gitops) {
      if (gitopsReady) {
        statuses.push('✅ GitOps with FluxCD configured');
      } else {
        statuses.push('⏳ Setting up GitOps...');
      }
    }

    return statuses.join('\n');
  });

// Create detailed instructions
export const instructions = pulumi
  .all([talosTemplate.ready, cluster?.output.apiEndpoint, gitops?.ready])
  .apply((values: [boolean, string | undefined, boolean | undefined]) => {
    const [talosReady, apiEndpoint, gitopsReady] = values;
    let instructions = `
=== InfraFlux v2.0 - Custom Talos Factory Deployment Complete ===

✅ Infrastructure Status:
`;

    if (talosReady) {
      instructions += `  • Custom Talos template: Ready with qemu-guest-agent + cloudflared\n`;
      instructions += `  • Schematic: ${talosTemplate.schematic}\n`;
      instructions += `  • Version: ${config.kubernetes.version}\n`;
    }

    if (apiEndpoint) {
      instructions += `  • Kubernetes cluster: ${apiEndpoint}\n`;
      instructions += `  • Distribution: Talos Linux with Cilium CNI\n`;
      instructions += `  • Nodes: ${config.kubernetes.masterNodes} masters, ${config.kubernetes.workerNodes} workers\n`;
      instructions += `  • Extensions: QEMU Guest Agent, CloudFlare Tunnel ready\n`;
    }

    if (gitopsReady) {
      instructions += `  • GitOps: FluxCD monitoring ${gitOpsConfig.repoUrl}\n`;
    }

    instructions += `
🚀 Next Steps:

`;

    if (apiEndpoint) {
      const nodeIP = apiEndpoint.replace('https://', '').replace(':6443', '');
      instructions += `1. Access your cluster:
   talosctl --talosconfig <talos-config> --nodes ${nodeIP} version
   kubectl --kubeconfig <generated-kubeconfig> get nodes

2. Use included extensions:
   - QEMU Guest Agent: Automatic IP detection in Proxmox
   - CloudFlare Tunnel: Ready for secure external access

3. Deploy applications via GitOps:
   - Push manifests to: ${gitOpsConfig.repoUrl}/${gitOpsConfig.path}/apps/
   - FluxCD will automatically deploy them

4. Access services:
   - Monitoring: Deploy via GitOps or directly with kubectl
   - All services accessible via LoadBalancer or Ingress

`;
    } else {
      instructions += `1. Your custom Talos template is ready for VM provisioning
2. To deploy Kubernetes, set K8S_MASTER_COUNT > 0 in your .env
3. Run 'pulumi up' again to deploy the cluster

`;
    }

    instructions += `
📊 Management:
- All resources are tagged as 'infraflux-managed'
- Custom factory image with optimizations for Proxmox
- Safe VM ID ranges: 8000+ (Talos cluster), 9010+ (Talos template)
- Extensions: qemu-guest-agent, cloudflared

🏭 Image Factory Details:
- Schematic: ${talosTemplate.schematic}
- Source: factory.talos.dev with custom extensions
- Perfect integration with Proxmox cloud-init
- CloudFlare tunnel ready for secure external access
`;

    return instructions;
  });

// Log completion status
pulumi
  .all([talosTemplate.ready, cluster?.output.name])
  .apply((values: [boolean, string | undefined]) => {
    const [talosReady, clusterName] = values;
    logResource('InfraFlux', 'Status', {
      talosTemplate: talosReady ? 'Ready (Custom Factory)' : 'Creating',
      kubernetesCluster: clusterName ?? 'Not deployed',
      environment: config.environment,
      customExtensions: ['qemu-guest-agent', 'cloudflared'],
    });
  });
