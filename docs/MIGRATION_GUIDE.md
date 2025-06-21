# InfraFlux Migration Guide: Count-Based to Hosts-Based Configuration

## Overview

This guide helps you migrate from the current environment variable count-based configuration to the new hosts-based YAML configuration system. The new system provides explicit control over each VM while maintaining backward compatibility during the transition.

## Why Migrate?

### Current Limitations (Count-Based)
- Sequential IP assignment with no individual control
- Same specs for all VMs of a type
- Limited flexibility for heterogeneous hardware
- No support for custom tags or metadata
- Difficult to track specific VMs

### New Benefits (Hosts-Based)
- Explicit control over each VM's configuration
- Support for different hardware specs per VM
- Custom IP assignments and naming
- Flexible tagging system
- Easy to extend for non-Kubernetes VMs
- Better documentation of infrastructure

## Migration Steps

### Step 1: Generate Initial Hosts Configuration

Run the migration helper to create a starting point:

```bash
# Generate hosts.yaml from current environment variables
npm run generate-hosts-config > hosts.yaml

# Or use the built-in helper function in your deployment
pulumi up --yes  # This will auto-generate if hosts.yaml doesn't exist
```

### Step 2: Review Generated Configuration

The generated file will look like this based on your env variables:

```yaml
# Generated from:
# K8S_MASTER_COUNT=1
# K8S_WORKER_COUNT=3
# K8S_MASTER_CORES=2
# K8S_MASTER_MEMORY=4096
# K8S_WORKER_CORES=2
# K8S_WORKER_MEMORY=4096

version: "1.0"
clusters:
  homelab:
    network:
      gateway: 192.168.1.1
      subnet: 192.168.1.0/24
      bridge: vmbr0
    masters:
      - name: k8s-master-01
        vmId: 8000
        ip: 192.168.1.200
        cores: 2
        memory: 4096
        disk: 30G
        tags: ["master", "control-plane"]
    workers:
      - name: k8s-worker-01
        vmId: 8100
        ip: 192.168.1.210
        cores: 2
        memory: 4096
        disk: 50G
        tags: ["worker"]
      - name: k8s-worker-02
        vmId: 8101
        ip: 192.168.1.211
        cores: 2
        memory: 4096
        disk: 50G
        tags: ["worker"]
      - name: k8s-worker-03
        vmId: 8102
        ip: 192.168.1.212
        cores: 2
        memory: 4096
        disk: 50G
        tags: ["worker"]
```

### Step 3: Customize Your Configuration

Now you can customize individual VMs:

```yaml
version: "1.0"

# Add global defaults
defaults:
  domain: homelab.local
  dns:
    - 1.1.1.1
    - 1.0.0.1
  storagePool: local-lvm

clusters:
  homelab:
    network:
      gateway: 192.168.1.1
      subnet: 192.168.1.0/24
      bridge: vmbr0
    
    masters:
      - name: k8s-master-01
        vmId: 8001
        ip: 192.168.1.201
        cores: 4          # Increased for production
        memory: 8192      # More memory for master
        disk: 50G         # Larger disk
        tags:
          - production
          - critical
    
    workers:
      # GPU Worker
      - name: k8s-worker-gpu-01
        vmId: 8101
        ip: 192.168.1.211
        cores: 8          # More cores for GPU workloads
        memory: 32768     # 32GB for ML tasks
        disk: 200G
        tags:
          - gpu
          - ml-workloads
          - high-performance
      
      # General Purpose Workers
      - name: k8s-worker-general-01
        vmId: 8102
        ip: 192.168.1.212
        cores: 4
        memory: 8192
        disk: 100G
        tags:
          - general
          - web-workloads
      
      - name: k8s-worker-general-02
        vmId: 8103
        ip: 192.168.1.213
        cores: 4
        memory: 8192
        disk: 100G
        tags:
          - general
          - web-workloads
      
      # Storage-Optimized Worker
      - name: k8s-worker-storage-01
        vmId: 8104
        ip: 192.168.1.214
        cores: 6
        memory: 16384
        disk: 50G
        storagePool: fast-ssd  # Override default
        tags:
          - storage
          - database
        additionalDisks:
          - size: 500G
            storagePool: bulk-storage
            purpose: persistent-volumes
```

