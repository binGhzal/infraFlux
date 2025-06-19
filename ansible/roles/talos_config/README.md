# Talos Configuration Generator

This role generates Talos Linux configurations for Kubernetes clusters with node-specific customization, validation, and automated bootstrap capabilities.

## Overview

The Talos Configuration Generator provides comprehensive cluster configuration management including:

- Dynamic configuration generation using `talosctl gen config`
- Node-specific patches for networking, storage, and system settings
- Configuration validation and syntax checking
- Automated cluster bootstrap process
- Configuration bundling for deployment
- Backup and recovery capabilities

## Features

### Configuration Generation
- Base cluster configuration using talosctl
- Node-specific customization via patches
- Support for custom install disks, networking, and storage
- Cluster-wide security and feature configuration

### Validation & Testing
- Syntax validation of all generated configurations
- Connectivity testing to cluster endpoints
- Dry-run configuration application
- Comprehensive validation reporting

### Bootstrap Automation
- Automated cluster bootstrap process
- Sequential node configuration application
- Health monitoring and readiness checks
- Kubeconfig generation

### Deployment Support
- Configuration bundling with deployment scripts
- Detailed deployment instructions
- Node mapping and inventory files
- Automated and manual deployment options

## Configuration

### Required Variables

The role requires access to global cluster configuration:

```yaml
cluster:
  name: "my-cluster"
  talos:
    version: "v1.5.3"
    kubernetes_version: "v1.28.2"
    networking:
      cluster_endpoint: "cluster.example.com"
      pod_subnet: "10.244.0.0/16"
      service_subnet: "10.96.0.0/12"
      dns_domain: "cluster.local"
```

### Role Configuration

```yaml
talos_config:
  generate_configs: true
  output_directory: "{{ playbook_dir }}/generated/talos"
  config_version: "v1alpha1"
  validate_configs: true

bootstrap:
  enabled: true
  bootstrap_node: "{{ groups['control_plane'][0] }}"
  wait_for_cluster: true
  timeout: 600

config_generation:
  force_regenerate: false
  generate_patches: true
  generate_secrets: true
  bundle_configs: true
```

## Usage

### Basic Usage

```yaml
- name: "Generate Talos configurations"
  include_role:
    name: talos_config
```

### Configuration Only (No Bootstrap)

```yaml
- name: "Generate configurations without bootstrap"
  include_role:
    name: talos_config
  vars:
    bootstrap:
      enabled: false
```

### Force Regeneration

```yaml
- name: "Force regenerate all configurations"
  include_role:
    name: talos_config
  vars:
    config_generation:
      force_regenerate: true
```

## Node Customization

### Network Configuration

```yaml
# In inventory host_vars
network_interface: "eth0"
network_prefix: "24"
gateway: "192.168.1.1"
dns_servers:
  - "8.8.8.8"
  - "1.1.1.1"
```

### Storage Configuration

```yaml
# For worker nodes with Longhorn
storage:
  type: "longhorn"
  dedicated_disks:
    - device: "/dev/sdb"
      mountpoint: "/var/lib/longhorn"
      format: "ext4"
```

### Node Labels and Taints

```yaml
node_labels:
  node-type: "compute"
  storage: "ssd"

node_taints:
  - key: "node-type"
    value: "gpu"
    effect: "NoSchedule"
```

### System Configuration

```yaml
install_disk: "/dev/nvme0n1"
extra_kernel_args:
  - "console=ttyS0"
sysctls:
  vm.max_map_count: 262144
extra_mounts:
  - device: "/dev/sdb"
    mountpoint: "/opt/data"
    format: "ext4"
```

## Generated Files

### Core Configuration Files
- `talosconfig` - Talos client configuration
- `controlplane.yaml` - Base control plane configuration
- `worker.yaml` - Base worker configuration
- `secrets.yaml` - Cluster secrets (if generated)

### Node-Specific Configurations
- `controlplane/<hostname>.yaml` - Per-node control plane configs
- `worker/<hostname>.yaml` - Per-node worker configs

### Patch Files
- `patches/<hostname>_*.yaml` - Node-specific patches
- `patches/cluster_*.yaml` - Cluster-wide patches

