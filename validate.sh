#!/bin/bash
set -euo pipefail

# InfraFlux Validation Script
# This script validates your configuration and environment

CONFIG_FILE="${1:-config/cluster-config.yaml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

errors=0
warnings=0

echo "🔍 InfraFlux Configuration Validator"
echo "===================================="
echo

# Check if configuration file exists
print_header "📄 Configuration File"
if [[ ! -f "$CONFIG_FILE" ]]; then
    print_error "Configuration file not found: $CONFIG_FILE"
    echo "   Run: ./configure.sh to create one"
    exit 1
else
    print_success "Configuration file found: $CONFIG_FILE"
fi

# Check if yq is available
if ! command -v yq &>/dev/null; then
    print_warning "yq not found - installing..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install yq
    else
        sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
        sudo chmod +x /usr/local/bin/yq
    fi
fi

# Validate configuration values
print_header "⚙️  Configuration Validation"

# Required fields
CLUSTER_NAME=$(yq eval '.data.cluster_name' "$CONFIG_FILE" 2>/dev/null || echo "")
if [[ -z "$CLUSTER_NAME" || "$CLUSTER_NAME" == "null" ]]; then
    print_error "cluster_name is required"
    ((errors++))
else
    print_success "Cluster name: $CLUSTER_NAME"
fi

PROXMOX_HOST=$(yq eval '.data.proxmox_host' "$CONFIG_FILE" 2>/dev/null || echo "")
if [[ -z "$PROXMOX_HOST" || "$PROXMOX_HOST" == "null" ]]; then
    print_error "proxmox_host is required"
    ((errors++))
else
    print_success "Proxmox host: $PROXMOX_HOST"
fi

# Network validation
NETWORK_CIDR=$(yq eval '.data.network_cidr' "$CONFIG_FILE" 2>/dev/null || echo "")
if [[ -z "$NETWORK_CIDR" || "$NETWORK_CIDR" == "null" ]]; then
    print_error "network_cidr is required"
    ((errors++))
elif [[ "$NETWORK_CIDR" == "auto" ]]; then
    print_success "Network CIDR: auto-detect enabled"
else
    # Validate CIDR format
    if [[ "$NETWORK_CIDR" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$ ]]; then
        print_success "Network CIDR: $NETWORK_CIDR"
    else
        print_error "Invalid network CIDR format: $NETWORK_CIDR"
        ((errors++))
    fi
fi

# Node counts
CONTROLLER_COUNT=$(yq eval '.data.controller_count' "$CONFIG_FILE" 2>/dev/null || echo "0")
WORKER_COUNT=$(yq eval '.data.worker_count' "$CONFIG_FILE" 2>/dev/null || echo "0")

if [[ "$CONTROLLER_COUNT" -lt 1 ]]; then
    print_error "At least 1 controller node is required"
    ((errors++))
elif [[ "$CONTROLLER_COUNT" -eq 2 ]]; then
    print_warning "2 controllers may cause split-brain issues, consider 1 or 3+"
    ((warnings++))
else
    print_success "Controller nodes: $CONTROLLER_COUNT"
fi

if [[ "$WORKER_COUNT" -lt 0 ]]; then
    print_error "Worker count cannot be negative"
    ((errors++))
else
    print_success "Worker nodes: $WORKER_COUNT"
fi

# Resource validation
VM_MEMORY=$(yq eval '.data.vm_memory' "$CONFIG_FILE" 2>/dev/null || echo "0")
if [[ "$VM_MEMORY" -lt 2048 ]]; then
    print_warning "VM memory < 2GB may cause issues"
    ((warnings++))
else
    print_success "VM memory: ${VM_MEMORY}MB"
fi

# Check environment
print_header "🌍 Environment Validation"

# Check SSH key
SSH_KEY_PATH=$(yq eval '.data.ssh_key_path' "$CONFIG_FILE" 2>/dev/null || echo "~/.ssh/id_rsa.pub")
SSH_KEY_PATH="${SSH_KEY_PATH/#\~/$HOME}"

if [[ ! -f "$SSH_KEY_PATH" ]]; then
    print_error "SSH public key not found: $SSH_KEY_PATH"
    echo "   Generate with: ssh-keygen -t rsa -b 4096"
    ((errors++))
else
    print_success "SSH public key found: $SSH_KEY_PATH"
fi

# Check private key
PRIVATE_KEY_PATH="${SSH_KEY_PATH%.pub}"
if [[ ! -f "$PRIVATE_KEY_PATH" ]]; then
    print_error "SSH private key not found: $PRIVATE_KEY_PATH"
    ((errors++))
else
    print_success "SSH private key found: $PRIVATE_KEY_PATH"
fi

# Check Proxmox connectivity
print_header "🔌 Connectivity Tests"
if ping -c 1 -W 3 "$PROXMOX_HOST" &>/dev/null; then
    print_success "Proxmox host is reachable: $PROXMOX_HOST"
else
    print_error "Cannot reach Proxmox host: $PROXMOX_HOST"
    ((errors++))
fi

# Check required tools
print_header "🛠️  Required Tools"
tools=("ansible" "ansible-playbook" "kubectl")
for tool in "${tools[@]}"; do
    if command -v "$tool" &>/dev/null; then
        print_success "$tool is installed"
    else
        print_warning "$tool is not installed (will be auto-installed)"
        ((warnings++))
    fi
done

# Summary
echo
print_header "📊 Validation Summary"
if [[ $errors -eq 0 ]]; then
    print_success "Configuration is valid! ✨"
    if [[ $warnings -gt 0 ]]; then
        print_warning "$warnings warning(s) found - review above"
    fi
    echo
    echo "🚀 Ready to deploy:"
    echo "   ./deploy.sh"
    exit 0
else
    print_error "$errors error(s) found - fix before deploying"
    if [[ $warnings -gt 0 ]]; then
        print_warning "$warnings warning(s) found"
    fi
    echo
    echo "🔧 To fix configuration:"
    echo "   ./configure.sh"
    exit 1
fi
