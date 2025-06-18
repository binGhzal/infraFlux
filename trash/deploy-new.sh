#!/bin/bash
set -euo pipefail

# InfraFlux Deployment Script
# Simplified deployment using Ansible playbooks

CONFIG_FILE="${1:-config/cluster-config.yaml}"
PHASE="${2:-all}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    local missing_tools=()

    # Check for required tools
    for tool in ansible yq; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_step "Please install missing tools first"
        exit 1
    fi

    print_success "Prerequisites checked"
}

# Parse configuration and create variables file
parse_config() {
    print_step "Parsing configuration from $CONFIG_FILE..."

    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        print_step "Run: ./configure.sh to create one"
        exit 1
    fi

    # Create variables file for Ansible
    mkdir -p vars

    # Extract configuration values using yq and create Ansible vars
    cat >vars/config.yml <<EOF
# Auto-generated configuration from $CONFIG_FILE
cluster_name: $(yq eval '.data.cluster_name' "$CONFIG_FILE")
proxmox_host: $(yq eval '.data.proxmox_host' "$CONFIG_FILE")
proxmox_user: $(yq eval '.data.proxmox_user' "$CONFIG_FILE")
proxmox_node: $(yq eval '.data.proxmox_node' "$CONFIG_FILE")
proxmox_storage: $(yq eval '.data.proxmox_storage' "$CONFIG_FILE")
controller_count: $(yq eval '.data.controller_count' "$CONFIG_FILE")
worker_count: $(yq eval '.data.worker_count' "$CONFIG_FILE")
network_cidr: $(yq eval '.data.network_cidr' "$CONFIG_FILE")
vm_memory: $(yq eval '.data.vm_memory' "$CONFIG_FILE")
vm_cores: $(yq eval '.data.vm_cores' "$CONFIG_FILE")
vm_disk_size: $(yq eval '.data.vm_disk_size' "$CONFIG_FILE")
k3s_version: $(yq eval '.data.k3s_version' "$CONFIG_FILE")
ssh_key_path: $(yq eval '.data.ssh_key_path' "$CONFIG_FILE")
install_cilium: $(yq eval '.data.install_cilium' "$CONFIG_FILE")
install_metallb: $(yq eval '.data.install_metallb' "$CONFIG_FILE")
install_ingress_nginx: $(yq eval '.data.install_ingress_nginx' "$CONFIG_FILE")
install_cert_manager: $(yq eval '.data.install_cert_manager' "$CONFIG_FILE")
install_monitoring: $(yq eval '.data.install_monitoring' "$CONFIG_FILE")
install_sealed_secrets: $(yq eval '.data.enable_sealed_secrets' "$CONFIG_FILE")
grafana_admin_password: $(yq eval '.data.grafana_admin_password // "admin123"' "$CONFIG_FILE")
EOF

    print_success "Configuration parsed and variables file created"
}

# Deploy using Ansible
deploy() {
    print_step "Starting InfraFlux deployment..."

    # Prompt for Proxmox password if not set
    if [[ -z "${PROXMOX_PASSWORD:-}" ]]; then
        read -s -p "Enter Proxmox password: " PROXMOX_PASSWORD
        echo
        export PROXMOX_PASSWORD
    fi

    # Install required Ansible collections
    print_step "Installing Ansible collections..."
    ansible-galaxy collection install community.general kubernetes.core --force >/dev/null 2>&1

    # Run the deployment
    ansible-playbook deploy.yml \
        -e @vars/config.yml \
        -e proxmox_password="$PROXMOX_PASSWORD" \
        -e phase="$PHASE" \
        -v

    print_success "Deployment completed!"
}

# Show help
show_help() {
    echo "InfraFlux Deployment Tool"
    echo "========================="
    echo
    echo "Usage: $0 [config-file] [phase]"
    echo
    echo "Phases:"
    echo "  all            - Full deployment (default)"
    echo "  infrastructure - Create VMs only"
    echo "  nodes          - Prepare nodes only"
    echo "  k3s            - Setup K3s cluster only"
    echo "  apps           - Install applications only"
    echo
    echo "Examples:"
    echo "  $0                           # Full deployment with default config"
    echo "  $0 config/prod.yaml         # Full deployment with custom config"
    echo "  $0 config/test.yaml k3s     # Only setup K3s cluster"
    echo
}

# Main execution
main() {
    case "${PHASE}" in
    "help" | "-h" | "--help")
        show_help
        exit 0
        ;;
    "all" | "infrastructure" | "nodes" | "k3s" | "apps")
        echo "🚀 InfraFlux Deployment"
        echo "======================="
        echo "Config: $CONFIG_FILE"
        echo "Phase: $PHASE"
        echo

        check_prerequisites
        parse_config
        deploy
        ;;
    *)
        print_error "Invalid phase: $PHASE"
        show_help
        exit 1
        ;;
    esac
}

main "$@"
