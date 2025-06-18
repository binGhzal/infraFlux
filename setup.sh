#!/bin/bash

# InfraFlux Setup Script
# This script helps users configure their environment easily

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR/ansible"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

usage() {
    cat <<EOF
InfraFlux Setup Script

This script helps you configure your infrastructure deployment.

USAGE:
    $0 [command] [options]

COMMANDS:
    init [env]     Initialize a new environment configuration
    check          Check system requirements
    wizard         Run the interactive setup wizard
    deploy [env]   Deploy to specified environment
    status [env]   Check deployment status

OPTIONS:
    -h, --help     Show this help message
    -v, --verbose  Enable verbose output

EXAMPLES:
    $0 wizard                    # Run interactive setup
    $0 init mylab               # Initialize 'mylab' environment
    $0 deploy mylab             # Deploy to 'mylab' environment
    $0 check                    # Check requirements

EOF
}

check_requirements() {
    log "Checking system requirements..."

    local missing_deps=()

    # Check for required commands
    for cmd in ansible ansible-playbook ssh-keygen; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -ne 0 ]; then
        error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies:"
        echo "  Ubuntu/Debian: sudo apt update && sudo apt install ansible openssh-client"
        echo "  CentOS/RHEL:   sudo yum install ansible openssh-clients"
        echo "  macOS:         brew install ansible"
        return 1
    fi

    # Check Ansible version
    local ansible_version=$(ansible --version | head -n1 | awk '{print $2}')
    log "Found Ansible version: $ansible_version"

    # Check SSH key
    if [ ! -f "$HOME/.ssh/id_rsa" ] && [ ! -f "$HOME/.ssh/id_ed25519" ]; then
        warn "No SSH key found. Generating one..."
        ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519" -N ""
        log "SSH key generated: $HOME/.ssh/id_ed25519"
    fi

    log "System requirements check passed!"
}

detect_network() {
    local inventory_file="$1"

    if [ ! -f "$inventory_file" ]; then
        return 1
    fi

    # Extract IP addresses from inventory
    local ips=$(grep -E "ansible_host=" "$inventory_file" | sed 's/.*ansible_host=\([0-9.]*\).*/\1/')

    if [ -z "$ips" ]; then
        return 1
    fi

    # Determine common network prefix
    local first_ip=$(echo "$ips" | head -n1)
    local network_prefix=$(echo "$first_ip" | cut -d. -f1-3)

    echo "$network_prefix"
}

create_environment() {
    local env_name="$1"

    if [ -z "$env_name" ]; then
        error "Environment name is required"
        return 1
    fi

    local env_dir="$ANSIBLE_DIR/group_vars/$env_name"
    local inventory_file="$ANSIBLE_DIR/hosts.$env_name"

    log "Creating environment: $env_name"

    # Create group_vars directory
    mkdir -p "$env_dir"

    # Create environment-specific configuration
    cat >"$env_dir/main.yml" <<EOF
# Environment: $env_name
# Auto-generated on $(date)

# Override global settings for this environment
# cluster_domain: "${env_name}.local"
# admin_email: "admin@${env_name}.local"

# Environment-specific features
# features:
#   flux_enabled: true
#   authentik_enabled: true

# Proxmox settings for this environment
# proxmox:
#   default_node: "pve"
#   storage: "local-lvm"

EOF

    # Create sample inventory if it doesn't exist
    if [ ! -f "$inventory_file" ]; then
        cat >"$inventory_file" <<EOF
# Inventory for environment: $env_name
# Edit this file to match your infrastructure

[$env_name:children]
proxmox_servers
controllers
k3s_servers
k3s_agents

[proxmox_servers]
# Add your Proxmox hosts here
# pve01    ansible_host=192.168.1.100   ansible_user=root

[controllers]
# Add your controller nodes here
# controller01    ansible_host=192.168.1.10    cluster_nic=eth1

[k3s_servers]
# Add your Kubernetes master nodes here (odd number, 1 or 3+ for HA)
# master01    ansible_host=192.168.1.11    cluster_nic=eth1    keepalived_priority=130
# master02    ansible_host=192.168.1.12    cluster_nic=eth1    keepalived_priority=120
# master03    ansible_host=192.168.1.13    cluster_nic=eth1    keepalived_priority=110

[k3s_agents]
# Add your Kubernetes worker nodes here
# worker01    ansible_host=192.168.1.21    cluster_nic=eth1
# worker02    ansible_host=192.168.1.22    cluster_nic=eth1

[haproxy_servers:children]
# HAProxy runs on master nodes for HA
k3s_servers

EOF
    fi

    log "Environment '$env_name' created successfully!"
    info "Next steps:"
    info "  1. Edit $inventory_file with your server details"
    info "  2. Edit $env_dir/main.yml for environment-specific settings"
    info "  3. Run: $0 deploy $env_name"
}

