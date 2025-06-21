/**
 * TypeScript type definitions for InfraFlux hosts configuration
 * 
 * This file defines the complete type system for the hosts-based configuration
 * that replaces the count-based environment variable approach.
 */

/**
 * Root configuration structure for hosts.yaml
 */
export interface HostsConfig {
  /** Schema version for future compatibility */
  version: string;
  
  /** Global defaults that apply to all hosts unless overridden */
  defaults?: DefaultsConfig;
  
  /** Map of cluster name to cluster configuration */
  clusters: Record<string, ClusterConfig>;
}

/**
 * Global default configuration values
 */
export interface DefaultsConfig {
  /** Default domain name */
  domain?: string;
  
  /** Default DNS servers */
  dns?: string[];
  
  /** Default storage pool for VM disks */
  storagePool?: string;
  
  /** Default disk format: 'raw' or 'qcow2' */
  diskFormat?: 'raw' | 'qcow2';
  
  /** Default CPU cores */
  cores?: number;
  
  /** Default memory in MB */
  memory?: number;
  
  /** Default disk size (e.g., '20G') */
  disk?: string;
}

/**
 * Configuration for a single cluster
 */
export interface ClusterConfig {
  /** Network configuration for the cluster */
  network?: NetworkConfig;
  
  /** Master/control-plane nodes (required, at least 1) */
  masters: HostDefinition[];
  
  /** Worker nodes (optional) */
  workers?: HostDefinition[];
  
  /** Infrastructure VMs (non-Kubernetes, future feature) */
  infrastructure?: InfrastructureHost[];
}

/**
 * Network configuration for a cluster
 */
export interface NetworkConfig {
  /** Gateway IP address (can be auto-discovered) */
  gateway?: string;
  
  /** Subnet in CIDR notation (can be auto-discovered) */
  subnet?: string;
  
  /** Bridge name (default: vmbr0) */
  bridge?: string;
  
  /** DNS servers (inherits from defaults if not specified) */
  dns?: string[];
  
  /** Domain name (inherits from defaults if not specified) */
  domain?: string;
}

/**
 * Definition for a single host (master or worker)
 */
export interface HostDefinition {
  /** Host name (required, must match pattern ^[a-z0-9-]+$) */
  name: string;
  
  /** Proxmox VM ID (required, range: 100-999999) */
  vmId: number;
  
  /** IPv4 address (required) */
  ip: string;
  
  /** CPU cores (optional, defaults from DefaultsConfig) */
  cores?: number;
  
  /** Memory in MB (optional, defaults from DefaultsConfig) */
  memory?: number;
  
  /** Disk size with unit (optional, defaults from DefaultsConfig) */
  disk?: string;
  
  /** Storage pool override (optional, inherits from defaults) */
  storagePool?: string;
  
  /** Additional tags for the VM (optional) */
  tags?: string[];
  
  /** GPU configuration (optional) */
  gpu?: GPUConfig;
  
  /** Additional disk configurations (optional) */
  additionalDisks?: DiskConfig[];
}

/**
 * Infrastructure host definition (extends HostDefinition for future features)
 */
export interface InfrastructureHost extends HostDefinition {
  /** Type of infrastructure VM */
  type?: string;
  
  /** OS template (future feature) */
  os?: string;
}

/**
 * GPU passthrough configuration
 */
export interface GPUConfig {
  /** GPU passthrough type */
  type: 'passthrough' | 'virtual';
  
  /** PCI device ID (e.g., '0000:01:00.0') */
  device?: string;
}

/**
 * Additional disk configuration
 */
export interface DiskConfig {
  /** Disk size with unit (e.g., '100G') */
  size: string;
  
  /** Storage pool for this disk */
  storagePool?: string;
  
  /** Description of disk purpose */
  purpose?: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  
  /** Array of validation error messages */
  errors: string[];
  
  /** Array of warning messages */
  warnings?: string[];
}

/**
 * Statistics about the loaded configuration
 */
export interface HostsConfigStats {
  /** Number of clusters defined */
  clusters: number;
  
