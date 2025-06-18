# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

InfraFlux is a zero-configuration Kubernetes deployment platform that automates the creation of production-ready K3s clusters on Proxmox infrastructure. It combines Terraform (VM provisioning), Ansible (configuration management), and K3s (lightweight Kubernetes) into a unified deployment pipeline.

## Essential Commands

### Deployment Commands
```bash
# Configure cluster (interactive wizard)
./configure.sh

# Full deployment (VMs + K3s + applications)
./deploy.sh

# Phase-specific deployments
./deploy.sh infrastructure  # Create VMs only
./deploy.sh k3s            # Setup K3s cluster only
./deploy.sh apps           # Install applications only
./deploy.sh config         # Show current configuration
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
k3s_disable_servicelb: "false"  # Use native ServiceLB
k3s_disable_traefik: "false"    # Use native Traefik
install_metallb: "false"        # Don't install MetalLB
install_ingress_nginx: "false"  # Don't install external NGINX
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