### Step 4: Validate Your Configuration

Before deploying, validate the configuration:

```bash
# Validate syntax and schema
npm run validate-hosts -- --file hosts.yaml

# Check for common issues
npm run check-hosts-config

# Example validation output:
✅ Hosts configuration is valid

Summary:
- Clusters: 1
- Total Masters: 1
- Total Workers: 4
- Unique IPs: ✓ All IPs are unique
- VM ID Conflicts: ✓ No conflicts
- Network Range: ✓ All IPs within subnet
```

### Step 5: Test Deployment

Test with a dry run first:

```bash
# Preview changes without applying
pulumi preview

# Check what will be created/modified
pulumi up --diff
```

### Step 6: Deploy

Deploy your infrastructure:

```bash
# Deploy with the new configuration
pulumi up

# Monitor the deployment
pulumi stack output
```

## Backward Compatibility

### Automatic Fallback

InfraFlux automatically falls back to environment variables if `hosts.yaml` doesn't exist:

```typescript
// In src/index.ts
const hostsConfig = fs.existsSync('./hosts.yaml')
  ? new HostsConfigLoader('hosts-config', { configPath: './hosts.yaml' }).config
  : generateHostsFromEnv();  // Converts env vars to hosts format
```

### Gradual Migration

You can migrate gradually:

1. **Phase 1**: Continue using env vars while testing hosts.yaml
   ```bash
   # Rename hosts.yaml temporarily
   mv hosts.yaml hosts.yaml.testing
   
   # Deploy with env vars
   pulumi up
   ```

2. **Phase 2**: Use hosts.yaml for new clusters
   ```yaml
   clusters:
     # Existing cluster from env vars
     homelab:
       # ... generated config
     
     # New cluster with custom config
     development:
       masters:
         - name: dev-master-01
           vmId: 9001
           ip: 192.168.2.201
   ```

3. **Phase 3**: Fully migrate to hosts.yaml
   ```bash
   # Remove old env vars from .env
   # Use only hosts.yaml
   pulumi up
   ```

## Configuration Mapping

### Environment Variables to Hosts Config

| Environment Variable | Hosts Config Location | Notes |
|---------------------|----------------------|-------|
| `K8S_MASTER_COUNT` | `clusters.[name].masters[]` | Array length |
| `K8S_WORKER_COUNT` | `clusters.[name].workers[]` | Array length |
| `K8S_MASTER_CORES` | `masters[].cores` | Per-host override |
| `K8S_MASTER_MEMORY` | `masters[].memory` | Per-host override |
| `K8S_MASTER_DISK` | `masters[].disk` | Per-host override |
| `K8S_WORKER_CORES` | `workers[].cores` | Per-host override |
| `K8S_WORKER_MEMORY` | `workers[].memory` | Per-host override |
| `K8S_WORKER_DISK` | `workers[].disk` | Per-host override |
| `NETWORK_GATEWAY` | `clusters.[name].network.gateway` | Can be auto-discovered |
| `NETWORK_SUBNET` | `clusters.[name].network.subnet` | Can be auto-discovered |
| `NETWORK_BRIDGE` | `clusters.[name].network.bridge` | Default: vmbr0 |
| `NETWORK_DNS` | `defaults.dns` | Comma-separated → array |
| `VM_STORAGE_POOL` | `defaults.storagePool` | Per-host override |

## Common Migration Scenarios

### Scenario 1: Simple Count-Based Migration

**Before** (.env):
```env
K8S_MASTER_COUNT=3
K8S_WORKER_COUNT=5
```

**After** (hosts.yaml):
```yaml
clusters:
  homelab:
    masters:
      - name: k8s-master-01
        vmId: 8001
        ip: 192.168.1.201
      - name: k8s-master-02
        vmId: 8002
        ip: 192.168.1.202
      - name: k8s-master-03
        vmId: 8003
        ip: 192.168.1.203
    workers:
      # ... 5 worker definitions
```