  /** Total number of master nodes across all clusters */
  totalMasters: number;
  
  /** Total number of worker nodes across all clusters */
  totalWorkers: number;
  
  /** Total number of infrastructure VMs across all clusters */
  totalInfrastructure: number;
  
  /** Total number of VMs across all clusters */
  totalVMs: number;
  
  /** List of all VM IDs used */
  vmIds: number[];
  
  /** List of all IP addresses used */
  ipAddresses: string[];
}

/**
 * Configuration for the hosts config loader
 */
export interface HostsConfigLoaderArgs {
  /** Path to the hosts configuration file */
  configPath: string;
  
  /** Whether to validate the configuration */
  validate?: boolean;
  
  /** Whether to apply defaults */
  applyDefaults?: boolean;
}

/**
 * Output from the hosts config loader
 */
export interface HostsConfigLoaderOutput {
  /** The loaded and validated configuration */
  config: HostsConfig;
  
  /** Statistics about the configuration */
  stats: HostsConfigStats;
  
  /** Whether the configuration is valid */
  valid: boolean;
}

/**
 * Arguments for VM creation from host definition
 */
export interface HostBasedVMArgs {
  /** Host definition to create VM from */
  hostDefinition: HostDefinition;
  
  /** Cluster configuration for defaults */
  clusterConfig: ClusterConfig;
  
  /** Global defaults */
  defaults?: DefaultsConfig;
  
  /** VM template to clone from */
  template: any; // Will be typed more specifically when implemented
  
  /** Proxmox provider */
  provider: any; // Will be typed more specifically when implemented
}

/**
 * Migration helper result when converting from env vars
 */
export interface EnvMigrationResult {
  /** Generated hosts configuration */
  config: HostsConfig;
  
  /** List of environment variables that were used */
  usedEnvVars: string[];
  
  /** List of generated VM names */
  generatedVMs: string[];
  
  /** Migration notes and warnings */
  notes: string[];
}

/**
 * Type guard to check if a configuration is valid
 */
export function isValidHostsConfig(config: any): config is HostsConfig {
  return (
    typeof config === 'object' &&
    config !== null &&
    typeof config.version === 'string' &&
    typeof config.clusters === 'object' &&
    Object.keys(config.clusters).length > 0
  );
}

/**
 * Type guard to check if a host definition is valid
 */
export function isValidHostDefinition(host: any): host is HostDefinition {
  return (
    typeof host === 'object' &&
    host !== null &&
    typeof host.name === 'string' &&
    typeof host.vmId === 'number' &&
    typeof host.ip === 'string' &&
    host.vmId >= 100 &&
    host.vmId <= 999999
  );
}

/**
 * Helper type for extracting all host definitions from a cluster
 */
export type AllHosts = {
  masters: HostDefinition[];
  workers: HostDefinition[];
  infrastructure: InfrastructureHost[];
};

/**
 * Helper type for VM role determination
 */
export type VMRole = 'master' | 'worker' | 'infrastructure';

/**
 * Constants for validation
 */
export const HOSTS_CONFIG_CONSTANTS = {
  /** Current schema version */
  CURRENT_VERSION: '1.0',
  
  /** Minimum VM ID */
  MIN_VM_ID: 100,
  
  /** Maximum VM ID */
  MAX_VM_ID: 999999,
  
  /** Default values */
  DEFAULTS: {
    cores: 2,
    memory: 4096,
    disk: '20G',
    storagePool: 'local-lvm',
    domain: 'homelab.local',
    dns: ['1.1.1.1', '1.0.0.1'],
    bridge: 'vmbr0',
  },
  
  /** Valid disk size pattern */
  DISK_SIZE_PATTERN: /^\d+[GM]$/,
  
  /** Valid host name pattern */
  HOST_NAME_PATTERN: /^[a-z0-9-]+$/,
  
  /** Automatic tags that are always added */
  AUTOMATIC_TAGS: {
    managed: 'infraflux-managed',
    master: 'master',
    worker: 'worker',
    infrastructure: 'infrastructure',
  },
} as const;