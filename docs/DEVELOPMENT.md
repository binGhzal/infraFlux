# Claude.md - InfraFlux v2.0 Development Guidelines

## 🎯 **Strategic Overview**

InfraFlux v2.0 is a **next-generation immutable Kubernetes platform** built on Talos Linux, representing a complete architectural transformation from traditional mutable infrastructure to a modern, secure, and automated deployment system.

## 📋 **Core Architecture Documents**

### **Primary Planning Documents**

- **Talos Architecture** @docs/plan/TALOS_ARCHITECTURE.md - Core Talos infrastructure design with 24 detailed implementation tasks
- **GitOps Workflow** @docs/plan/GITOPS_WORKFLOW.md - Complete GitOps automation using Flux v2 with 20 tasks
- **Deployment System** @docs/plan/DEPLOYMENT_SYSTEM.md - Automated deployment pipeline with 16 tasks
- **Configuration Management** @docs/plan/CONFIGURATION_MANAGEMENT.md - Single-source configuration system with 18 tasks
- **Security Framework** @docs/plan/SECURITY_FRAMEWORK.md - Zero-trust security model with 14 tasks

### **Supporting Documentation**

- **README** @README.md - Project overview and quick start guide for InfraFlux v2.0
- **Architecture** @docs/ARCHITECTURE.md - Complete system architecture documentation
- **Completion Status** @docs/plan/INFRAFLUX_V2_COMPLETION_STATUS.md - Production readiness and deployment guide
- **Legacy Plans** @docs/plan/PLAN.md - Original restructuring plan (reference only)

## ✅ **PROJECT STATUS: PRODUCTION READY**

**InfraFlux v2.0 is complete and ready for deployment!**

- **🚀 All Core Tasks**: 9/9 critical and high-priority tasks completed
- **🔒 Security Hardened**: Enterprise-grade security features implemented
- **⚡ Performance Optimized**: Production-ready performance enhancements
- **🔄 GitOps Ready**: Complete Flux v2 automation and workflows
- **📊 Fully Validated**: Comprehensive testing and validation framework
- **📚 Documented**: Complete documentation and deployment guides

**Quick Start**: Run `./deploy.sh` to deploy your immutable Kubernetes platform!

## 🏗️ **Architectural Transformation**

### **From Legacy to Modern**

```
BEFORE (Legacy):
Packer → Ubuntu VMs → Ansible OS Config → K3s Install → Manual App Deploy
(Complex)  (Mutable)   (Imperative)      (Manual)     (Error-Prone)

AFTER (v2.0):
Config → Talos VMs → Cluster Bootstrap → Flux GitOps → Automated Apps
(Simple) (Immutable)  (Declarative)     (Automated)   (Reliable)
```

### **Key Technology Decisions**

1. **Talos Linux Foundation**: Immutable OS designed specifically for Kubernetes
2. **API-Only Operations**: Zero SSH access, all management via secure APIs
3. **GitOps-First**: Flux v2 manages all application lifecycles
4. **Single Configuration Source**: Master config drives entire platform
5. **Zero-Trust Security**: Comprehensive security at every layer

## 💡 **Development Approach**

### **Personal Methodology**

- **Deep Analysis**: Thoroughly analyze every task and its dependencies before implementation
- **Immutable Mindset**: Design for immutability and declarative management
- **Security-First**: Consider security implications in every design decision
- **Automation-Driven**: Eliminate manual processes wherever possible
- **Testing-Focused**: Implement comprehensive validation at every step

### **Implementation Priorities**

1. **Phase 1 (Critical)**: Talos infrastructure foundation
2. **Phase 2 (High)**: GitOps workflow and deployment automation
3. **Phase 3 (Medium)**: Security framework and operations procedures
4. **Phase 4 (Low)**: Documentation and user experience enhancements

## 🔧 **Technical Guidelines**

### **Configuration Management**

- **Single Source of Truth**: `config/cluster.yaml` drives everything
- **Template-Driven**: Jinja2 templates generate all platform configurations
- **Environment-Aware**: Support for dev/staging/production with inheritance
- **Validation-First**: Comprehensive validation before any deployment

### **Security Standards**

- **Zero SSH Access**: API-only operations with certificate authentication
- **Least Privilege**: Minimal permissions for all users and services
- **Immutable Infrastructure**: Leverage Talos immutability for security
- **Secret Management**: Sealed secrets for GitOps-safe secret handling

### **Deployment Standards**

- **One-Command Deployment**: `./deploy.sh` handles complete infrastructure
- **Phase-Based Execution**: Logical phases with dependencies and validation
- **Rollback Capability**: Automatic rollback on failures
- **Progress Monitoring**: Real-time feedback and detailed logging

### **Code Organization**

```
infraFlux/
├── config/                    # Single source of truth
│   └── cluster.yaml   # Master configuration
├── templates/                 # Jinja2 templates for all configs
│   ├── talos/                # Talos machine configurations
│   ├── terraform/            # Infrastructure provisioning
│   ├── flux/                 # GitOps configurations
│   └── security/             # Security policies
├── playbooks/                 # Pure Ansible deployment system
├── docs/plan/                 # Detailed implementation plans
└── deploy.sh                  # Unified deployment entry point
```

