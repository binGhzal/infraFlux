#!/bin/bash
set -euo pipefail

# InfraFlux Deployment Script
# This script reads the cluster-config.yaml and deploys everything automatically

CONFIG_FILE="${1:-config/cluster-config.yaml}"
WORK_DIR="/tmp/infraflux-deploy"

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
    for tool in ansible yq kubectl; do
        if ! command -v "$tool" &> /dev/null; then
            missing_tools+=("$tool")
        fi
    done
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        print_step "Installing missing tools..."
        
        # Install missing tools
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            brew install ansible yq kubectl
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v apt-get &> /dev/null; then
                sudo apt-get update
                sudo apt-get install -y ansible
                # Install yq and kubectl separately
                sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
                sudo chmod +x /usr/local/bin/yq
                curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
            fi
        fi
    fi
    
    print_success "Prerequisites checked"
}

# Parse configuration
parse_config() {
    print_step "Parsing configuration from $CONFIG_FILE..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Create work directory
    mkdir -p "$WORK_DIR"
    
    # Extract configuration values using yq
    export CLUSTER_NAME=$(yq eval '.data.cluster_name' "$CONFIG_FILE")
    export PROXMOX_HOST=$(yq eval '.data.proxmox_host' "$CONFIG_FILE")
    export PROXMOX_USER=$(yq eval '.data.proxmox_user' "$CONFIG_FILE")
    export PROXMOX_NODE=$(yq eval '.data.proxmox_node' "$CONFIG_FILE")
    export CONTROLLER_COUNT=$(yq eval '.data.controller_count' "$CONFIG_FILE")
    export WORKER_COUNT=$(yq eval '.data.worker_count' "$CONFIG_FILE")
    export NETWORK_CIDR=$(yq eval '.data.network_cidr' "$CONFIG_FILE")
    
    # Auto-detect network if set to "auto"
    if [[ "$NETWORK_CIDR" == "auto" ]]; then
        print_step "Auto-detecting network configuration..."
        NETWORK_CIDR=$(ip route | grep -E "192\.168\.|10\.|172\." | head -1 | awk '{print $1}' || echo "192.168.1.0/24")
        print_success "Detected network: $NETWORK_CIDR"
    fi
    
    # Create ansible extra vars file
    cat > "$WORK_DIR/extra_vars.yml" << EOF
cluster_name: "$CLUSTER_NAME"
proxmox_host: "$PROXMOX_HOST"
proxmox_user: "$PROXMOX_USER"
proxmox_node: "$PROXMOX_NODE"
controller_count: $CONTROLLER_COUNT
worker_count: $WORKER_COUNT
network_cidr: "$NETWORK_CIDR"
vm_memory: $(yq eval '.data.vm_memory' "$CONFIG_FILE")
vm_cores: $(yq eval '.data.vm_cores' "$CONFIG_FILE")
vm_disk_size: "$(yq eval '.data.vm_disk_size' "$CONFIG_FILE")"
k3s_version: "$(yq eval '.data.k3s_version' "$CONFIG_FILE")"
install_cilium: $(yq eval '.data.install_cilium' "$CONFIG_FILE")
install_metallb: $(yq eval '.data.install_metallb' "$CONFIG_FILE")
install_ingress_nginx: $(yq eval '.data.install_ingress_nginx' "$CONFIG_FILE")
install_cert_manager: $(yq eval '.data.install_cert_manager' "$CONFIG_FILE")
install_monitoring: $(yq eval '.data.install_monitoring' "$CONFIG_FILE")
enable_backup: $(yq eval '.data.enable_backup' "$CONFIG_FILE")
EOF
    
    print_success "Configuration parsed successfully"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_step "Phase 1: Creating VMs on Proxmox..."
    
    # Prompt for Proxmox password if not set
    if [[ -z "${PROXMOX_PASSWORD:-}" ]]; then
        read -s -p "Enter Proxmox password: " PROXMOX_PASSWORD
        echo
        export PROXMOX_PASSWORD
    fi
    
    ansible-playbook \
        -i localhost, \
        -e @"$WORK_DIR/extra_vars.yml" \
        -e proxmox_password="$PROXMOX_PASSWORD" \
        deployments/01-infrastructure/create-vms.yml
    
    print_success "VMs created successfully"
}

