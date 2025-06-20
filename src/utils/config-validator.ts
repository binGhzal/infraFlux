import * as Joi from 'joi';
import { InfraFluxConfig } from '@/types';
import { logger } from './logger';

/**
 * Comprehensive configuration validation using Joi schemas
 */

// Network validation schema (gateway and subnet are optional - auto-discovered from Proxmox)
const networkSchema = Joi.object({
  bridge: Joi.string()
    .pattern(/^vmbr\d+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Network bridge must be in format "vmbr0", "vmbr1", etc.',
    }),
  domain: Joi.string().hostname().required(),
  dnsServers: Joi.array()
    .items(Joi.string().ip({ version: ['ipv4', 'ipv6'] }))
    .min(1)
    .required(),
  gateway: Joi.string()
    .ip({ version: 'ipv4' })
    .allow('') // Allow empty string for auto-discovery
    .messages({
      'string.ip':
        'Gateway must be a valid IPv4 address or empty for auto-discovery',
    }),
  subnet: Joi.string()
    .pattern(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
    .allow('') // Allow empty string for auto-discovery
    .messages({
      'string.pattern.base':
        'Subnet must be in CIDR format (e.g., 192.168.1.0/24) or empty for auto-discovery',
    }),
});

// Proxmox validation schema
const proxmoxSchema = Joi.object({
  endpoint: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required()
    .messages({
      'string.uri': 'Proxmox endpoint must be a valid HTTP/HTTPS URL',
    }),
  username: Joi.string()
    .pattern(/^[^@]+@[^@]+$/)
    .required()
    .messages({
      'string.pattern.base':
        'Username must be in format "user@realm" (e.g., root@pam)',
    }),
  password: Joi.any().required(),
  node: Joi.string().min(1).required(),
  insecure: Joi.boolean().default(true),
});

// VM configuration schema
const vmSchema = Joi.object({
  templateId: Joi.number().integer().min(9000).max(9999).required().messages({
    'number.min': 'Template ID should be between 9000-9999 to avoid conflicts',
    'number.max': 'Template ID should be between 9000-9999 to avoid conflicts',
  }),
  forceDownload: Joi.boolean().default(false),
  defaults: Joi.object({
    cores: Joi.number().integer().min(1).max(64).default(2),
    memory: Joi.number().integer().min(512).max(1048576).default(4096), // 512MB to 1TB
    diskSize: Joi.string()
      .pattern(/^\d+[GT]$/)
      .default('20G')
      .messages({
        'string.pattern.base': 'Disk size must be in format "20G" or "1T"',
      }),
    storagePool: Joi.string().required(),
    isoStoragePool: Joi.string().required(),
    diskFormat: Joi.string().valid('raw', 'qcow2').default('raw'),
  }).required(),
});

