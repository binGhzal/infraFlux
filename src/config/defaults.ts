/**
 * Default configurations for different environments
 */

import { GlobalConfig, NodeConfig } from '../types';

/**
 * Development environment defaults
 */
export const devDefaults: Partial<GlobalConfig> = {
  project: {
    name: 'infraflux-dev',
    version: '2.0.0',
    description: 'InfraFlux v2.0 Development Environment',
    environment: 'dev',
    region: 'homelab',
    tags: {
      environment: 'dev',
      project: 'infraflux-v2',
      managedBy: 'pulumi',
    },
  },
  cluster: {
    name: 'homelab-dev',
    version: 'v1.28.0',
    distribution: 'talos',
    networking: {
      podSubnet: '10.244.0.0/16',
      serviceSubnet: '10.96.0.0/12',
      clusterDomain: 'cluster.local',
      cni: 'cilium',
      networkPolicies: true,
    },
    nodes: [
      {
        name: 'control-1',
        role: 'control-plane',
        template: 'talos-v1.6.0',
        specs: {
          cores: 2,
          memory: 4096,
          disk: [{
            size: '30G',
            format: 'qcow2' as const,
            cache: 'none' as const,
            backup: true,
            replicate: false,
          }],
          network: [{
            bridge: 'vmbr0',
            dhcp: true,
          }],
        },
      },
      {
        name: 'worker-1',
        role: 'worker',
        template: 'talos-v1.6.0',
        specs: {
          cores: 4,
          memory: 8192,
          disk: [{
            size: '50G',
            format: 'qcow2' as const,
            cache: 'none' as const,
            backup: true,
            replicate: false,
          }],
          network: [{
            bridge: 'vmbr0',
            dhcp: true,
          }],
        },
      },
    ],
    features: {
      monitoring: true,
      logging: true,
      backups: false, // Disabled in dev
      gitops: true,
      secretManagement: true,
      ingress: true,
      storageClass: true,
    },
  },
  network: {
    domain: 'dev.homelab.local',
    dns: {
      servers: ['1.1.1.1', '8.8.8.8'],
      searchDomains: ['dev.homelab.local'],
    },
    vlans: [],
    bridges: [],
    firewall: {
      enabled: false, // Disabled in dev for easier debugging
      defaultPolicy: 'ACCEPT',
      rules: [],
    },
  },
};

/**
 * Production environment defaults
 */
export const prodDefaults: Partial<GlobalConfig> = {
  project: {
    name: 'infraflux-prod',
    version: '2.0.0',
    description: 'InfraFlux v2.0 Production Environment',
    environment: 'prod',
    region: 'homelab',
    tags: {
      environment: 'prod',
      project: 'infraflux-v2',
      managedBy: 'pulumi',
    },
  },
  cluster: {
    name: 'homelab-prod',
    version: 'v1.28.0',
    distribution: 'talos',
    networking: {
      podSubnet: '10.244.0.0/16',
      serviceSubnet: '10.96.0.0/12',
      clusterDomain: 'cluster.local',
      cni: 'cilium',
      networkPolicies: true,
    },
    nodes: [
      // Three control plane nodes for HA
      ...Array.from({ length: 3 }, (_, i) => ({
        name: `control-${i + 1}`,
        role: 'control-plane' as const,
        template: 'talos-v1.6.0',
        specs: {
          cores: 4,
          memory: 8192,
          disk: [{
            size: '100G',
            format: 'qcow2' as const,
            cache: 'none' as const,
            backup: true,
            replicate: true,
          }],
          network: [{
            bridge: 'vmbr0',
            dhcp: true,
          }],
        },
      })),
      // Three worker nodes
      ...Array.from({ length: 3 }, (_, i) => ({
        name: `worker-${i + 1}`,
        role: 'worker' as const,
        template: 'talos-v1.6.0',
        specs: {
          cores: 8,
          memory: 16384,
          disk: [{
            size: '200G',
            format: 'qcow2' as const,
            cache: 'none' as const,
            backup: true,
            replicate: true,
          }],
          network: [{
            bridge: 'vmbr0',
            dhcp: true,
          }],
        },
      })),
    ],
    features: {
      monitoring: true,
      logging: true,
      backups: true,
      gitops: true,
      secretManagement: true,
      ingress: true,
      storageClass: true,
    },
  },
  network: {
    domain: 'homelab.local',
    dns: {
      servers: ['1.1.1.1', '8.8.8.8'],
      searchDomains: ['homelab.local'],
    },
    vlans: [],
    bridges: [],
    firewall: {
      enabled: true,
      defaultPolicy: 'DROP',
      rules: [
        // Allow SSH
        {
          action: 'ACCEPT',
          direction: 'IN',
          protocol: 'tcp',
          port: 22,
          comment: 'Allow SSH',
        },
        // Allow Kubernetes API
        {
          action: 'ACCEPT',
          direction: 'IN',
          protocol: 'tcp',
          port: 6443,
          comment: 'Allow Kubernetes API',
        },
        // Allow HTTP/HTTPS
        {
          action: 'ACCEPT',
          direction: 'IN',
          protocol: 'tcp',
          port: 80,
          comment: 'Allow HTTP',
        },
        {
          action: 'ACCEPT',
          direction: 'IN',
          protocol: 'tcp',
          port: 443,
          comment: 'Allow HTTPS',
        },
      ],
    },
  },
};

/**
 * Get default configuration for environment
 */
export function getEnvironmentDefaults(environment: 'dev' | 'staging' | 'prod'): Partial<GlobalConfig> {
  switch (environment) {
    case 'dev':
      return devDefaults;
    case 'staging':
      return { ...devDefaults, project: { ...devDefaults.project!, environment: 'staging' } };
    case 'prod':
      return prodDefaults;
    default:
      return devDefaults;
  }
}

/**
 * Create node configuration with defaults
 */
export function createNodeConfig(
  name: string,
  role: 'control-plane' | 'worker',
  template: string = 'talos-v1.6.0',
  overrides: Partial<NodeConfig> = {}
): NodeConfig {
  const isControlPlane = role === 'control-plane';
  
  const defaults: NodeConfig = {
    name,
    role,
    template,
    specs: {
      cores: isControlPlane ? 4 : 4,
      memory: isControlPlane ? 8192 : 8192,
      disk: [{
        size: isControlPlane ? '50G' : '100G',
        format: 'qcow2',
        cache: 'none',
        backup: true,
        replicate: false,
      }],
      network: [{
        bridge: 'vmbr0',
        dhcp: true,
      }],
    },
  };

  return { ...defaults, ...overrides };
}