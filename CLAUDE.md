# Claude.md

## Additional Instructions

- readme @README.md

This file provides an overview of the InfraFlux project, including its purpose, architecture, and essential commands.

- git workflow @docs/git-instructions.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- plan @docs/plan/PLAN.md

This file outlines the plan for reorganizing and modernizing the InfraFlux repository, including the deployment flowchart, testing strategy, and success criteria.

- comprehensive code analysis @docs/plan/COMPREHENSIVE_CODEBASE_ANALYSIS.md

This file contains a detailed analysis of the existing codebase, identifying redundant components, understanding the deployment flow, and documenting the current vs desired state.

- deployment flowchart @docs/plan/DEPLOYMENT_FLOWCHART.md

This file provides a visual representation of the deployment process, comparing the current complex structure with the proposed streamlined workflow.

- deployment test plan @docs/plan/DEPLOYMENT_TEST_PLAN.md

This file outlines the testing strategy for the reorganized InfraFlux repository, ensuring all components work together properly.

- architecture overview @docs/ARCHITECTURE.md

This file provides an overview of the InfraFlux architecture, including the deployment pipeline, key configuration files, and directory structure.

- quick start guide @docs/QUICK_START.md

this file provides a concise guide to getting started with InfraFlux, including essential commands and deployment steps.

## Personal Approach

- deeply think and analyze every todo before doing it

## Project Overview

InfraFlux is an **enterprise-grade Kubernetes homelab platform** that automates the deployment of production-ready infrastructure with 245+ Kubernetes resources, complete security stack, AI/ML capabilities, and advanced monitoring - all while maintaining zero-configuration simplicity. It combines Terraform (VM provisioning), Ansible (configuration management), K3s (lightweight Kubernetes), Flux GitOps, and enterprise security into a unified platform.

## Current Platform Status (2025-01-18)

### 🎯 **Strategic Position: 90% Complete Enterprise Foundation**
InfraFlux has achieved **enterprise-grade maturity** with production-ready components and advanced automation. The focus has shifted from building foundation to **activating advanced features**.

### 🚀 **Platform Restructuring & Strategic Enhancement**
- **Comprehensive Codebase Analysis**: 90% complete enterprise-grade foundation verified
- **Restructured Strategic Plan**: New concise, trackable enhancement roadmap in phases
- **Dynamic App Configuration**: Optional enable/disable system for all applications via `scripts/configure-apps.sh`
- **Cloudflare DNS Integration**: Automatic public FQDN provisioning with Traefik and security
- **Kustomize Modernization**: Removed deprecated keys, clean builds without warnings
- **GPU Infrastructure**: Complete NVIDIA operator, device plugins, runtime classes for AI/ML
- **AI/ML Platform**: Ollama + Open WebUI ready for activation with Authentik SSO integration
- **Media Center Foundation**: Jellyfin with hardware transcoding and *arr stack infrastructure
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
./deploy.sh infrastructure  # Create VMs only
./deploy.sh k3s            # Setup K3s cluster only
./deploy.sh apps           # Deploy enabled applications only
./deploy.sh security       # Deploy Authentik SSO and security
./deploy.sh monitoring     # Deploy Prometheus, Grafana, Loki stack
./deploy.sh gitops         # Setup Flux and GitOps automation

# Application Configuration & Management
./scripts/configure-apps.sh              # Configure enabled/disabled applications
./scripts/configure-apps.sh --dry-run    # Preview configuration changes
./scripts/configure-apps.sh --restore    # Restore previous configuration

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
yq eval '.data.enable_ai_ml = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_ollama = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_open_webui = "true"' -i config/cluster-config.yaml

# Enable media center
yq eval '.data.enable_jellyfin = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_sonarr = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_radarr = "true"' -i config/cluster-config.yaml

# Enable infrastructure features
yq eval '.data.enable_gpu_support = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_public_ingress = "true"' -i config/cluster-config.yaml
yq eval '.data.public_domain = "yourdomain.com"' -i config/cluster-config.yaml

# Apply configuration and deploy
./scripts/configure-apps.sh && ./deploy.sh apps
```

### Validation & Testing

```bash
# Validate repository structure and syntax
./validate-repo.sh

# Check Ansible syntax manually
ansible-playbook --syntax-check deploy.yml
ansible-playbook --syntax-check playbooks/*.yml

# Verify configuration syntax
yq eval . config/cluster-config.yaml

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

- `config/cluster-config.yaml` - Main cluster configuration (ConfigMap format)
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

Configuration flags in `cluster-config.yaml`:

```yaml
k3s_disable_servicelb: "false" # Use native ServiceLB
k3s_disable_traefik: "false" # Use native Traefik
install_metallb: "false" # Don't install MetalLB
install_ingress_nginx: "false" # Don't install external NGINX
```

## Development Patterns

### Configuration Management

- All settings centralized in `config/cluster-config.yaml`
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