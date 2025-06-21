# InfraFlux Hosts Configuration Specification

## Overview

The hosts configuration file provides declarative, explicit control over every VM in your InfraFlux deployment. This specification defines the complete schema, validation rules, and usage patterns.

## Schema Version

Current Version: `1.0`

## File Format

- **Format**: YAML or JSON
- **Default Location**: `./hosts.yaml` or `./hosts.json`
- **Encoding**: UTF-8

## Complete Schema Definition

### Root Structure

```yaml
version: string           # Schema version (required)
defaults: DefaultsConfig  # Global defaults (optional)
clusters: ClustersMap     # Cluster definitions (required)
```

### DefaultsConfig

Global defaults that apply to all hosts unless overridden.

```yaml
defaults:
  domain: string          # Default domain (default: "homelab.local")
  dns: string[]           # DNS servers (default: ["1.1.1.1", "1.0.0.1"])
  storagePool: string     # Default storage pool (default: "local-lvm")
  diskFormat: string      # Disk format: "raw" | "qcow2" (default: "raw")
  cores: number           # Default CPU cores (default: 2)
  memory: number          # Default memory in MB (default: 4096)
  disk: string            # Default disk size (default: "20G")
```

### ClustersMap

Map of cluster name to cluster configuration.

```yaml
clusters:
  [clusterName]: ClusterConfig
```

### ClusterConfig

Configuration for a single cluster.

```yaml
[clusterName]:
  network: NetworkConfig    # Network configuration (optional)
  masters: HostDefinition[] # Master nodes (required, min: 1)
  workers: HostDefinition[] # Worker nodes (optional)
  infrastructure: InfrastructureHost[] # Non-k8s VMs (optional, future)
```

### NetworkConfig

Network configuration for the cluster.

```yaml
network:
  gateway: string         # Gateway IP (optional, can be auto-discovered)
  subnet: string          # Subnet CIDR (optional, can be auto-discovered)
  bridge: string          # Bridge name (default: "vmbr0")
  dns: string[]           # DNS servers (optional, inherits from defaults)
  domain: string          # Domain name (optional, inherits from defaults)
```

### HostDefinition

Definition for a single host (master or worker).

```yaml
- name: string            # Host name (required, pattern: ^[a-z0-9-]+$)
  vmId: number            # Proxmox VM ID (required, range: 100-999999)
  ip: string              # IPv4 address (required)
  cores: number           # CPU cores (optional, min: 1, max: 128)
  memory: number          # Memory in MB (optional, min: 512, max: 524288)
  disk: string            # Disk size (optional, pattern: ^\d+[GM]$)
  storagePool: string     # Storage pool override (optional)
  tags: string[]          # Additional tags (optional)
  gpu: GPUConfig          # GPU configuration (optional)
  additionalDisks: DiskConfig[] # Extra disks (optional)
```

### GPUConfig

GPU passthrough configuration.

```yaml
gpu:
  type: string            # "passthrough" | "virtual"
  device: string          # PCI device ID (e.g., "0000:01:00.0")
```

### DiskConfig

Additional disk configuration.

```yaml
additionalDisks:
  - size: string          # Size (pattern: ^\d+[GM]$)
    storagePool: string   # Storage pool
    purpose: string       # Description of disk purpose
```

### InfrastructureHost

Future: Non-Kubernetes infrastructure VMs.

```yaml
infrastructure:
  - name: string          # All HostDefinition fields...
    type: string          # VM type: "database" | "monitoring" | "storage"
    os: string            # OS template (future feature)
```

## Validation Rules

### Required Fields

1. **Root Level**:
   - `clusters`: At least one cluster must be defined

2. **Cluster Level**:
   - `masters`: At least one master node required

3. **Host Level**:
   - `name`: Required, must match pattern `^[a-z0-9-]+$`
   - `vmId`: Required, range 100-999999
   - `ip`: Required, valid IPv4 address

### Field Constraints

| Field | Type | Constraints | Default |
|-------|------|-------------|---------|
| version | string | Currently "1.0" | "1.0" |
| name | string | Lowercase alphanumeric + hyphens | - |
| vmId | number | 100-999999, must be unique | - |
| ip | string | Valid IPv4 | - |
| cores | number | 1-128 | 2 |
| memory | number | 512-524288 (MB) | 4096 |
| disk | string | Pattern: `^\d+[GM]$` | "20G" |
| storagePool | string | Valid Proxmox storage | "local-lvm" |
| tags | string[] | Any string | [] |

### Automatic Tags

The following tags are automatically added:
- `infraflux-managed` - All VMs
- `master` - Master nodes
- `worker` - Worker nodes
- `[cluster-name]` - Cluster membership

## Examples

### Minimal Configuration

```yaml
clusters:
  homelab:
    masters:
      - name: k8s-master-01
        vmId: 8001
        ip: 192.168.1.201
    workers:
      - name: k8s-worker-01
        vmId: 8101
        ip: 192.168.1.211
```