interactive_wizard() {
    log "Welcome to the InfraFlux Interactive Setup Wizard!"
    echo ""

    # Environment name
    read -p "Enter environment name (e.g., 'mylab', 'prod'): " env_name
    if [ -z "$env_name" ]; then
        error "Environment name cannot be empty"
        return 1
    fi

    # Check if environment exists
    if [ -d "$ANSIBLE_DIR/group_vars/$env_name" ]; then
        read -p "Environment '$env_name' already exists. Overwrite? (y/N): " overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            info "Wizard cancelled"
            return 0
        fi
    fi

    # Create environment
    create_environment "$env_name"

    # Ask for basic configuration
    echo ""
    info "Let's configure some basic settings..."

    read -p "Enter your cluster domain (default: ${env_name}.local): " domain
    domain=${domain:-"${env_name}.local"}

    read -p "Enter admin email (default: admin@${domain}): " email
    email=${email:-"admin@${domain}"}

    # Update configuration
    local env_config="$ANSIBLE_DIR/group_vars/$env_name/main.yml"

    cat >>"$env_config" <<EOF

# Wizard configuration
cluster_domain: "$domain"
admin_email: "$email"

EOF

    # Network detection
    echo ""
    info "Network Configuration"
    echo "InfraFlux will auto-detect your network from the inventory file."
    echo "Common network patterns:"
    echo "  - 192.168.1.x (home networks)"
    echo "  - 10.0.0.x (private networks)"
    echo "  - 172.16.x.x (enterprise networks)"
    echo ""

    # Infrastructure type
    echo ""
    info "Infrastructure Type"
    echo "1) Proxmox VMs (recommended)"
    echo "2) Existing servers (bare metal/cloud)"
    read -p "Select infrastructure type (1-2): " infra_type

    case $infra_type in
    1)
        echo ""
        info "Proxmox Configuration"
        read -p "Proxmox host IP: " proxmox_ip
        read -p "Proxmox username (default: root): " proxmox_user
        proxmox_user=${proxmox_user:-root}

        # Add Proxmox host to inventory
        sed -i.bak "s/# pve01.*/pve01    ansible_host=$proxmox_ip   ansible_user=$proxmox_user/" "$ANSIBLE_DIR/hosts.$env_name"
        ;;
    2)
        info "You'll need to manually edit the inventory file with your server IPs"
        ;;
    esac

    echo ""
    log "Configuration complete!"
    info "Configuration files created:"
    info "  - Inventory: $ANSIBLE_DIR/hosts.$env_name"
    info "  - Config: $ANSIBLE_DIR/group_vars/$env_name/main.yml"
    echo ""
    info "Next steps:"
    info "  1. Review and edit the inventory file with your server details"
    info "  2. Run: $0 deploy $env_name"
}

deploy_environment() {
    local env_name="$1"

    if [ -z "$env_name" ]; then
        error "Environment name is required"
        return 1
    fi

    local inventory_file="$ANSIBLE_DIR/hosts.$env_name"

    if [ ! -f "$inventory_file" ]; then
        error "Inventory file not found: $inventory_file"
        info "Run: $0 init $env_name"
        return 1
    fi

    log "Deploying environment: $env_name"

    cd "$ANSIBLE_DIR"

    # Run the deployment
    if ./deploy.sh -e "$env_name"; then
        log "Deployment completed successfully!"
        echo ""
        info "Your infrastructure is ready!"
        info "Access your cluster:"
        info "  kubectl --kubeconfig ~/.kube/config get nodes"
    else
        error "Deployment failed! Check the logs above."
        return 1
    fi
}

check_status() {
    local env_name="$1"

    if [ -z "$env_name" ]; then
        error "Environment name is required"
        return 1
    fi

    local inventory_file="$ANSIBLE_DIR/hosts.$env_name"

    if [ ! -f "$inventory_file" ]; then
        error "Environment '$env_name' not found"
        return 1
    fi

    log "Checking status for environment: $env_name"

    cd "$ANSIBLE_DIR"

    # Check if nodes are reachable
    ansible all -i "$inventory_file" -m ping --one-line 2>/dev/null || true

    # Check cluster status if possible
    if ansible k3s_servers -i "$inventory_file" -m shell -a "kubectl get nodes" --one-line 2>/dev/null; then
        info "Cluster is operational"
    else
        warn "Cluster might not be ready or not deployed yet"
    fi
}

# Parse command line arguments
case "${1:-}" in
check)
    check_requirements
    ;;
init)
    create_environment "$2"
    ;;
wizard)
    check_requirements
    interactive_wizard
    ;;
deploy)
    check_requirements
    deploy_environment "$2"
    ;;
status)
    check_status "$2"
    ;;
-h | --help | help)
    usage
    ;;
"")
    info "No command specified. Running wizard..."
    check_requirements
    interactive_wizard
    ;;
*)
    error "Unknown command: $1"
    usage
    exit 1
    ;;
esac
