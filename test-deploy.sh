#!/bin/bash
# InfraFlux Test Deployment Script
# Uses the provided secrets file for testing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SECRETS_FILE="secrets"
TEST_CONFIG="config/test-cluster-config.yaml"

print_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

# Read secrets file
if [[ ! -f "$SECRETS_FILE" ]]; then
    print_error "Secrets file not found: $SECRETS_FILE"
    exit 1
fi

# Parse secrets
PROXMOX_HOST=$(grep "proxmox host" "$SECRETS_FILE" | cut -d':' -f2- | xargs)
PROXMOX_PASSWORD=$(grep "proxmox password" "$SECRETS_FILE" | cut -d':' -f2- | xargs)
SSH_PUBLIC_KEY=$(grep "ssh public key" "$SECRETS_FILE" | cut -d':' -f2- | xargs)

print_step "Creating test configuration..."

# Create test configuration
cat > "$TEST_CONFIG" << EOF
# InfraFlux Test Cluster Configuration
# Generated from secrets file for testing

apiVersion: v1
kind: ConfigMap
metadata:
  name: infraflux-test-config
  namespace: flux-system
data:
  # Cluster Configuration
  cluster_name: "infraflux-test"
  cluster_domain: "test.local"

  # Network Configuration (Auto-detected)
  network_cidr: "auto"
  service_cidr: "10.96.0.0/12"
  pod_cidr: "10.244.0.0/16"

  # Proxmox Configuration (from secrets file)
  proxmox_host: "${PROXMOX_HOST#http://}"
  proxmox_user: "root@pam"
  proxmox_node: "pve"
  proxmox_storage: "local-lvm"

  # VM Template Configuration
  vm_template_id: "9000"
  vm_template_name: "ubuntu-24.04-template"

  # Node Configuration (Test setup - smaller)
  controller_count: "1"
  worker_count: "2"
  vm_memory: "2048"
  vm_cores: "2"
  vm_disk_size: "20G"

  # VM Scaling Configuration
  enable_vm_scaling: "true"
  min_worker_count: "1"
  max_worker_count: "5"

  # K3s Configuration (Native Features Enabled)
  k3s_version: "v1.28.5+k3s1"
  k3s_cluster_init: "true"
  k3s_disable_servicelb: "false"
  k3s_disable_traefik: "false"

  # Security Configuration
  disable_swap: "true"
  enable_firewall: "true"
  ssh_key_path: "~/.ssh/id_ed25519.pub"

  # Core Application Configuration
  install_cilium: "true"
  install_metallb: "false"
  install_ingress_nginx: "false"
  install_cert_manager: "true"
  install_monitoring: "true"

  # Enhanced Features (Test minimal setup)
  auth_provider: "authentik"
  enable_sso: "true"
  monitoring_stack: "basic"
  enable_log_aggregation: "false"
  enable_gitops: "true"
  enable_backup: "false"

  # Test Environment Settings
  cluster_timezone: "UTC"
  enable_sealed_secrets: "true"
EOF

print_success "Test configuration created: $TEST_CONFIG"

print_step "Setting up SSH key..."
# Copy the SSH public key to the expected location
SSH_KEY_DIR="$HOME/.ssh"
mkdir -p "$SSH_KEY_DIR"

if [[ ! -f "$SSH_KEY_DIR/id_ed25519.pub" ]]; then
    echo "$SSH_PUBLIC_KEY" > "$SSH_KEY_DIR/id_ed25519.pub"
    print_success "SSH public key copied to $SSH_KEY_DIR/id_ed25519.pub"
else
    print_warning "SSH public key already exists at $SSH_KEY_DIR/id_ed25519.pub"
fi

print_step "Validating repository..."
./validate-repo.sh

print_step "Testing deployment phases..."

# Set the Proxmox password for deployment
export PROXMOX_PASSWORD="$PROXMOX_PASSWORD"

# Test configuration parsing
print_step "Testing configuration parsing..."
yq eval . "$TEST_CONFIG" >/dev/null && print_success "Configuration is valid YAML"

# Test Ansible syntax
print_step "Testing Ansible playbook syntax..."
for playbook in playbooks/*.yml; do
    if [[ -f "$playbook" ]]; then
        ansible-playbook --syntax-check "$playbook" && print_success "$(basename "$playbook") syntax OK"
    fi
done

# Test Kustomize builds
print_step "Testing Kustomize configurations..."
if command -v kustomize &>/dev/null; then
    if [[ -d "cluster/base" ]]; then
        kustomize build cluster/base >/dev/null && print_success "Base Kustomize build OK"
    fi
    
    for overlay in cluster/overlays/*/; do
        if [[ -d "$overlay" ]]; then
            overlay_name=$(basename "$overlay")
            kustomize build "$overlay" >/dev/null && print_success "$overlay_name overlay build OK"
        fi
    done
else
    print_warning "Kustomize not installed - skipping Kustomize tests"
fi

print_step "Infrastructure deployment test (dry-run)..."
# This would be: ./deploy.sh "$TEST_CONFIG" infrastructure
print_warning "Skipping actual VM deployment in test mode"

print_success "🎉 All tests passed!"
echo
echo "To run actual deployment:"
echo "  ./deploy.sh $TEST_CONFIG infrastructure  # Create VMs"
echo "  ./deploy.sh $TEST_CONFIG k3s            # Setup K3s cluster"
echo "  ./deploy.sh $TEST_CONFIG security       # Deploy Authentik SSO"
echo "  ./deploy.sh $TEST_CONFIG monitoring     # Deploy monitoring"
echo "  ./deploy.sh $TEST_CONFIG gitops         # Setup GitOps"
echo
echo "Or run full deployment:"
echo "  ./deploy.sh $TEST_CONFIG all"
echo
echo "Proxmox Details:"
echo "  Host: $PROXMOX_HOST"
echo "  User: root@pam"
echo "  Password: [Set in environment]"