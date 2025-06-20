/**
 * InfraFlux v2.0 - Talos-Exclusive Infrastructure Automation
 *
 * Deploys Talos Linux Kubernetes clusters on Proxmox with GitOps.
 * Uses custom Talos Image Factory with qemu-guest-agent and cloudflared.
 *
 * Flow: ISO Check/Download → Template Creation → VM Cloning → Cluster Bootstrap
 */

// Register TypeScript path mappings for runtime resolution
import 'tsconfig-paths/register';

import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { config, gitOpsConfig } from './config';
import { TalosTemplateManager, TalosCluster, GitOps } from './components';
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

// Step 1: Create Custom Talos Templates from Image Factory
// This manages: ISO download → master template → worker template
logger.info('Creating custom Talos templates from Image Factory...');
logger.info('Template creation includes ISO attachment for proper VM cloning');

const templateManager = new TalosTemplateManager('talos-templates', {
  provider: proxmoxProvider,
  forceDownload: config.vm.forceDownload,
});

// Step 2: Deploy Talos Kubernetes Cluster (if configured)
// This manages: VM cloning → Talos config → cluster bootstrap
let cluster: TalosCluster | undefined;
let gitops: GitOps | undefined;

if (config.kubernetes.masterNodes > 0) {
  logger.info('Deploying Talos Kubernetes cluster from templates...');

  cluster = new TalosCluster(
    'homelab-k8s',
    {
      provider: proxmoxProvider,
      templateManager, // Pass the template manager
      startingIP: 200, // Start IPs at 192.168.1.200+
    },
    {
      dependsOn: [templateManager], // Wait for templates to be ready
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
  iso: {
    ready: templateManager.iso.ready,
    fileName: templateManager.iso.fileName,
    schematic: templateManager.iso.schematic,
    installerImage: templateManager.iso.installerImage,
  },
  master: {
    id: templateManager.masterTemplate.templateId,
    ready: templateManager.masterTemplate.ready,
    type: templateManager.masterTemplate.templateType,
  },
  worker: {
    id: templateManager.workerTemplate.templateId,
    ready: templateManager.workerTemplate.ready,
    type: templateManager.workerTemplate.templateType,
  },
  version: config.kubernetes.version,
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
  .all([templateManager.ready, cluster?.output.name, gitops?.ready])
  .apply((values: [boolean, string | undefined, boolean | undefined]) => {
    const [templatesReady, clusterName, gitopsReady] = values;
    const statuses = [];

    // Template status
    if (templatesReady) {
      statuses.push('✅ Custom Talos templates created from Image Factory');
      statuses.push('   📁 ISO downloaded and ready');
      statuses.push('   🏗️ Master template (ID: 9010) ready');
      statuses.push('   👷 Worker template (ID: 9011) ready');
    } else {
      statuses.push('⏳ Creating custom Talos templates from Image Factory...');
      statuses.push('   📥 Downloading custom ISO with extensions');
      statuses.push('   🔨 Creating master and worker templates');
    }

    // Cluster status
    if (cluster) {
      if (clusterName) {
        statuses.push(`✅ Talos Kubernetes cluster "${clusterName}" deployed`);
        statuses.push('   🖥️ VMs cloned from templates and running');
        statuses.push('   ⚙️ Talos configuration applied');
        statuses.push('   🚀 Cluster bootstrapped and ready');
      } else {
        statuses.push('⏳ Deploying Talos Kubernetes cluster...');
        statuses.push('   📋 Cloning VMs from templates');
        statuses.push('   ⚙️ Applying Talos configurations');
        statuses.push('   🔗 Bootstrapping cluster');
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
  .all([templateManager.ready, cluster?.output.apiEndpoint, gitops?.ready])
  .apply((values: [boolean, string | undefined, boolean | undefined]) => {
    const [templatesReady, apiEndpoint, gitopsReady] = values;
    let instructions = `
=== InfraFlux v2.0 - Custom Talos Factory Deployment ===

✅ Infrastructure Status:
`;

    if (templatesReady) {
      instructions += `  • Custom Talos ISO: ${templateManager.iso.fileName}\n`;
      instructions += `  • Schematic: ${templateManager.iso.schematic}\n`;
      instructions += `  • Version: ${config.kubernetes.version}\n`;
      instructions += `  • Master Template: ID 9010 (optimized for control plane)\n`;
      instructions += `  • Worker Template: ID 9011 (optimized for workloads)\n`;
      instructions += `  • Extensions: QEMU Guest Agent + CloudFlare Tunnel\n`;
    }

    if (apiEndpoint) {
      instructions += `  • Kubernetes cluster: ${apiEndpoint}\n`;
      instructions += `  • Distribution: Talos Linux with Cilium CNI\n`;
      instructions += `  • Nodes: ${config.kubernetes.masterNodes} masters, ${config.kubernetes.workerNodes} workers\n`;
      instructions += `  • VM Creation: Cloned from custom templates\n`;
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

2. Template system benefits:
   - Faster VM provisioning (clone vs install)
   - Consistent base images with custom extensions
   - ISO attached to templates for automatic Talos installation
   - Separate optimization for masters vs workers
   - Easy scaling by cloning worker template

3. Deploy applications via GitOps:
   - Push manifests to: ${gitOpsConfig.repoUrl}/${gitOpsConfig.path}/apps/
   - FluxCD will automatically deploy them

4. Use included extensions:
   - QEMU Guest Agent: Automatic IP detection in Proxmox
   - CloudFlare Tunnel: Ready for secure external access

`;
    } else {
      instructions += `1. Your custom Talos templates are being created
2. Templates will be ready for fast VM cloning
3. To deploy Kubernetes, ensure K8S_MASTER_COUNT > 0 in .env
4. Run 'pulumi up' to complete the deployment

`;
    }

    instructions += `
📊 Template Management:
- Master Template: Optimized for control plane (${config.kubernetes.masterSpecs?.cores} cores, ${config.kubernetes.masterSpecs?.memory}MB RAM)
- Worker Template: Optimized for workloads (${config.kubernetes.workerSpecs?.cores} cores, ${config.kubernetes.workerSpecs?.memory}MB RAM)
- VM ID Ranges: 8000+ (masters), 8100+ (workers), 9010+ (templates)
- Storage: ISOs on ${config.vm.defaults.isoStoragePool}, VMs on ${config.vm.defaults.storagePool}
- All resources tagged as 'infraflux-managed'

🏭 Image Factory Details:
- Schematic: ${templateManager.iso.schematic}
- Source: factory.talos.dev with custom extensions
- Extensions: qemu-guest-agent, cloudflared
- Template-based deployment for faster provisioning
`;

    return instructions;
  });

// Log completion status
pulumi
  .all([templateManager.ready, cluster?.output.name])
  .apply((values: [boolean, string | undefined]) => {
    const [templatesReady, clusterName] = values;
    logResource('InfraFlux', 'Status', {
      talosTemplates: templatesReady ? 'Ready (Master + Worker)' : 'Creating',
      kubernetesCluster: clusterName ?? 'Not deployed',
      environment: config.environment,
      deploymentFlow: 'ISO → Templates → VMs → Cluster',
      customExtensions: ['qemu-guest-agent', 'cloudflared'],
    });
  });
