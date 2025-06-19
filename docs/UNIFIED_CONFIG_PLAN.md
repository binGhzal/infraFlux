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

### Pure Ansible Declarative System

**Single Command Deployment:**
```bash
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all
```

### Phase 1: Prerequisites & Validation
1. Check required binaries (talosctl, kubectl, helm)
2. Test Proxmox connectivity
3. Load environment variables from `config/.env`
4. Validate configuration structure

### Phase 2: Configuration Generation  
1. Apply environment-specific defaults (dev/staging/prod)
2. Generate Talos secrets with talosctl
3. Render Talos configs with Jinja2 templates
4. Generate Terraform with stable provider (v3.0.1-rc9)

### Phase 3: Infrastructure Deployment
1. Initialize Terraform with Proxmox provider
2. Create VMs with environment-appropriate settings
3. Bootstrap Talos cluster automatically
4. Install Cilium and core applications
5. Validate cluster health

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

### 1. **Configuration System** ✅ COMPLETED
- [x] Create unified `config/cluster.yaml`
- [x] Design environment-aware defaults
- [x] Implement pure Ansible declarative system
- [x] Add validation and configuration processing
- [x] Cross-platform deployment support

### 2. **Secret Management** ✅ COMPLETED
- [x] Implement runtime environment variable system
- [x] Create secure secret loading with `config/.env`
- [x] Update deployment to use environment variables
- [x] Test secret management in deployment pipeline

### 3. **Automation Engine** ✅ COMPLETED
- [x] Environment-aware resource allocation (dev/staging/prod)
- [x] Automatic Talos configuration generation
- [x] Pure Ansible template rendering
- [x] Intelligent defaults for Proxmox settings

### 4. **Modern Infrastructure** ✅ COMPLETED
- [x] Update to Terraform Proxmox provider v3.0.1-rc9 (stable)
- [x] Optimize VM configurations with environment awareness
- [x] Implement latest Talos v1.10.0 best practices
- [x] Add comprehensive error handling and logging

### 5. **Validation & Testing** ✅ COMPLETED
- [x] Comprehensive deployment testing
- [x] Real infrastructure validation with actual Proxmox
- [x] Cross-platform testing (Linux/macOS/Windows)
- [x] Complete documentation updates

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

## 🚀 Current Status: COMPLETED ✅

The unified configuration system has been **fully implemented and tested**:

### ✅ **Ready for Production Use**
- Pure Ansible declarative deployment system
- Environment-aware configuration with intelligent defaults
- Real infrastructure testing completed successfully
- Cross-platform support (Linux/macOS/Windows)
- Comprehensive error handling and validation

### 🎯 **Immediate Usage**
```bash
# Clone and setup
git clone <repo>
cd infraFlux
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Configure
cp config/cluster.yaml.example config/cluster.yaml
# Edit cluster.yaml with your Proxmox IP
cp config/.env.template config/.env
# Add your secrets to .env

# Deploy
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all
```

### 🔮 **Future Enhancements** (Optional)
- Advanced monitoring stack integration
- Multi-cloud provider support  
- Enhanced GitOps workflows
- Enterprise security features

## 📝 Current System Architecture

### Pure Ansible Declarative Approach
```bash
# Unified configuration - everything in one place
config/cluster.yaml                 # Single source of truth
config/.env                        # Runtime secrets only

# Pure Ansible deployment - no shell scripts
playbooks/main.yml                 # Main orchestration
playbooks/tasks/                   # Modular task definitions
playbooks/templates/               # Jinja2 configuration templates
```

### Key Features Implemented
✅ **Environment-aware defaults** - Development uses minimal resources, production scales automatically  
✅ **Cross-platform compatibility** - Same commands work on Linux/macOS/Windows  
✅ **Intelligent automation** - Auto-detects Proxmox settings and generates optimal configurations  
✅ **Production security** - TLS configuration, secure secret management  
✅ **Real infrastructure testing** - Validated against actual Proxmox deployment  

This system represents a **completed implementation** of simplicity, automation, and intelligence while maintaining full flexibility for production deployments.