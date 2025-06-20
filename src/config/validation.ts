/**
 * Configuration validation for InfraFlux v2.0
 */

import * as pulumi from '@pulumi/pulumi';
import * as Joi from 'joi';
import { GlobalConfig, ProxmoxConfig, ClusterConfig, NetworkConfig } from '../types';
import { logger } from '../utils/logger';

/**
 * Joi schema for validating Proxmox configuration
 */
const proxmoxConfigSchema = Joi.object({
  endpoint: Joi.string().uri().required()
    .description('Proxmox API endpoint URL'),
  node: Joi.string().required()
    .description('Proxmox node name for VM deployment'),
  datastore: Joi.string().required()
    .description('Proxmox datastore for VM storage'),
  networkBridge: Joi.string().required()
    .description('Proxmox network bridge for VMs'),
  apiToken: Joi.object({
    id: Joi.string().required(),
    secret: Joi.string().required(),
  }).required(),
  ssl: Joi.object({
    verify: Joi.boolean().default(true),
    caPath: Joi.string().optional(),
  }).default({ verify: true }),
});

/**
 * Joi schema for validating cluster configuration
 */
const clusterConfigSchema = Joi.object({
  name: Joi.string().hostname().required()
    .description('Kubernetes cluster name'),
  version: Joi.string().pattern(/^v\d+\.\d+\.\d+$/).required()
    .description('Kubernetes version to deploy'),
  distribution: Joi.string().valid('talos', 'k3s').default('talos')
    .description('Kubernetes distribution to use'),
  networking: Joi.object({
    podSubnet: Joi.string().pattern(/^\d+\.\d+\.\d+\.\d+\/\d+$/).required(),
    serviceSubnet: Joi.string().pattern(/^\d+\.\d+\.\d+\.\d+\/\d+$/).required(),
    clusterDomain: Joi.string().hostname().default('cluster.local'),
    cni: Joi.string().valid('cilium', 'calico', 'flannel').default('cilium'),
    networkPolicies: Joi.boolean().default(true),
    serviceMesh: Joi.string().valid('istio', 'linkerd').optional(),
  }).required(),
  nodes: Joi.array().items(
    Joi.object({
      name: Joi.string().hostname().required(),
      role: Joi.string().valid('control-plane', 'worker').required(),
      template: Joi.string().required(),
      specs: Joi.object({
        cores: Joi.number().integer().min(1).max(64).required(),
        memory: Joi.number().integer().min(512).required(),
        disk: Joi.array().items(
          Joi.object({
            size: Joi.string().pattern(/^\d+[GMK]$/).required(),
            format: Joi.string().valid('qcow2', 'raw', 'vmdk').default('qcow2'),
            cache: Joi.string().valid('none', 'writethrough', 'writeback').default('none'),
            backup: Joi.boolean().default(true),
            replicate: Joi.boolean().default(false),
          })
        ).min(1).required(),
        network: Joi.array().items(
          Joi.object({
            bridge: Joi.string().required(),
            vlan: Joi.number().integer().min(1).max(4094).optional(),
            mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).optional(),
            dhcp: Joi.boolean().default(true),
            ip: Joi.string().ip().optional(),
            gateway: Joi.string().ip().optional(),
          })
        ).min(1).required(),
      }).required(),
      taints: Joi.array().items(
        Joi.object({
          key: Joi.string().required(),
          value: Joi.string().required(),
          effect: Joi.string().valid('NoSchedule', 'PreferNoSchedule', 'NoExecute').required(),
        })
      ).optional(),
      labels: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    })
  ).min(1).required(),
  features: Joi.object({
    monitoring: Joi.boolean().default(true),
    logging: Joi.boolean().default(true),
    backups: Joi.boolean().default(true),
    gitops: Joi.boolean().default(true),
    secretManagement: Joi.boolean().default(true),
    ingress: Joi.boolean().default(true),
    storageClass: Joi.boolean().default(true),
  }).default(),
});

/**
 * Joi schema for validating network configuration
 */
