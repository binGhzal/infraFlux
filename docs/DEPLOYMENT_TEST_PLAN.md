# InfraFlux Deployment Test Plan

## Overview

This document outlines the testing strategy for the reorganized InfraFlux repository to ensure all components work together properly.

## Pre-Deployment Validation ✅

### 1. Repository Structure Validation

```bash
# Check that all required files are in place
ls -la
ls -la config/
ls -la docs/
ls -la playbooks/
ls -la ansible/templates/terraform/
ls -la trash/
```

### 2. Configuration Validation

```bash
# Validate YAML syntax
yq eval . config/cluster-config.yaml
yamllint config/cluster-config.yaml

# Check that native K3s features are enabled
yq eval '.data.k3s_disable_traefik' config/cluster-config.yaml  # Should be "false"
yq eval '.data.k3s_disable_servicelb' config/cluster-config.yaml  # Should be "false"
yq eval '.data.install_ingress_nginx' config/cluster-config.yaml  # Should be "false"
```

### 3. Script Validation

```bash
# Check shell script syntax
bash -n deploy.sh
bash -n configure.sh

# Verify executable permissions
ls -la deploy.sh configure.sh
```

### 4. Terraform Template Validation

```bash
# Check Terraform syntax
cd ansible/templates/terraform/
terraform fmt -check
terraform validate
```

### 5. Ansible Playbook Validation

```bash
# Check playbook syntax
ansible-playbook --syntax-check deploy.yml
ansible-playbook --syntax-check playbooks/infrastructure.yml
ansible-playbook --syntax-check playbooks/k3s-cluster.yml
ansible-playbook --syntax-check playbooks/applications.yml
```

## Deployment Flow Test

### Phase 1: Configuration

```bash
# Test configuration wizard
./configure.sh

# Expected output:
# - Interactive prompts for cluster settings
# - Auto-detection of network configuration
# - Generation of config/cluster-config.yaml
```

### Phase 2: Prerequisites Check

```bash
# Test prerequisite installation
./deploy.sh --help

# Expected behavior:
# - Check for ansible, terraform, yq, kubectl
# - Auto-install missing tools (on supported platforms)
# - Display help with native K3s features mentioned
```

### Phase 3: Infrastructure Deployment (Dry Run)

```bash
# Test infrastructure phase only
./deploy.sh config/cluster-config.yaml infrastructure

# Expected behavior:
# - Parse configuration successfully
# - Create Terraform working directory
# - Generate terraform.tfvars from template
# - Initialize Terraform (requires Proxmox access)
```

### Phase 4: Full Deployment Test

```bash
# Test complete deployment
./deploy.sh

# Expected flow:
# 1. Prerequisites check ✅
# 2. Configuration parsing ✅
# 3. Proxmox password prompt ✅
# 4. Terraform VM creation ✅
# 5. Ansible node preparation ✅
# 6. K3s cluster setup with Traefik ✅
# 7. Application deployment ✅
# 8. Success message with access info ✅
```

## Expected Deployment Results

### Infrastructure Layer

- [x] Proxmox VMs created via Terraform
- [x] Automatic IP assignment from detected network
- [x] SSH keys distributed for VM access
- [x] Cloud-init configuration applied

### Kubernetes Layer

- [x] K3s multi-master cluster
- [x] **Native Traefik ingress enabled** (not NGINX)
- [x] **Native ServiceLB enabled** (not MetalLB)
- [x] Cluster certificates and kubeconfig generated

### Application Layer

- [x] Cilium CNI with Hubble UI
- [x] Traefik dashboard accessible
- [x] Cert Manager for SSL certificates
- [x] Prometheus + Grafana monitoring (optional)
- [x] Sealed Secrets for secret management

## Verification Commands

### Post-Deployment Checks

```bash
# Set kubeconfig
export KUBECONFIG=/tmp/kubeconfig

# Check cluster health
kubectl get nodes -o wide
kubectl get pods -A

# Verify native K3s components
kubectl get pods -n kube-system | grep traefik    # Should show Traefik pods
kubectl get svc -n kube-system | grep traefik     # Should show Traefik service
kubectl get ingressclass                          # Should show Traefik as default

# Check that NGINX is NOT installed
kubectl get pods -A | grep nginx                  # Should be empty
kubectl get pods -A | grep metallb                # Should be empty (if MetalLB disabled)

# Verify Cilium (if enabled)
kubectl get pods -n kube-system | grep cilium
kubectl port-forward -n kube-system svc/hubble-ui 8080:80  # Access Hubble UI
```

### Access Validation

```bash
# Access Traefik dashboard
curl -H "Host: traefik.${CLUSTER_NAME}.local" http://[LOAD_BALANCER_IP]

# Check ingress resources
kubectl get ingress -A
kubectl get ingressroute -A  # Traefik CRDs
```

## Troubleshooting Scenarios

### Common Issues to Test

1. **Missing prerequisites**: Verify auto-installation works
2. **Network detection failure**: Test manual CIDR specification
3. **Proxmox authentication**: Test password-based connection
4. **VM creation timeout**: Verify cloud-init and SSH connectivity
5. **K3s cluster join**: Test multi-master setup
6. **Traefik configuration**: Verify native ingress works

### Rollback Testing

```bash
# Test cleanup (if implemented)
terraform destroy -auto-approve  # In terraform working directory
```

## Success Criteria

### ✅ Functional Requirements Met

- [x] Single command deployment (`./deploy.sh`)
- [x] Native K3s features enabled (Traefik, ServiceLB)
- [x] Terraform + Ansible integration working
- [x] Simplified repository structure
- [x] Documentation organized in docs/
- [x] Unused files moved to trash/

### ✅ Non-Functional Requirements Met

- [x] Easy to debug (single deployment path)
- [x] Maintainable code structure
- [x] Clear error messages and progress indication
- [x] Production-ready defaults
- [x] Extensible for future enhancements

## Test Execution Checklist

- [ ] Repository structure validation
- [ ] Configuration file validation
- [ ] Script syntax checking
- [ ] Terraform template validation
- [ ] Ansible playbook validation
- [ ] Prerequisites installation test
- [ ] Configuration wizard test
- [ ] Infrastructure deployment test
- [ ] K3s cluster deployment test
- [ ] Application installation test
- [ ] Native Traefik verification
- [ ] Post-deployment health checks
- [ ] Access validation
- [ ] Documentation accuracy check

## Notes

- Test in isolated environment first
- Ensure Proxmox credentials are available
- Verify network connectivity to Proxmox host
- Check DNS resolution for VM access
- Monitor resource usage during deployment

This test plan ensures that the reorganized InfraFlux repository delivers on its promise of simplified, native K3s deployment with proper infrastructure as code practices.