### Scenario 2: Mixed Hardware Migration

**Before** (all workers identical):
```env
K8S_WORKER_COUNT=3
K8S_WORKER_CORES=4
K8S_WORKER_MEMORY=8192
```

**After** (customized per workload):
```yaml
workers:
  - name: k8s-worker-gpu-01
    cores: 8
    memory: 32768
    tags: ["gpu", "ml"]
  
  - name: k8s-worker-web-01
    cores: 2
    memory: 4096
    tags: ["web", "frontend"]
  
  - name: k8s-worker-db-01
    cores: 6
    memory: 16384
    tags: ["database", "storage"]
```

### Scenario 3: Adding Infrastructure VMs

**Before** (Kubernetes only):
```env
K8S_MASTER_COUNT=1
K8S_WORKER_COUNT=2
```

**After** (Kubernetes + Infrastructure):
```yaml
clusters:
  homelab:
    masters: [...]
    workers: [...]
    infrastructure:
      - name: postgres-01
        vmId: 8201
        ip: 192.168.1.221
        type: database
        cores: 4
        memory: 16384
      
      - name: monitoring-01
        vmId: 8202
        ip: 192.168.1.222
        type: monitoring
        cores: 2
        memory: 4096
```

## Troubleshooting

### Common Issues

1. **Validation Errors**
   ```
   ❌ Validation failed:
   - clusters.homelab.masters[0].vmId: must be greater than or equal to 100
   ```
   **Solution**: Check VM IDs are in valid range (100-999999)

2. **IP Conflicts**
   ```
   ❌ Duplicate IP address: 192.168.1.201 used by k8s-master-01 and k8s-worker-01
   ```
   **Solution**: Ensure all IPs are unique

3. **Missing Required Fields**
   ```
   ❌ Validation failed:
   - clusters.homelab.masters[0].ip: is required
   ```
   **Solution**: Add all required fields (name, vmId, ip)

4. **Invalid YAML Syntax**
   ```
   ❌ YAML parsing failed: bad indentation of a mapping entry
   ```
   **Solution**: Check YAML indentation (use spaces, not tabs)

### Validation Tools

```bash
# Full validation
npm run validate-hosts

# Quick syntax check
npm run yaml-lint hosts.yaml

# Check for conflicts
npm run check-ip-conflicts hosts.yaml
npm run check-vmid-conflicts hosts.yaml

# Generate report
npm run hosts-report
```

## Rollback Procedure

If you need to rollback to environment variables:

1. **Save Current State**
   ```bash
   cp hosts.yaml hosts.yaml.backup
   pulumi stack export > stack-backup.json
   ```

2. **Remove Hosts File**
   ```bash
   mv hosts.yaml hosts.yaml.disabled
   ```

3. **Restore Environment Variables**
   ```bash
   # Ensure .env has all required variables
   source .env
   ```

4. **Deploy with Env Vars**
   ```bash
   pulumi up
   ```

## Best Practices for Migration

1. **Start Small**: Migrate one cluster at a time
2. **Version Control**: Commit hosts.yaml to Git
3. **Document Changes**: Add comments explaining custom configurations
4. **Test Thoroughly**: Use `pulumi preview` before applying
5. **Monitor Deployment**: Watch logs during migration
6. **Keep Backups**: Export Pulumi state before major changes

## Next Steps

After successful migration:

1. **Remove Old Variables**: Clean up .env file
2. **Update Documentation**: Document your infrastructure layout
3. **Plan Expansions**: Add new VMs as needed
4. **Implement Automation**: Use Git workflows for changes
5. **Enable Monitoring**: Track your customized infrastructure

## Support

For migration assistance:
- Check logs: `pulumi logs`
- Review state: `pulumi stack`
- Validate config: `npm run validate-hosts`
- Open issues on GitHub with your configuration (sanitize sensitive data)