const networkConfigSchema = Joi.object({
  domain: Joi.string().hostname().required(),
  dns: Joi.object({
    servers: Joi.array().items(Joi.string().ip()).min(1).required(),
    searchDomains: Joi.array().items(Joi.string().hostname()).default([]),
  }).required(),
  vlans: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().min(1).max(4094).required(),
      name: Joi.string().required(),
      description: Joi.string().default(''),
      subnet: Joi.string().pattern(/^\d+\.\d+\.\d+\.\d+\/\d+$/).required(),
      gateway: Joi.string().ip().required(),
      dhcp: Joi.object({
        enabled: Joi.boolean().default(false),
        range: Joi.object({
          start: Joi.string().ip().required(),
          end: Joi.string().ip().required(),
        }).when('enabled', { is: true, then: Joi.required() }),
        reservations: Joi.array().items(
          Joi.object({
            mac: Joi.string().pattern(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).required(),
            ip: Joi.string().ip().required(),
            hostname: Joi.string().hostname().required(),
          })
        ).default([]),
      }).default({ enabled: false }),
    })
  ).default([]),
  bridges: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      ports: Joi.array().items(Joi.string()).default([]),
      vlanAware: Joi.boolean().default(false),
      stp: Joi.boolean().default(false),
      fastForward: Joi.boolean().default(true),
    })
  ).default([]),
  firewall: Joi.object({
    enabled: Joi.boolean().default(true),
    defaultPolicy: Joi.string().valid('ACCEPT', 'DROP').default('DROP'),
    rules: Joi.array().items(
      Joi.object({
        action: Joi.string().valid('ACCEPT', 'DROP', 'REJECT').required(),
        direction: Joi.string().valid('IN', 'OUT').required(),
        protocol: Joi.string().valid('tcp', 'udp', 'icmp', 'all').required(),
        source: Joi.string().optional(),
        destination: Joi.string().optional(),
        port: Joi.alternatives().try(Joi.number().integer(), Joi.string()).optional(),
        comment: Joi.string().optional(),
      })
    ).default([]),
  }).default(),
});

/**
 * Complete configuration schema
 */
const globalConfigSchema = Joi.object({
  project: Joi.object({
    name: Joi.string().required(),
    version: Joi.string().pattern(/^\d+\.\d+\.\d+$/).required(),
    description: Joi.string().required(),
    environment: Joi.string().valid('dev', 'staging', 'prod').required(),
    region: Joi.string().default('homelab'),
    tags: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  }).required(),
  proxmox: proxmoxConfigSchema.required(),
  cluster: clusterConfigSchema.required(),
  network: networkConfigSchema.required(),
  storage: Joi.object({
    datastores: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().valid('dir', 'lvm', 'zfs', 'ceph').required(),
        path: Joi.string().required(),
        maxFiles: Joi.number().integer().positive().optional(),
        shared: Joi.boolean().default(false),
        content: Joi.array().items(
          Joi.string().valid('images', 'iso', 'backup', 'vztmpl', 'snippets')
        ).default(['images']),
      })
    ).default([]),
    volumes: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        size: Joi.string().pattern(/^\d+[GMK]$/).required(),
        format: Joi.string().valid('qcow2', 'raw', 'vmdk').default('qcow2'),
        cache: Joi.string().valid('none', 'writethrough', 'writeback').default('none'),
        backup: Joi.boolean().default(true),
        replicate: Joi.boolean().default(false),
      })
    ).default([]),
    backups: Joi.object({
      enabled: Joi.boolean().default(true),
      schedule: Joi.string().default('0 2 * * *'), // Daily at 2 AM
      retention: Joi.object({
        daily: Joi.number().integer().min(1).default(7),
        weekly: Joi.number().integer().min(1).default(4),
        monthly: Joi.number().integer().min(1).default(3),
      }).default(),
      storage: Joi.string().default('local'),
      compression: Joi.string().valid('none', 'lzo', 'gzip', 'zstd').default('zstd'),
    }).default(),
  }).default({}),
  security: Joi.object({
    rbac: Joi.object({
      enabled: Joi.boolean().default(true),
      adminUsers: Joi.array().items(Joi.string()).default([]),
      adminGroups: Joi.array().items(Joi.string()).default([]),
      readOnlyUsers: Joi.array().items(Joi.string()).default([]),
      readOnlyGroups: Joi.array().items(Joi.string()).default([]),
    }).default(),
    networkPolicies: Joi.array().default([]),
    secretEncryption: Joi.object({
      provider: Joi.string().valid('esc', 'vault', 'sealed-secrets').default('esc'),
      keyRotation: Joi.boolean().default(true),
      rotationInterval: Joi.string().default('90d'),
    }).default(),
    certificateManagement: Joi.object({
      issuer: Joi.string().valid('cert-manager', 'manual').default('cert-manager'),
      ca: Joi.object({
        selfSigned: Joi.boolean().default(true),
        commonName: Joi.string().default('InfraFlux CA'),
        organization: Joi.string().default('InfraFlux'),
        country: Joi.string().length(2).default('US'),
      }).default(),
      wildcardCerts: Joi.boolean().default(true),
    }).default(),
  }).default({}),
});

/**
 * Extract configuration from Pulumi config
 */
