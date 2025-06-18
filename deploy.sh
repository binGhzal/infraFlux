#!/bin/bash
set -euo pipefail

# InfraFlux - Simplified Unified Deployment Script
# This script replaces the complex deployment structure with a single, streamlined approach

CONFIG_FILE="${1:-config/cluster-config.yaml}"
PHASE="${2:-all}"
WORK_DIR="/tmp/infraflux"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "██╗███╗   ██╗███████╗██████╗  █████╗ ███████╗██╗     ██╗   ██╗██╗  ██╗"
    echo "██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██╔════╝██║     ██║   ██║╚██╗██╔╝"
    echo "██║██╔██╗ ██║█████╗  ██████╔╝███████║█████╗  ██║     ██║   ██║ ╚███╔╝ "
    echo "██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██╔══╝  ██║     ██║   ██║ ██╔██╗ "
    echo "██║██║ ╚████║██║     ██║  ██║██║  ██║██║     ███████╗╚██████╔╝██╔╝ ██╗"
    echo "╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${GREEN}🚀 Kubernetes Cluster Deployment with Native K3s Features${NC}"
    echo "==========================================================="
    echo
}

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

# Check and install prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."

    local missing_tools=()
    local tools=("ansible" "terraform" "yq" "kubectl")

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        print_warning "Missing tools: ${missing_tools[*]}"
        print_step "Installing missing tools..."

        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS with Homebrew
            if ! command -v brew &>/dev/null; then
                print_error "Homebrew not found. Please install Homebrew first."
                exit 1
            fi
            brew install "${missing_tools[@]}"
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            # Linux
            if command -v apt-get &>/dev/null; then
                sudo apt-get update
                for tool in "${missing_tools[@]}"; do
                    case $tool in
                    ansible)
                        sudo apt-get install -y ansible
                        ;;
                    terraform)
                        curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -
                        sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"
                        sudo apt-get update && sudo apt-get install terraform
                        ;;
                    yq)
                        sudo wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
                        sudo chmod +x /usr/local/bin/yq
                        ;;
                    kubectl)
                        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                        sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
                        ;;
                    esac
                done
            else
                print_error "Unsupported Linux distribution. Please install tools manually."
                exit 1
            fi
        fi
    fi

    print_success "Prerequisites checked"
}

# Parse configuration and setup variables
parse_config() {
    print_step "Parsing configuration from $CONFIG_FILE..."

    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        print_step "Run './configure.sh' first to create the configuration."
        exit 1
    fi

    # Create work directory
    mkdir -p "$WORK_DIR"

    # Extract configuration values
    CLUSTER_NAME=$(yq eval '.data.cluster_name' "$CONFIG_FILE")
    PROXMOX_HOST=$(yq eval '.data.proxmox_host' "$CONFIG_FILE")
    PROXMOX_USER=$(yq eval '.data.proxmox_user' "$CONFIG_FILE")
    PROXMOX_NODE=$(yq eval '.data.proxmox_node' "$CONFIG_FILE")
    CONTROLLER_COUNT=$(yq eval '.data.controller_count' "$CONFIG_FILE")
    WORKER_COUNT=$(yq eval '.data.worker_count' "$CONFIG_FILE")
    NETWORK_CIDR=$(yq eval '.data.network_cidr' "$CONFIG_FILE")

    # Export variables for use in subprocesses
    export CLUSTER_NAME PROXMOX_HOST PROXMOX_USER PROXMOX_NODE
    export CONTROLLER_COUNT WORKER_COUNT NETWORK_CIDR

    # Auto-detect network if set to "auto"
    if [[ "$NETWORK_CIDR" == "auto" ]]; then
        print_step "Auto-detecting network configuration..."
        NETWORK_CIDR=$(ip route | grep -E "192\.168\.|10\.|172\." | head -1 | awk '{print $1}' 2>/dev/null || echo "192.168.1.0/24")
        print_success "Detected network: $NETWORK_CIDR"
    fi

    # Generate Ansible extra vars
    cat >"$WORK_DIR/extra_vars.yml" <<EOF
# InfraFlux Configuration Variables
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
k3s_disable_traefik: $(yq eval '.data.k3s_disable_traefik' "$CONFIG_FILE")
k3s_disable_servicelb: $(yq eval '.data.k3s_disable_servicelb' "$CONFIG_FILE")
install_cilium: $(yq eval '.data.install_cilium' "$CONFIG_FILE")
install_metallb: $(yq eval '.data.install_metallb' "$CONFIG_FILE")
install_cert_manager: $(yq eval '.data.install_cert_manager' "$CONFIG_FILE")
install_monitoring: $(yq eval '.data.install_monitoring' "$CONFIG_FILE")
traefik_dashboard_enabled: $(yq eval '.data.traefik_dashboard_enabled' "$CONFIG_FILE")
traefik_log_level: "$(yq eval '.data.traefik_log_level' "$CONFIG_FILE")"
enable_backup: $(yq eval '.data.enable_backup' "$CONFIG_FILE")
EOF

    print_success "Configuration parsed successfully"
}