### Deployment Bundle
- `<cluster>_talos_configs_<date>.tar.gz` - Complete deployment bundle
- `bundle/deploy_configs.sh` - Automated deployment script
- `bundle/DEPLOYMENT_INSTRUCTIONS.md` - Manual deployment guide
- `bundle/node_mapping.json` - Node inventory mapping

### Reports and Validation
- `validation_report.json` - Configuration validation results
- `bootstrap_summary.json` - Bootstrap process results
- `bundle_manifest.json` - Bundle contents manifest

## Patch System

The role uses a comprehensive patch system for node customization:

### Installation Disk Patch
```yaml
machine:
  install:
    disk: /dev/nvme0n1
```

### Network Configuration Patch
```yaml
machine:
  network:
    hostname: node01
    interfaces:
      - interface: eth0
        addresses:
          - 192.168.1.100/24
        routes:
          - network: 0.0.0.0/0
            gateway: 192.168.1.1
```

### Cluster Security Patch
```yaml
cluster:
  apiServer:
    extraArgs:
      audit-policy-file: /etc/kubernetes/audit-policy.yaml
      encryption-provider-config: /etc/kubernetes/encryption-config.yaml
```

## Bootstrap Process

The automated bootstrap follows this sequence:

1. **Apply Control Plane Configurations**
   - Apply configs to all control plane nodes
   - Wait for nodes to become ready

2. **Bootstrap Cluster**
   - Bootstrap on designated bootstrap node
   - Wait for etcd and API server

3. **Generate Kubeconfig**
   - Extract kubeconfig from cluster
   - Test cluster connectivity

4. **Apply Worker Configurations**
   - Apply configs to all worker nodes
   - Wait for nodes to join cluster

5. **Final Validation**
   - Check cluster health
   - Verify all nodes are ready

## Validation

### Configuration Validation
- YAML syntax checking
- Talos schema validation
- Cross-reference validation

### Connectivity Testing
- Cluster endpoint accessibility
- Node reachability testing
- API server health checks

### Deployment Testing
- Dry-run configuration application
- Bootstrap readiness verification
- Cluster formation validation

## Security Features

### Encryption
- Automatic disk encryption setup
- Kubernetes secrets encryption
- Secure certificate generation

### Network Security
- Pod security standards configuration
- Network policy support preparation
- Audit logging configuration

### Access Control
- RBAC preparation
- Service account configuration
- Certificate authority management

## Error Handling

### Configuration Errors
- Comprehensive validation reporting
- Clear error messages with remediation
- Rollback capabilities

### Bootstrap Failures
- Automatic retry mechanisms
- Health check monitoring
- State preservation on failure

### Recovery Options
- Configuration backup system
- Emergency access procedures
- Cluster reconstruction guides

## Best Practices

### Configuration Management
1. Use version control for configurations
2. Test in staging environments
3. Backup configurations before changes
4. Document custom patches

### Bootstrap Process
1. Verify infrastructure readiness
2. Check network connectivity
3. Monitor bootstrap process
4. Validate cluster health

### Security
1. Rotate certificates regularly
2. Enable audit logging
3. Use disk encryption
4. Implement network policies

## Troubleshooting

### Common Issues

**Configuration Generation Fails**
- Check talosctl installation
- Verify cluster configuration syntax
- Check file permissions

**Bootstrap Hangs**
- Verify network connectivity
- Check time synchronization
- Monitor etcd health

**Nodes Don't Join**
- Check firewall rules
- Verify configuration application
- Check cluster token validity

### Debug Commands

```bash
# Check node status
talosctl --talosconfig talosconfig --nodes <NODE_IP> health

# View logs
talosctl --talosconfig talosconfig --nodes <NODE_IP> logs

# Get configuration
talosctl --talosconfig talosconfig --nodes <NODE_IP> get machineconfig

# Check cluster health
kubectl --kubeconfig kubeconfig get nodes
```

## Integration

This role integrates with:
- **infraflux_orchestrator** - Master orchestration workflow
- **terraform_generator** - Infrastructure provisioning
- **Proxmox** - Virtualization platform
- **Ansible Vault** - Secrets management

## Contributing

When extending this role:
1. Maintain patch system compatibility
2. Add validation for new features
3. Update documentation
4. Follow security best practices
5. Test bootstrap scenarios