export async function extractPulumiConfig(config: pulumi.Config): Promise<Record<string, any>> {
  const configObject: Record<string, any> = {};

  // Extract project configuration
  configObject.project = {
    name: config.require('infraflux:cluster-name'),
    version: '2.0.0',
    description: 'InfraFlux v2.0 Homelab Infrastructure',
    environment: config.get('infraflux:environment') || 'dev',
    region: 'homelab',
    tags: {
      project: 'infraflux-v2',
      environment: config.get('infraflux:environment') || 'dev',
      managedBy: 'pulumi',
    },
  };

  // Extract Proxmox configuration
  configObject.proxmox = {
    endpoint: config.require('proxmox:endpoint'),
    node: config.get('proxmox:node') || 'pve1',
    datastore: config.get('proxmox:datastore') || 'local-lvm',
    networkBridge: config.get('proxmox:network-bridge') || 'vmbr0',
    apiToken: {
      id: config.require('proxmox:api-token-id'),
      secret: config.requireSecret('proxmox:api-token-secret'),
    },
    ssl: {
      verify: config.getBoolean('proxmox:ssl-verify') ?? true,
    },
  };

  // Extract cluster configuration
  const nodeCount = config.getNumber('infraflux:node-count') || 3;
  const vmTemplate = config.get('infraflux:vm-template') || 'talos-v1.6.0';
  
  configObject.cluster = {
    name: config.require('infraflux:cluster-name'),
    version: config.get('cluster:version') || 'v1.28.0',
    distribution: 'talos',
    networking: {
      podSubnet: config.get('cluster:pod-subnet') || '10.244.0.0/16',
      serviceSubnet: config.get('cluster:service-subnet') || '10.96.0.0/12',
      clusterDomain: config.get('cluster:domain') || 'cluster.local',
      cni: 'cilium',
      networkPolicies: true,
    },
    nodes: Array.from({ length: nodeCount }, (_, i) => {
      const isControlPlane = i === 0;
      return {
        name: isControlPlane ? `control-plane-${i + 1}` : `worker-${i}`,
        role: isControlPlane ? 'control-plane' : 'worker',
        template: vmTemplate,
        specs: {
          cores: isControlPlane ? 4 : 4,
          memory: isControlPlane ? 8192 : 8192,
          disk: [{
            size: '50G',
            format: 'qcow2',
            cache: 'none',
            backup: true,
            replicate: false,
          }],
          network: [{
            bridge: configObject.proxmox.networkBridge,
            dhcp: true,
          }],
        },
      };
    }),
    features: {
      monitoring: true,
      logging: true,
      backups: true,
      gitops: true,
      secretManagement: true,
      ingress: true,
      storageClass: true,
    },
  };

  // Extract network configuration
  configObject.network = {
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
      rules: [],
    },
  };

  // Set default storage and security configurations
  configObject.storage = {
    datastores: [],
    volumes: [],
    backups: {
      enabled: true,
      schedule: '0 2 * * *',
      retention: { daily: 7, weekly: 4, monthly: 3 },
      storage: 'local',
      compression: 'zstd',
    },
  };

  configObject.security = {
    rbac: {
      enabled: true,
      adminUsers: [],
      adminGroups: [],
      readOnlyUsers: [],
      readOnlyGroups: [],
    },
    networkPolicies: [],
    secretEncryption: {
      provider: 'esc',
      keyRotation: true,
      rotationInterval: '90d',
    },
    certificateManagement: {
      issuer: 'cert-manager',
      ca: {
        selfSigned: true,
        commonName: 'InfraFlux CA',
        organization: 'InfraFlux',
        country: 'US',
      },
      wildcardCerts: true,
    },
  };

  return configObject;
}

/**
 * Validate configuration against schema
 */
export async function validateConfig(config: pulumi.Config): Promise<GlobalConfig> {
  logger.info('Validating configuration...');

  try {
    // Extract configuration from Pulumi config
    const configObject = await extractPulumiConfig(config);

    // Validate against schema
    const { error, value } = globalConfigSchema.validate(configObject, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessages = error.details.map(detail => detail.message).join(', ');
      logger.error('Configuration validation failed', { errors: errorMessages });
      throw new Error(`Configuration validation failed: ${errorMessages}`);
    }

    logger.info('Configuration validation passed');
    return value as GlobalConfig;

  } catch (error) {
    logger.error('Failed to validate configuration', {}, error as Error);
    throw error;
  }
}

/**
 * Validate specific configuration sections
 */
export function validateProxmoxConfig(config: any): ProxmoxConfig {
  const { error, value } = proxmoxConfigSchema.validate(config);
  if (error) {
    throw new Error(`Proxmox configuration validation failed: ${error.message}`);
  }
  return value;
}

export function validateClusterConfig(config: any): ClusterConfig {
  const { error, value } = clusterConfigSchema.validate(config);
  if (error) {
    throw new Error(`Cluster configuration validation failed: ${error.message}`);
  }
  return value;
}

export function validateNetworkConfig(config: any): NetworkConfig {
  const { error, value } = networkConfigSchema.validate(config);
  if (error) {
    throw new Error(`Network configuration validation failed: ${error.message}`);
  }
  return value;
}