## 🎮 **Essential Commands**

### **Core Deployment**

```bash
# Complete platform deployment
./deploy.sh

# Phase-specific deployment
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=infrastructure # Talos VMs only
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all          # GitOps bootstrap only
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all    # Applications only

# Configuration management
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=config --check
```

### **Talos Operations**

```bash
# Cluster management (via talosctl)
talosctl health --wait
talosctl kubeconfig
talosctl dashboard

# No SSH commands - everything via API
```

### **GitOps Operations**

```bash
# Flux management
flux reconcile source git infraflux
flux get all
flux logs --follow

# Application deployment via Git commits only
```

## 🎯 **Success Metrics**

### **Technical Excellence**

- ✅ **Deployment Time**: < 15 minutes from zero to full cluster
- ✅ **Configuration Simplicity**: < 100 lines for basic cluster config
- ✅ **Security Posture**: Zero SSH access, all operations via APIs
- ✅ **Automation Level**: 100% GitOps-driven operations post-bootstrap
- ✅ **Reliability**: > 95% deployment success rate

### **Developer Experience**

- ✅ **Setup Complexity**: Single command deployment
- ✅ **Learning Curve**: < 1 hour to productive use
- ✅ **Error Recovery**: Automatic rollback on failures
- ✅ **Debugging**: Comprehensive logging and validation

## 🚀 **Development Workflow**

### **For Implementation Tasks**

1. **Read Planning Document**: Understand complete context and dependencies
2. **Analyze Task Details**: Review priorities, deliverables, and validation criteria
3. **Implement Solution**: Follow security and automation principles
4. **Validate Implementation**: Ensure all success criteria are met
5. **Update Documentation**: Keep plans and docs synchronized

### **For Bug Fixes**

1. **Understand Root Cause**: Analyze the underlying architectural issue
2. **Design Proper Solution**: Ensure fix aligns with immutable architecture
3. **Test Thoroughly**: Validate fix doesn't break other components
4. **Document Resolution**: Update relevant planning documents

### **For New Features**

1. **Evaluate Against Architecture**: Ensure alignment with Talos/GitOps model
2. **Design for Automation**: Feature should integrate with automated workflows
3. **Consider Security**: Implement with zero-trust principles
4. **Plan for Operations**: Include monitoring and maintenance procedures

## 📚 **Key Architectural Principles**

### **Immutability**

- Infrastructure never modified in place, only replaced
- All changes go through Git and automated deployment
- Configuration drift is impossible by design

### **Declarative Management**

- Desired state defined in Git repositories
- System automatically converges to desired state
- No imperative commands after initial bootstrap

### **Zero Trust Security**

- No assumed trust relationships
- All access authenticated and authorized
- Network microsegmentation by default

### **GitOps Automation**

- Git as single source of truth for all configurations
- Automated synchronization and deployment
- Full audit trail of all changes

This development approach ensures InfraFlux v2.0 delivers on its promise of being the most advanced, secure, and user-friendly Kubernetes deployment platform available.

## Project Overview

InfraFlux is an **enterprise-grade Kubernetes homelab platform** that automates the deployment of production-ready infrastructure with 245+ Kubernetes resources, complete security stack, AI/ML capabilities, and advanced monitoring - all while maintaining zero-configuration simplicity. It combines Terraform (VM provisioning), Ansible (configuration management), K3s (lightweight Kubernetes), Flux GitOps, and enterprise security into a unified platform.

## Current Platform Status (2025-01-18)

### 🎯 **Strategic Position: 90% Complete Enterprise Foundation**

InfraFlux has achieved **enterprise-grade maturity** with production-ready components and advanced automation. The focus has shifted from building foundation to **activating advanced features**.

### 🚀 **Platform Restructuring & Strategic Enhancement**

- **Comprehensive Codebase Analysis**: 90% complete enterprise-grade foundation verified
- **Restructured Strategic Plan**: New concise, trackable enhancement roadmap in phases
- **Dynamic App Configuration**: Configure applications via cluster.yaml overrides section
- **Cloudflare DNS Integration**: Automatic public FQDN provisioning with Traefik and security
- **Kustomize Modernization**: Removed deprecated keys, clean builds without warnings
- **GPU Infrastructure**: Complete NVIDIA operator, device plugins, runtime classes for AI/ML
- **AI/ML Platform**: Ollama + Open WebUI ready for activation with Authentik SSO integration
- **Media Center Foundation**: Jellyfin with hardware transcoding and \*arr stack infrastructure
- **Enhanced GitOps**: Advanced Flux automation with conditional resource deployment
- **Test Framework**: Automated testing with secrets file integration

## Essential Commands

### Platform Management Commands