# Setup K3s cluster
setup_k3s() {
    print_step "Phase 2: Setting up K3s cluster..."
    
    # Use the generated inventory
    ansible-playbook \
        -i /tmp/inventory.ini \
        -e @"$WORK_DIR/extra_vars.yml" \
        deployments/02-k3s-cluster/setup-k3s.yml
    
    print_success "K3s cluster setup complete"
}

# Install applications
install_applications() {
    print_step "Phase 3: Installing applications..."
    
    # Install required Ansible collections
    ansible-galaxy collection install kubernetes.core community.general
    
    # Install Helm if not present
    if ! command -v helm &> /dev/null; then
        print_step "Installing Helm..."
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
    fi
    
    # Add required Helm repositories
    helm repo add cilium https://helm.cilium.io/
    helm repo add metallb https://metallb.github.io/metallb
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
    helm repo add jetstack https://charts.jetstack.io
    helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
    helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
    helm repo add vmware-tanzu https://vmware-tanzu.github.io/helm-charts
    helm repo update
    
    # Set kubeconfig
    export KUBECONFIG=/tmp/kubeconfig
    
    ansible-playbook \
        -i /tmp/inventory.ini \
        -e @"$WORK_DIR/extra_vars.yml" \
        deployments/03-applications/install-apps.yml
    
    print_success "Applications installed successfully"
}

# Show cluster information
show_cluster_info() {
    print_step "Cluster deployment complete!"
    echo
    print_success "Cluster Information:"
    echo "  • Cluster Name: $CLUSTER_NAME"
    echo "  • Controllers: $CONTROLLER_COUNT"
    echo "  • Workers: $WORKER_COUNT"
    echo "  • Network: $NETWORK_CIDR"
    echo
    print_success "Access Information:"
    echo "  • Kubeconfig: /tmp/kubeconfig"
    echo "  • Copy to default location: cp /tmp/kubeconfig ~/.kube/config"
    echo
    print_success "Installed Applications:"
    if [[ "$(yq eval '.data.install_monitoring' "$CONFIG_FILE")" == "true" ]]; then
        echo "  • Grafana: kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80"
    fi
    if [[ "$(yq eval '.data.install_ingress_nginx' "$CONFIG_FILE")" == "true" ]]; then
        echo "  • Ingress Controller: kubectl get svc -n ingress-nginx"
    fi
    echo
    print_success "Next Steps:"
    echo "  1. Copy kubeconfig: cp /tmp/kubeconfig ~/.kube/config"
    echo "  2. Verify cluster: kubectl get nodes"
    echo "  3. Check applications: kubectl get pods --all-namespaces"
}

# Main execution
main() {
    echo "🚀 InfraFlux Automatic Deployment"
    echo "=================================="
    echo
    
    check_prerequisites
    parse_config
    deploy_infrastructure
    setup_k3s
    install_applications
    show_cluster_info
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "infrastructure")
        check_prerequisites
        parse_config
        deploy_infrastructure
        ;;
    "k3s")
        check_prerequisites
        parse_config
        setup_k3s
        ;;
    "apps")
        check_prerequisites
        parse_config
        install_applications
        ;;
    "config")
        parse_config
        cat "$WORK_DIR/extra_vars.yml"
        ;;
    *)
        echo "Usage: $0 [deploy|infrastructure|k3s|apps|config]"
        echo "  deploy         - Full deployment (default)"
        echo "  infrastructure - Create VMs only"
        echo "  k3s           - Setup K3s cluster only"
        echo "  apps          - Install applications only"
        echo "  config        - Show parsed configuration"
        exit 1
        ;;
esac
