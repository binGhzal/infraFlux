# InfraFlux v2.0 - Unified Configuration Plan

## 🎯 Vision: Radically Simplified Infrastructure Deployment

**Goal**: Create the simplest possible Kubernetes deployment system with maximum automation and intelligent defaults.

## 📋 Design Principles

### 1. **Single Source of Truth**
- One `config/cluster.yaml` file contains ALL configuration
- Environment-aware intelligent defaults
- Manual override capability for power users
- Auto-detection of infrastructure capabilities

### 2. **Zero-Config Secret Management**
- Sealed secrets for commitable encrypted secrets
- Runtime environment variables only for truly dynamic values
- Automatic secret distribution and rotation
- Safe to commit to Git

### 3. **Intelligent Automation**
- Auto-detect Proxmox capabilities (nodes, storage, networks)
- Auto-calculate IP ranges from gateway detection
- Auto-size VMs based on environment (dev/staging/prod)
- Auto-select latest stable versions of all components
- Auto-configure networking and security policies

### 4. **Environment-Aware Configuration**
- **Development**: Minimal resources, relaxed security, single nodes
- **Staging**: Medium resources, moderate security, small HA
- **Production**: Full resources, hardened security, full HA

## 🏗️ New Architecture

### Configuration Structure
```yaml
# config/cluster.yaml - Everything in one file
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: my-cluster
  environment: development  # Drives all defaults

spec:
  # Smart defaults for everything
  # Override anything as needed
```

### Secret Management
```yaml
# config/secrets.yaml - Sealed secrets (safe to commit)
apiVersion: v1
kind: Secret  
# Encrypted with kubeseal - safe to commit
```

### Minimal Runtime Environment
```bash
# config/.env - Only runtime overrides
DEBUG="false"
# Everything else auto-detected or from sealed secrets
```

## 🤖 Automation Features

### 1. **Infrastructure Auto-Detection**
```yaml
# Automatically discovers:
proxmox:
  node: "{{ proxmox_auto_node }}"        # Detects primary node
  storage: "{{ proxmox_auto_storage }}"  # Finds largest storage pool
  bridge: "{{ proxmox_auto_bridge }}"    # Detects default bridge

network:
  gateway: "{{ ansible_default_ipv4.gateway }}"  # System gateway
  ip_range: "{{ gateway_network }}.10-50"        # Auto-calculate IPs
```

### 2. **Environment-Aware Sizing**
```yaml
# Development: Minimal resources
control_plane:
  count: 1
  cpu: 2
  memory: 2048

# Production: Full HA
control_plane:
  count: 3
  cpu: 4  
  memory: 4096
```

### 3. **Version Management**
```yaml
versions:
  talos: latest      # Auto-resolves to latest stable
  kubernetes: latest # Auto-resolves to latest stable
  cilium: latest     # Auto-resolves to latest stable
```

### 4. **Security Automation**
```yaml
# Development: Easy debugging
security:
  pod_security: baseline
  network_policies: false
  tls_insecure: true

# Production: Hardened
security:
  pod_security: restricted  
  network_policies: true
  tls_insecure: false
```

## 🔄 Deployment Workflow

### Phase 1: Smart Discovery
1. Auto-detect Proxmox capabilities
2. Auto-detect network configuration
3. Auto-resolve latest versions
4. Validate configuration

### Phase 2: Configuration Generation
1. Apply environment-specific defaults
2. Process user overrides
3. Generate Talos configs with Jinja2
4. Generate Terraform with latest provider (v3.0.2-rc01)

### Phase 3: Infrastructure Deployment
1. Create VMs with optimal settings
2. Bootstrap Talos cluster
3. Install applications based on environment
4. Validate deployment

## 📊 Configuration Examples

### Minimal Development Setup
```yaml
# Only required field - everything else auto-detected
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: dev-cluster
  environment: development
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"  # Only required field!
```

### Production Override Example
```yaml
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: prod-cluster
  environment: production
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"
  
  # Override defaults for production
  overrides:
    nodes:
      control_plane:
        count: 5  # More than default 3
        resources:
          cpu: 8  # More than default 4
    
    applications:
      monitoring:
        enabled: true
        retention: "30d"  # Longer retention
```

## 🔧 Implementation Plan

### 1. **Configuration System** ✅ Started
- [x] Create unified `config/cluster.yaml`
- [x] Design environment-aware defaults
- [ ] Implement auto-detection logic
- [ ] Add validation and override processing

### 2. **Secret Management** 🔄 Next
- [ ] Implement sealed secrets system
- [ ] Create secret generation tooling
- [ ] Update deployment to use sealed secrets
- [ ] Test secret rotation

### 3. **Automation Engine** 🔄 Planned
- [ ] Proxmox auto-detection
- [ ] Network configuration automation
- [ ] Version resolution system
- [ ] Environment-aware resource allocation

### 4. **Modern Infrastructure** 🔄 Planned
- [ ] Update to Terraform Proxmox provider v3.0.2-rc01
- [ ] Optimize VM configurations
- [ ] Implement latest Talos best practices
- [ ] Add monitoring and observability

### 5. **Validation & Testing** 🔄 Final
- [ ] Comprehensive deployment testing
- [ ] Multi-environment validation
- [ ] Performance optimization
- [ ] Documentation updates

## 📈 Success Metrics

### User Experience
- **Setup Time**: < 5 minutes from clone to cluster
- **Configuration**: Single file, minimal required fields  
- **Automation**: 90%+ zero-config deployment
- **Documentation**: Complete examples for all scenarios

### Technical Excellence
- **Security**: Production-hardened by default
- **Reliability**: Self-healing and validated deployments
- **Performance**: Optimized for each environment
- **Maintainability**: Clear upgrade and migration paths

## 🚀 Next Steps

1. **Immediate** (Today):
   - Implement sealed secrets
   - Add auto-detection logic
   - Update Terraform provider

2. **Short-term** (This Week):
   - Complete automation features
   - Full deployment testing
   - Documentation updates

3. **Medium-term** (Next Sprint):
   - Advanced features (monitoring, GitOps)
   - Multi-cloud support
   - Enterprise features

## 📝 Migration Guide

### From Current System
```bash
# Old way - multiple config files, complex setup
config/test-cluster-config.yaml     # Environment config
config/production-config.yaml       # Production config  
config/.env                         # All secrets

# New way - unified, automated
config/cluster.yaml                 # Everything
config/.env                        # Runtime only
```

### Migration Steps
1. Run migration tool: `./scripts/migrate-config.sh`
2. Review generated `config/cluster.yaml`
3. Test with: `./deploy.sh config/cluster.yaml`
4. Commit new configuration

This plan represents a fundamental shift toward simplicity, automation, and intelligence while maintaining the flexibility needed for production deployments.