```bash
# Configure cluster (interactive wizard)
./configure.sh

# Full deployment (VMs + K3s + applications + security + monitoring + gitops)
./deploy.sh

# Phase-specific deployments
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=infrastructure # Create VMs only
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all            # Setup K3s cluster only
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all           # Deploy enabled applications only
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all       # Deploy Authentik SSO and security
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all     # Deploy Prometheus, Grafana, Loki stack
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all         # Setup Flux and GitOps automation

# Application Configuration & Management
# Edit cluster.yaml overrides section to enable/disable applications
# applications:
#   monitoring:
#     enabled: true

# VM Scaling
./scale-cluster.sh 5       # Scale to 5 worker nodes
./scale-cluster.sh 1       # Scale down to 1 worker node

# Testing and Validation
./test-deploy.sh           # Test deployment with secrets file
./validate-repo.sh         # Validate repository structure and syntax
```

### Application Feature Management

```bash
# Enable AI/ML platform
yq eval '.data.enable_ai_ml = "true"' -i config/cluster.yaml
yq eval '.data.enable_ollama = "true"' -i config/cluster.yaml
yq eval '.data.enable_open_webui = "true"' -i config/cluster.yaml

# Enable media center
yq eval '.data.enable_jellyfin = "true"' -i config/cluster.yaml
yq eval '.data.enable_sonarr = "true"' -i config/cluster.yaml
yq eval '.data.enable_radarr = "true"' -i config/cluster.yaml

# Enable infrastructure features
yq eval '.data.enable_gpu_support = "true"' -i config/cluster.yaml
yq eval '.data.enable_public_ingress = "true"' -i config/cluster.yaml
yq eval '.data.public_domain = "yourdomain.com"' -i config/cluster.yaml

# Apply configuration and deploy
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=apps
```

### Validation & Testing

```bash
# Validate repository structure and syntax
./validate-repo.sh

# Check Ansible syntax manually
ansible-playbook --syntax-check deploy.yml
ansible-playbook --syntax-check playbooks/*.yml

# Verify configuration syntax
yq eval . config/cluster.yaml

# Test Ansible connectivity
ansible all -i /tmp/inventory.ini -m ping
```

## Architecture Overview

### Deployment Pipeline (4 Phases)

1. **Infrastructure** (`playbooks/infrastructure.yml`) - Creates Proxmox VMs via Terraform
2. **Node Preparation** (`playbooks/node-preparation.yml`) - OS-level configuration and hardening
3. **K3s Cluster** (`playbooks/k3s-cluster.yml`) - Kubernetes cluster with native features
4. **Applications** (`playbooks/applications.yml`) - Cloud-native application stack

### Key Configuration Files

- `config/cluster.yaml` - Main cluster configuration (ConfigMap format)
- `deploy.yml` - Master Ansible playbook with phase orchestration
- `ansible.cfg` - Ansible configuration with SSH optimizations
- `templates/inventory.ini.j2` - Dynamic inventory generation template

### Directory Structure

- `playbooks/` - Phase-specific Ansible playbooks
- `roles/` - Reusable Ansible roles (node, proxmox)
- `templates/` - Jinja2 templates for dynamic configuration
- `docs/` - Comprehensive documentation and architecture diagrams
- `trash/` - Legacy/deprecated code from previous iterations

## Native K3s Features

This project leverages **native K3s capabilities** rather than external alternatives:

- **Built-in Traefik ingress** (not external NGINX)
- **Native ServiceLB** for load balancing (not MetalLB by default)
- **Simplified networking** with automatic configuration
- **No external load balancer dependencies**

Configuration flags in `cluster.yaml`:

```yaml
k3s_disable_servicelb: "false" # Use native ServiceLB
k3s_disable_traefik: "false" # Use native Traefik
install_metallb: "false" # Don't install MetalLB
install_ingress_nginx: "false" # Don't install external NGINX
```

## Development Patterns

### Configuration Management

- All settings centralized in `config/cluster.yaml`
- Template-driven configuration with Jinja2
- Auto-detection for network settings (`network_cidr: "auto"`)
- Environment-specific variable substitution

### Script Architecture

- **Interactive configuration**: `configure.sh` provides guided setup
- **Unified deployment**: `deploy.sh` orchestrates all phases with colored output
- **Phase-based execution**: Support partial deployments and troubleshooting
- **Validation-first approach**: Repository validation before deployment

### Ansible Integration

- Dynamic inventory generation from configuration
- Role-based organization for modularity
- Phase-specific playbooks for targeted execution
- SSH key management and security hardening

## Troubleshooting Commands

```bash
# Check logs
ls -la /tmp/infraflux-deploy/

# Verify connectivity
ping <proxmox-host>
ssh root@<proxmox-host>

# Debug Ansible inventory
cat /tmp/inventory.ini

# Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# Access monitoring (if enabled)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

## Important Notes

- **No traditional build system** - Uses shell scripts and Ansible orchestration
- **Git-based workflow** - All configuration is version controlled
- **Proxmox dependency** - Requires Proxmox VE with API access and Ubuntu 24.04 template
- **SSH key authentication** - Requires SSH key pair for VM access
- **Network auto-detection** - Automatically configures IP ranges and network settings