### Production Configuration

```yaml
version: "1.0"

defaults:
  domain: prod.local
  dns:
    - 10.0.0.1
    - 10.0.0.2
  storagePool: fast-ssd
  cores: 4
  memory: 8192
  disk: 50G

clusters:
  production:
    network:
      gateway: 10.0.0.1
      subnet: 10.0.0.0/24
      bridge: vmbr10
    
    masters:
      - name: prod-master-01
        vmId: 8001
        ip: 10.0.0.11
        cores: 8
        memory: 16384
        disk: 100G
        tags:
          - critical
          - primary
      
      - name: prod-master-02
        vmId: 8002
        ip: 10.0.0.12
        cores: 8
        memory: 16384
        disk: 100G
        tags:
          - critical
          - secondary
      
      - name: prod-master-03
        vmId: 8003
        ip: 10.0.0.13
        cores: 8
        memory: 16384
        disk: 100G
        tags:
          - critical
          - secondary
    
    workers:
      - name: prod-worker-gpu-01
        vmId: 8101
        ip: 10.0.0.21
        cores: 16
        memory: 65536
        disk: 200G
        tags:
          - gpu
          - ml-workloads
        gpu:
          type: passthrough
          device: "0000:81:00.0"
      
      - name: prod-worker-storage-01
        vmId: 8102
        ip: 10.0.0.22
        cores: 8
        memory: 32768
        disk: 100G
        storagePool: fast-nvme
        tags:
          - storage
          - database
        additionalDisks:
          - size: 1T
            storagePool: bulk-storage
            purpose: database-data
          - size: 500G
            storagePool: fast-nvme
            purpose: database-logs
```

### Multi-Cluster Configuration

```yaml
version: "1.0"

clusters:
  production:
    masters:
      - name: prod-master-01
        vmId: 8001
        ip: 10.0.0.11
    workers:
      - name: prod-worker-01
        vmId: 8101
        ip: 10.0.0.21
  
  staging:
    network:
      subnet: 10.1.0.0/24
    masters:
      - name: staging-master-01
        vmId: 9001
        ip: 10.1.0.11
    workers:
      - name: staging-worker-01
        vmId: 9101
        ip: 10.1.0.21
```

## Validation Command

```bash
# Validate hosts configuration
npm run validate-hosts -- --file hosts.yaml

# Example output for valid config:
✅ Hosts configuration is valid

Summary:
- Clusters: 1
- Total Masters: 3
- Total Workers: 5
- Total Infrastructure: 0

# Example output for invalid config:
❌ Validation failed:
  - clusters.homelab.masters[0].vmId: must be greater than or equal to 100
  - clusters.homelab.workers[1].ip: must be a valid ip address
```

## Migration from Environment Variables

To migrate from the current environment-based configuration:

1. Run the migration helper:
   ```bash
   npm run generate-hosts-config > hosts.yaml
   ```

2. Review and customize the generated file

3. Test with validation:
   ```bash
   npm run validate-hosts -- --file hosts.yaml
   ```

4. Deploy using the new configuration:
   ```bash
   pulumi up
   ```

## Best Practices

1. **Naming Conventions**
   - Use descriptive names: `k8s-master-01`, not `vm1`
   - Include role in name: `prod-worker-gpu-01`
   - Use consistent numbering: `01`, `02`, not `1`, `2`

2. **IP Address Management**
   - Reserve ranges for different roles
   - Document allocations in comments
   - Leave gaps for expansion

3. **VM ID Allocation**
   - 8000-8099: Production masters
   - 8100-8199: Production workers
   - 9000-9099: Staging masters
   - 9100-9199: Staging workers

4. **Resource Allocation**
   - Right-size for workloads
   - Use consistent specs for same roles
   - Document special requirements

5. **Tagging Strategy**
   - Role: `master`, `worker`
   - Workload: `gpu`, `database`, `web`
   - Priority: `critical`, `standard`
   - Environment: `production`, `staging`

## Future Enhancements

### Planned Features

1. **Template Selection**
   ```yaml
   - name: ubuntu-vm-01
     template: ubuntu-22.04  # Future: custom OS templates
   ```

2. **Multi-Provider Support**
   ```yaml
   clusters:
     hybrid:
       provider: aws
       region: us-east-1
   ```

3. **Advanced Networking**
   ```yaml
   - name: multi-nic-vm
     networks:
       - interface: eth0
         bridge: vmbr0
         ip: 192.168.1.100
       - interface: eth1
         bridge: vmbr1
         ip: 10.0.0.100
   ```

### Version History

- **1.0** (Current): Initial hosts configuration with Kubernetes focus
- **1.1** (Planned): Infrastructure VM support
- **1.2** (Planned): Multi-provider support
- **2.0** (Future): Advanced networking and template management