# Main deployment function
deploy() {
    print_step "Starting InfraFlux deployment (Phase: $PHASE)..."

    # Prompt for Proxmox password if not set
    if [[ -z "${PROXMOX_PASSWORD:-}" ]]; then
        read -r -s -p "Enter Proxmox password: " PROXMOX_PASSWORD
        echo
        export PROXMOX_PASSWORD
    fi

    # Install required Ansible collections
    print_step "Installing Ansible collections..."
    ansible-galaxy collection install community.general kubernetes.core &>/dev/null

    # Run the deployment based on phase
    case "${PHASE}" in
    "all")
        run_full_deployment
        ;;
    "infrastructure")
        run_phase "infrastructure"
        ;;
    "k3s")
        run_phase "k3s"
        ;;
    "apps")
        run_phase "apps"
        ;;
    "security")
        run_phase "security"
        ;;
    "monitoring")
        run_phase "monitoring"
        ;;
    "gitops")
        run_phase "gitops"
        ;;
    *)
        print_error "Invalid phase: $PHASE"
        show_help
        exit 1
        ;;
    esac
}

# Run full deployment
run_full_deployment() {
    print_step "Running full deployment..."

    ansible-playbook deploy.yml \
        -e @"$WORK_DIR/extra_vars.yml" \
        -e proxmox_password="$PROXMOX_PASSWORD" \
        -v

    show_success_info
}

# Run specific phase
run_phase() {
    local phase=$1
    print_step "Running phase: $phase"

    ansible-playbook deploy.yml \
        -e @"$WORK_DIR/extra_vars.yml" \
        -e proxmox_password="$PROXMOX_PASSWORD" \
        -e phase="$phase" \
        -v
}

# Show success information
show_success_info() {
    print_success "Deployment completed successfully!"
    echo
    echo -e "${GREEN}🎉 Your Kubernetes cluster is ready!${NC}"
    echo "==========================================="
    echo
    echo "📊 Cluster Information:"
    echo "  • Cluster Name: $CLUSTER_NAME"
    echo "  • Controllers: $CONTROLLER_COUNT"
    echo "  • Workers: $WORKER_COUNT"
    echo "  • Network: $NETWORK_CIDR"
    echo
    echo "🌐 Access Information:"
    echo "  • Kubeconfig: /tmp/kubeconfig"
    echo "  • Traefik Dashboard: http://traefik.$CLUSTER_NAME.local"
    echo "  • Hubble UI: http://hubble.$CLUSTER_NAME.local (if Cilium enabled)"
    echo
    echo "📝 Quick Commands:"
    echo "  export KUBECONFIG=/tmp/kubeconfig"
    echo "  kubectl get nodes"
    echo "  kubectl get pods -A"
    echo
    echo -e "${BLUE}🚀 Happy Kubernetesing!${NC}"
}

# Show help
show_help() {
    echo "InfraFlux - Simplified Kubernetes Deployment"
    echo "============================================="
    echo
    echo "Usage: $0 [config-file] [phase]"
    echo
    echo "Phases:"
    echo "  all            - Full deployment (default)"
    echo "  infrastructure - Create VMs only"
    echo "  k3s            - Setup K3s cluster only"
    echo "  apps           - Install applications only"
    echo "  security       - Deploy authentication & security"
    echo "  monitoring     - Deploy enhanced monitoring stack"
    echo "  gitops         - Setup GitOps with Flux CLI"
    echo
    echo "Examples:"
    echo "  $0                                    # Full deployment with default config"
    echo "  $0 config/cluster-config.yaml        # Full deployment with custom config"
    echo "  $0 config/cluster-config.yaml k3s    # Only setup K3s cluster"
    echo "  $0 config/cluster-config.yaml security # Deploy Authentik SSO"
    echo
    echo "Features:"
    echo "  ✅ Native K3s Traefik (no external NGINX)"
    echo "  ✅ Terraform + Ansible integration"
    echo "  ✅ Auto network detection"
    echo "  ✅ GitOps with Flux CLI and Kustomize"
    echo "  ✅ Authentik SSO integration"
    echo "  ✅ Sealed Secrets for GitOps"
    echo "  ✅ VM scaling capability"
    echo "  ✅ One-command deployment"
    echo
}

# Main execution
main() {
    # Check for help first, before processing arguments
    if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
        show_help
        exit 0
    fi

    case "${PHASE}" in
    "help" | "-h" | "--help")
        show_help
        exit 0
        ;;
    "all" | "infrastructure" | "k3s" | "apps")
        print_banner
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
