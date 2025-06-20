import * as pulumi from '@pulumi/pulumi';
import * as dotenv from 'dotenv';
import { InfraFluxConfig } from '@/types';

// Load environment variables
dotenv.config();

const pulumiConfig = new pulumi.Config();

// Helper to get env var or Pulumi config with fallback
const getConfig = (
  envKey: string,
  pulumiKey: string,
  defaultValue?: string
): string => {
  return (
    process.env[envKey] ?? pulumiConfig.get(pulumiKey) ?? defaultValue ?? ''
  );
};

const getConfigInt = (
  envKey: string,
  pulumiKey: string,
  defaultValue: number
): number => {
  const value = process.env[envKey] ?? pulumiConfig.get(pulumiKey);
  return value ? parseInt(value, 10) : defaultValue;
};

const getConfigBool = (
  envKey: string,
  pulumiKey: string,
  defaultValue: boolean
): boolean => {
  const value = process.env[envKey] ?? pulumiConfig.get(pulumiKey);
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

// Talos version (matches Image Factory selection)
const getLatestTalosVersion = (): string => {
  return process.env.TALOS_VERSION ?? 'v1.10.4'; // Updated to match Image Factory selection
};

export const config: InfraFluxConfig = {
  environment: (process.env.ENVIRONMENT ?? 'dev') as 'dev' | 'staging' | 'prod',

  project: {
    name: 'infraflux',
    description: 'Modern homelab infrastructure with Talos Linux',
    tags: {
      'managed-by': 'pulumi',
      project: 'infraflux',
      environment: process.env.ENVIRONMENT ?? 'dev',
      distribution: 'talos',
    },
  },

  proxmox: {
    endpoint: getConfig(
      'PROXMOX_ENDPOINT',
      'proxmox:endpoint',
      'https://192.168.1.100:8006'
    ),
    username: getConfig('PROXMOX_USERNAME', 'proxmox:username', 'root@pam'),
    password: process.env.PROXMOX_PASSWORD
      ? pulumi.secret(process.env.PROXMOX_PASSWORD)
      : undefined,
    node: getConfig('PROXMOX_NODE', 'proxmox:node', 'pve'),
    insecure: getConfigBool('PROXMOX_INSECURE', 'proxmox:insecure', true),
  },

  network: {
    bridge: getConfig('NETWORK_BRIDGE', 'network:bridge', 'vmbr0'),
    domain: getConfig('NETWORK_DOMAIN', 'network:domain', 'homelab.local'),
    dnsServers: getConfig(
      'NETWORK_DNS',
      'network:dns',
      '1.1.1.1,1.0.0.1'
    ).split(','),
    gateway: getConfig('NETWORK_GATEWAY', 'network:gateway', '192.168.1.1'),
    subnet: getConfig('NETWORK_SUBNET', 'network:subnet', '192.168.1.0/24'),
  },

  vm: {
    templateId: getConfigInt('TALOS_TEMPLATE_ID', 'vm:templateId', 9010), // Talos template
    defaults: {
      cores: getConfigInt('VM_DEFAULT_CORES', 'vm:defaultCores', 2),
      memory: getConfigInt('VM_DEFAULT_MEMORY', 'vm:defaultMemory', 4096),
      diskSize: getConfig('VM_DEFAULT_DISK', 'vm:defaultDisk', '20G'),
      storagePool: getConfig('VM_STORAGE_POOL', 'vm:storagePool', 'local-lvm'),
      isoStoragePool: getConfig(
        'ISO_STORAGE_POOL',
        'vm:isoStoragePool',
        'local'
      ),
      diskFormat: 'raw',
    },
  },

  kubernetes: {
    version: getLatestTalosVersion(),
    masterNodes: getConfigInt('K8S_MASTER_COUNT', 'k8s:masterCount', 1),
    workerNodes: getConfigInt('K8S_WORKER_COUNT', 'k8s:workerCount', 3),
    masterSpecs: {
      cores: getConfigInt('K8S_MASTER_CORES', 'k8s:masterCores', 2),
      memory: getConfigInt('K8S_MASTER_MEMORY', 'k8s:masterMemory', 4096),
      diskSize: getConfig('K8S_MASTER_DISK', 'k8s:masterDisk', '30G'),
    },
    workerSpecs: {
      cores: getConfigInt('K8S_WORKER_CORES', 'k8s:workerCores', 2),
      memory: getConfigInt('K8S_WORKER_MEMORY', 'k8s:workerMemory', 4096),
      diskSize: getConfig('K8S_WORKER_DISK', 'k8s:workerDisk', '50G'),
    },
    networking: {
      podCIDR: getConfig('K8S_POD_CIDR', 'k8s:podCIDR', '10.244.0.0/16'),
      serviceCIDR: getConfig(
        'K8S_SERVICE_CIDR',
        'k8s:serviceCIDR',
        '10.96.0.0/12'
      ),
      clusterDNS: ['10.96.0.10'],
      cni: 'cilium',
    },
    features: {
      serviceLB: true,
      metricsServer: true,
      localStorage: true,
    },
  },

  security: {
    firewall: {
      enabled: getConfigBool('ENABLE_FIREWALL', 'security:firewall', true),
      defaultPolicy: 'deny',
      rules: [],
    },
    automaticUpdates: getConfigBool(
      'ENABLE_AUTO_UPDATES',
      'security:autoUpdates',
      true
    ),
    auditLogging: getConfigBool(
      'ENABLE_AUDIT_LOGGING',
      'security:auditLogging',
      true
    ),
  },

  monitoring: {
    enabled: getConfigBool('MONITORING_ENABLED', 'monitoring:enabled', true),
    prometheus: {
      retention: getConfig(
        'PROMETHEUS_RETENTION',
        'monitoring:prometheusRetention',
        '30d'
      ),
      storageSize: getConfig(
        'PROMETHEUS_STORAGE',
        'monitoring:prometheusStorage',
        '50Gi'
      ),
      scrapeInterval: '30s',
    },
    grafana: {
      adminPassword: pulumi.secret(
        getConfig('GRAFANA_PASSWORD', 'monitoring:grafanaPassword', 'changeme')
      ),
      persistence: true,
      storageSize: '10Gi',
    },
  },

  backup: {
    enabled: getConfigBool('BACKUP_ENABLED', 'backup:enabled', true),
    schedule: getConfig('BACKUP_SCHEDULE', 'backup:schedule', '0 2 * * *'),
    retention: getConfigInt('BACKUP_RETENTION', 'backup:retention', 30),
    storage: {
      type: 'local',
      path: getConfig('BACKUP_PATH', 'backup:path', '/mnt/backup'),
    },
    targets: [],
  },
};

// Export GitOps configuration separately
export const gitOpsConfig = {
  enabled: getConfigBool('GITOPS_ENABLED', 'gitops:enabled', true),
  repoUrl: getConfig('GITOPS_REPO', 'gitops:repo', ''),
  branch: getConfig('GITOPS_BRANCH', 'gitops:branch', 'main'),
  path: getConfig('GITOPS_PATH', 'gitops:path', 'clusters/homelab'),
  reconcileInterval: getConfig('GITOPS_INTERVAL', 'gitops:interval', '5m'),
};