// Kubernetes configuration schema
const kubernetesSchema = Joi.object({
  version: Joi.string()
    .pattern(/^v\d+\.\d+\.\d+$/)
    .required()
    .messages({
      'string.pattern.base': 'Kubernetes version must be in format "v1.29.0"',
    }),
  masterNodes: Joi.number().integer().min(1).max(7).required().messages({
    'number.min': 'Must have at least 1 master node',
    'number.max': 'Maximum 7 master nodes recommended for Talos',
  }),
  workerNodes: Joi.number().integer().min(0).max(100).required(),
  masterSpecs: Joi.object({
    cores: Joi.number().integer().min(2).max(64).default(2).messages({
      'number.min': 'Master nodes need minimum 2 CPU cores',
    }),
    memory: Joi.number()
      .integer()
      .min(2048)
      .max(1048576)
      .default(4096)
      .messages({
        'number.min': 'Master nodes need minimum 2GB RAM',
      }),
    diskSize: Joi.string()
      .pattern(/^\d+[GT]$/)
      .default('30G'),
  }),
  workerSpecs: Joi.object({
    cores: Joi.number().integer().min(1).max(64).default(2),
    memory: Joi.number().integer().min(1024).max(1048576).default(4096),
    diskSize: Joi.string()
      .pattern(/^\d+[GT]$/)
      .default('50G'),
  }),
  networking: Joi.object({
    podCIDR: Joi.string()
      .pattern(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
      .required(),
    serviceCIDR: Joi.string()
      .pattern(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/)
      .required(),
    clusterDNS: Joi.array()
      .items(Joi.string().ip({ version: 'ipv4' }))
      .required(),
    cni: Joi.string().valid('cilium').default('cilium'),
  }),
  features: Joi.object({
    serviceLB: Joi.boolean().default(true),
    metricsServer: Joi.boolean().default(true),
    localStorage: Joi.boolean().default(true),
  }),
});

// Network discovery schema
const networkDiscoverySchema = Joi.object({
  autoDiscover: Joi.boolean().default(true),
  fallbackConfig: Joi.object({
    gateway: Joi.string().ip({ version: 'ipv4' }),
    subnet: Joi.string().pattern(/^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
  }).optional(),
});

// Main configuration schema
const configSchema = Joi.object({
  environment: Joi.string().valid('dev', 'staging', 'prod').required(),
  project: Joi.object({
    name: Joi.string().alphanum().lowercase().min(1).max(50).required(),
    description: Joi.string().min(1).max(200).required(),
    tags: Joi.object().pattern(Joi.string(), Joi.string()).required(),
  }).required(),
  proxmox: proxmoxSchema,
  network: networkSchema,
  vm: vmSchema,
  kubernetes: kubernetesSchema,
});

/**
 * Validate configuration against schema
 */
export function validateConfig(config: unknown): {
  valid: boolean;
  config?: InfraFluxConfig;
  errors?: string[];
  warnings?: string[];
} {
  const { error, value, warning } = configSchema.validate(config, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = error.details.map((detail) => {
      const path = detail.path.join('.');
      return `${path}: ${detail.message}`;
    });

    logger.error('Configuration validation failed', { errors });

    return {
      valid: false,
      errors,
    };
  }

  const warnings: string[] = [];

  // Additional custom validations
  const validatedConfig = value as InfraFluxConfig;

  // Check network conflicts (only if network values are provided)
  if (validatedConfig.network.gateway && validatedConfig.network.subnet) {
    if (isNetworkConflict(validatedConfig)) {
      warnings.push(
        'Pod CIDR conflicts with network subnet. This may cause routing issues.'
      );
    }
  } else {
    warnings.push(
      'Network gateway and subnet will be auto-discovered from Proxmox bridge configuration.'
    );
  }

  // Check resource allocation
  const resourceWarnings = validateResources(validatedConfig);
  warnings.push(...resourceWarnings);

  // Check Proxmox connectivity (async validation could be added)
  if (validatedConfig.proxmox.insecure) {
    warnings.push(
      'Proxmox connection is configured as insecure. Consider using valid certificates in production.'
    );
  }

  if (warnings.length > 0) {
    logger.warn('Configuration warnings detected', { warnings });
  }

  return {
    valid: true,
    config: validatedConfig,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Check for network conflicts
 */
function isNetworkConflict(config: InfraFluxConfig): boolean {
  const subnet = config.network.subnet;
  const podCIDR = config.kubernetes.networking?.podCIDR;
  const serviceCIDR = config.kubernetes.networking?.serviceCIDR;

  if (!podCIDR || !serviceCIDR) return false;

  // Simple overlap check (could be more sophisticated)
  const subnetBase = subnet.split('/')[0].split('.').slice(0, 2).join('.');
  const podBase = podCIDR.split('/')[0].split('.').slice(0, 2).join('.');
  const serviceBase = serviceCIDR
    .split('/')[0]
    .split('.')
    .slice(0, 2)
    .join('.');

  return subnetBase === podBase || subnetBase === serviceBase;
}

/**
 * Validate resource allocation makes sense
 */
function validateResources(config: InfraFluxConfig): string[] {
  const warnings: string[] = [];

  const masters = config.kubernetes.masterNodes;
  const workers = config.kubernetes.workerNodes;
  const masterMem = config.kubernetes.masterSpecs?.memory || 4096;
  const workerMem = config.kubernetes.workerSpecs?.memory || 4096;

  // Check cluster size
  if (masters === 1) {
    warnings.push(
      'Single master node setup is not highly available. Consider 3 masters for production.'
    );
  }

  if (workers === 0) {
    warnings.push(
      'No worker nodes configured. Workloads will run on master nodes.'
    );
  }

  // Check memory allocation
  if (masterMem < 4096) {
    warnings.push(
      'Master nodes have less than 4GB RAM. This may cause stability issues.'
    );
  }

  if (workerMem < 2048) {
    warnings.push(
      'Worker nodes have less than 2GB RAM. This may limit workload capacity.'
    );
  }

  // Check total resource usage
  const totalMem = masters * masterMem + workers * workerMem;
  if (totalMem > 32768) {
    // 32GB
    warnings.push(
      `High memory usage detected: ${Math.round(totalMem / 1024)}GB total. Ensure your Proxmox host has sufficient resources.`
    );
  }

  return warnings;
}

/**
 * CLI-friendly configuration validation
 */
export function validateConfigCLI(config: unknown): number {
  const result = validateConfig(config);

  if (!result.valid) {
    console.error('❌ Configuration validation failed:');
    result.errors?.forEach((error) => {
      console.error(`  • ${error}`);
    });
    return 1;
  }

  console.log('✅ Configuration validation passed');

  if (result.warnings && result.warnings.length > 0) {
    console.warn('\n⚠️  Configuration warnings:');
    result.warnings.forEach((warning) => {
      console.warn(`  • ${warning}`);
    });
  }

  return 0;
}

/**
 * Generate a configuration template with comments
 */
export function generateConfigTemplate(): string {
  return `# InfraFlux v2.0 Configuration Template
# Copy this to .env and customize for your environment

# === REQUIRED: Proxmox Configuration ===
PROXMOX_ENDPOINT=https://192.168.1.100:8006  # Your Proxmox server URL
PROXMOX_USERNAME=root@pam                     # Proxmox username@realm
PROXMOX_PASSWORD=your-secure-password         # Proxmox password
PROXMOX_NODE=pve                             # Proxmox node name

# === Network Configuration ===
NETWORK_BRIDGE=vmbr0                         # Proxmox bridge (vmbr0, vmbr1, etc.)
NETWORK_GATEWAY=                             # Auto-discovered from bridge config (leave empty)
NETWORK_SUBNET=                              # Auto-discovered from bridge config (leave empty)
NETWORK_DNS=1.1.1.1,1.0.0.1                # DNS servers (comma-separated)

# === Talos Template Configuration ===
TALOS_TEMPLATE_ID=9010                       # Template VM ID (9000-9999 range)
TALOS_VERSION=v1.10.4                       # Talos Linux version
TALOS_FORCE_DOWNLOAD=false                   # Force re-download of ISO

# === Storage Configuration ===
VM_STORAGE_POOL=local-lvm                    # Storage for VM disks (fast storage)
ISO_STORAGE_POOL=local                       # Storage for ISOs (can be slower)

# === Kubernetes Cluster Configuration ===
K8S_MASTER_COUNT=1                           # Number of master nodes (1, 3, 5, 7)
K8S_WORKER_COUNT=3                           # Number of worker nodes (0+)

# Master node specifications
K8S_MASTER_CORES=2                           # CPU cores per master (minimum: 2)
K8S_MASTER_MEMORY=4096                       # RAM per master in MB (minimum: 2048)
K8S_MASTER_DISK=30G                          # Disk size per master

# Worker node specifications
K8S_WORKER_CORES=2                           # CPU cores per worker
K8S_WORKER_MEMORY=4096                       # RAM per worker in MB (minimum: 1024)
K8S_WORKER_DISK=50G                          # Disk size per worker

# Network ranges (avoid conflicts with your LAN)
K8S_POD_CIDR=10.244.0.0/16                  # Pod network CIDR
K8S_SERVICE_CIDR=10.96.0.0/12               # Service network CIDR

# === GitOps Configuration ===
GITOPS_ENABLED=true                          # Enable FluxCD GitOps
GITOPS_REPO=https://github.com/your-org/gitops-repo  # Your GitOps repository
GITOPS_BRANCH=main                           # Git branch to monitor
GITOPS_PATH=clusters/homelab                 # Path in repository



# === Optional: Advanced Settings ===
# LOG_LEVEL=info                             # Logging level (debug, info, warn, error)
# ENVIRONMENT=dev                            # Environment name (dev, staging, prod)

# === Validation Notes ===
# • Template ID should be 9000-9999 to avoid conflicts
# • Master nodes need minimum 2 CPU cores and 2GB RAM
# • Pod/Service CIDRs should not conflict with your LAN subnet
# • Use odd numbers for master count (1, 3, 5, 7) for HA
# • Ensure your Proxmox host has sufficient resources for all VMs
# • Network gateway/subnet auto-discovered from Proxmox bridge config
# • Monitoring, security, and backup managed via GitOps (not here)`;
}
