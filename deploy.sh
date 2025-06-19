#!/bin/bash
# InfraFlux v2.0 - Unified Deployment Script
# Next-Generation Immutable Kubernetes Platform on Talos Linux

set -euo pipefail

# Script metadata
declare SCRIPT_DIR
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly INFRAFLUX_VERSION="2.0.0"
declare DEPLOYMENT_ID
DEPLOYMENT_ID="infraflux-$(date +%Y%m%d-%H%M%S)"
readonly DEPLOYMENT_ID

# Configuration
readonly CONFIG_FILE="${1:-config/cluster-config.yaml}"
readonly DEPLOYMENT_PHASE="${2:-all}"
readonly WORK_DIR="/tmp/infraflux-${DEPLOYMENT_ID}"
readonly LOG_FILE="${WORK_DIR}/deployment.log"

# Colors and formatting
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# State tracking
declare -a COMPLETED_PHASES=()
declare -a FAILED_PHASES=()
declare -i START_TIME
declare -i PHASE_START_TIME

# Logging functions
log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}]${NC} $1" | tee -a "${LOG_FILE}"
}

success() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] ✅${NC} $1" | tee -a "${LOG_FILE}"
}

warning() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] ⚠️${NC} $1" | tee -a "${LOG_FILE}"
}

error() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] ❌${NC} $1" | tee -a "${LOG_FILE}"
}

# Banner display
show_banner() {
    clear
    echo -e "${PURPLE}${BOLD}"
    cat <<'EOF'
  ██╗███╗   ██╗███████╗██████╗  █████╗ ███████╗██╗     ██╗   ██╗██╗  ██╗
  ██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██╔════╝██║     ██║   ██║╚██╗██╔╝
  ██║██╔██╗ ██║█████╗  ██████╔╝███████║█████╗  ██║     ██║   ██║ ╚███╔╝
  ██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██╔══╝  ██║     ██║   ██║ ██╔██╗
  ██║██║ ╚████║██║     ██║  ██║██║  ██║██║     ███████╗╚██████╔╝██╔╝ ██╗
  ╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝
EOF
    echo -e "${NC}"
    echo -e "${WHITE}${BOLD}InfraFlux v${INFRAFLUX_VERSION} - Next-Generation Immutable Kubernetes Platform${NC}"
    echo -e "${CYAN}Built on Talos Linux with GitOps Automation${NC}"
    echo "=============================================================================="
    echo
}

# Prerequisites checking
check_prerequisites() {
    log "🔍 Checking prerequisites..."

    local missing_tools=()
    local tools=("python3" "yq" "talosctl" "kubectl" "terraform")

    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -ne 0 ]; then
        error "Missing required tools: ${missing_tools[*]}"
        echo
        echo "📥 Installation instructions:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
            "python3")
                echo "  Python 3: https://www.python.org/downloads/"
                ;;
            "yq")
                echo "  yq: curl -LO https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 && sudo mv yq_linux_amd64 /usr/local/bin/yq && sudo chmod +x /usr/local/bin/yq"
                ;;
            "talosctl")
                echo "  talosctl: curl -sL https://talos.dev/install | sh"
                ;;
            "kubectl")
                echo "  kubectl: https://kubernetes.io/docs/tasks/tools/"
                ;;
            "terraform")
                echo "  terraform: https://developer.hashicorp.com/terraform/downloads"
                ;;
            esac
        done
        exit 1
    fi

    # Check Python dependencies
    if ! python3 -c "import yaml, jinja2" &>/dev/null; then
        warning "Installing Python dependencies..."
        pip3 install PyYAML Jinja2 || {
            error "Failed to install Python dependencies"
            echo "Please run: pip3 install PyYAML Jinja2"
            exit 1
        }
    fi

    success "Prerequisites verified"
}

# Configuration validation and generation
prepare_configurations() {
    log "🔧 Preparing configurations..."

    # Validate configuration file
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Configuration file not found: $CONFIG_FILE"
        echo "Please create the configuration file or run with a valid config path."
        echo "Example: ./deploy.sh config/cluster-config.yaml"
        exit 1
    fi

    # Validate configuration
    if ! python3 scripts/generate-configs.py --config "$CONFIG_FILE" --validate-only; then
        error "Configuration validation failed"
        exit 1
    fi

    # Generate all configurations
    log "Generating Talos and Terraform configurations..."
    if ! python3 scripts/generate-configs.py --config "$CONFIG_FILE" --output "$WORK_DIR"; then
        error "Configuration generation failed"
        exit 1
    fi

    success "Configurations prepared"
}

# Infrastructure deployment (Terraform)
deploy_infrastructure() {
    log "🏗️ Deploying infrastructure..."

    local terraform_dir="$WORK_DIR/terraform"

    # Get Proxmox password
    if [[ -z "${PROXMOX_PASSWORD:-}" ]]; then
        read -r -s -p "Enter Proxmox password: " PROXMOX_PASSWORD
        echo
        export PROXMOX_PASSWORD
    fi

    # Initialize Terraform
    log "Initializing Terraform..."
    if ! terraform -chdir="$terraform_dir" init; then
        error "Terraform initialization failed"
        return 1
    fi

    # Plan deployment
    log "Planning infrastructure deployment..."
    if ! terraform -chdir="$terraform_dir" plan -var="proxmox_password=$PROXMOX_PASSWORD" -out="infraflux.plan"; then
        error "Terraform planning failed"
        return 1
    fi

    # Apply deployment
    log "Creating VMs with Terraform..."
    if ! terraform -chdir="$terraform_dir" apply "infraflux.plan"; then
        error "Terraform deployment failed"
        return 1
    fi

    success "Infrastructure deployed successfully"
}

# Talos cluster bootstrap
bootstrap_cluster() {
    log "🚀 Bootstrapping Talos cluster..."

    local talos_dir="$WORK_DIR/talos"

    # Set talosconfig
    export TALOSCONFIG="$talos_dir/talosconfig"

    # Extract cluster info from config
    local cluster_name
    cluster_name=$(yq eval '.data.cluster_name' "$CONFIG_FILE")
    export cluster_name

    local control_plane_ips_array
    mapfile -t control_plane_ips_array < <(yq eval '.data.control_plane_ips[]' "$CONFIG_FILE")
    export control_plane_ips=("${control_plane_ips_array[@]}")

    local worker_ips_array
    mapfile -t worker_ips_array < <(yq eval '.data.worker_ips[]' "$CONFIG_FILE")
    export worker_ips=("${worker_ips_array[@]}")

    # Apply control plane configurations
    log "Applying control plane configurations..."
    for i in "${!control_plane_ips[@]}"; do
        local ip="${control_plane_ips[$i]}"
        log "  Configuring control plane node: $ip"

        if ! talosctl apply-config --insecure --nodes "$ip" --file "$talos_dir/controlplane-$i.yaml"; then
            error "Failed to configure control plane node: $ip"
            return 1
        fi
    done

    # Apply worker configurations
    log "Applying worker configurations..."
    for i in "${!worker_ips[@]}"; do
        local ip="${worker_ips[$i]}"
        log "  Configuring worker node: $ip"

        if ! talosctl apply-config --insecure --nodes "$ip" --file "$talos_dir/worker-$i.yaml"; then
            error "Failed to configure worker node: $ip"
            return 1
        fi
    done

    # Wait for nodes to reboot and be ready
    log "Waiting for nodes to reboot..."
    sleep 60

    # Configure talosctl endpoints
    talosctl config endpoint "${control_plane_ips[@]}"
    talosctl config node "${control_plane_ips[0]}"

    # Bootstrap the cluster
    log "Bootstrapping Kubernetes cluster..."
    if ! talosctl bootstrap; then
        error "Cluster bootstrap failed"
        return 1
    fi

    # Wait for cluster to be ready
    log "Waiting for cluster to be ready..."
    if ! talosctl health --wait-timeout=10m; then
        error "Cluster failed to become healthy"
        return 1
    fi

    # Generate kubeconfig
    log "Generating kubeconfig..."
    if ! talosctl kubeconfig "${WORK_DIR}/kubeconfig"; then
        error "Failed to generate kubeconfig"
        return 1
    fi

    export KUBECONFIG="${WORK_DIR}/kubeconfig"

    # Verify cluster
    log "Verifying cluster status..."
    kubectl cluster-info
    kubectl get nodes -o wide

    success "Talos cluster bootstrapped successfully"
}

# Core applications deployment
deploy_core_apps() {
    log "📦 Deploying core applications..."

    export KUBECONFIG="${WORK_DIR}/kubeconfig"

    # Deploy Cilium CNI
    log "Installing Cilium CNI..."
    kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/1.16.0/install/kubernetes/quick-install.yaml

    # Wait for Cilium to be ready
    log "Waiting for Cilium to be ready..."
    kubectl wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=300s

    # Deploy cert-manager
    log "Installing cert-manager..."
    kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

    # Wait for cert-manager to be ready
    log "Waiting for cert-manager to be ready..."
    kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s

    success "Core applications deployed"
}

# GitOps deployment with Flux
deploy_gitops() {
    log "🔄 Deploying GitOps with Flux v2..."

    export KUBECONFIG="${WORK_DIR}/kubeconfig"

    # Check if Flux is available
    if ! command -v flux &>/dev/null; then
        warning "Flux CLI not found. Installing Flux manually..."

        # Install Flux manually
        kubectl apply -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

        # Wait for Flux controllers
        log "Waiting for Flux controllers to be ready..."
        kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=flux -n flux-system --timeout=300s

        success "Flux installed manually"
    else
        # Use Flux bootstrap script
        log "Bootstrapping Flux with GitOps automation..."

        if [[ -x "${SCRIPT_DIR}/bootstrap-flux.sh" ]]; then
            "${SCRIPT_DIR}/bootstrap-flux.sh" "$CONFIG_FILE" --environment production
        else
            warning "Flux bootstrap script not found. Installing basic Flux..."
            kubectl apply -f https://github.com/fluxcd/flux2/releases/latest/download/install.yaml
            kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=flux -n flux-system --timeout=300s
        fi
    fi

    success "GitOps deployment completed"
}

# Phase execution framework
execute_phase() {
    local phase_name="$1"
    local phase_function="$2"

    PHASE_START_TIME=$(date +%s)

    log "🚀 Starting Phase: ${phase_name}"

    if $phase_function; then
        local phase_duration=$(($(date +%s) - PHASE_START_TIME))
        COMPLETED_PHASES+=("${phase_name}")
        success "Phase '${phase_name}' completed in ${phase_duration}s"
        return 0
    else
        local phase_duration=$(($(date +%s) - PHASE_START_TIME))
        FAILED_PHASES+=("${phase_name}")
        error "Phase '${phase_name}' failed after ${phase_duration}s"
        return 1
    fi
}

# Show cluster information
show_cluster_info() {
    echo
    success "🎉 InfraFlux v2.0 deployment completed successfully!"
    echo
    echo -e "${GREEN}🌟 Your Talos Kubernetes cluster is ready!${NC}"
    echo "==========================================="
    echo
    echo "📊 Cluster Information:"
    echo "  • Cluster Name: $(yq eval '.data.cluster_name' "$CONFIG_FILE")"
    echo "  • Talos Version: $(yq eval '.data.talos_version' "$CONFIG_FILE")"
    echo "  • Kubernetes Version: $(yq eval '.data.kubernetes_version' "$CONFIG_FILE")"
    echo "  • Control Planes: $(yq eval '.data.control_plane_ips | length' "$CONFIG_FILE")"
    echo "  • Workers: $(yq eval '.data.worker_ips | length' "$CONFIG_FILE")"
    echo
    echo "🔧 Access Information:"
    echo "  • Kubeconfig: ${WORK_DIR}/kubeconfig"
    echo "  • Talosconfig: ${WORK_DIR}/talos/talosconfig"
    echo
    echo "📝 Quick Commands:"
    echo "  export KUBECONFIG=${WORK_DIR}/kubeconfig"
    echo "  export TALOSCONFIG=${WORK_DIR}/talos/talosconfig"
    echo "  kubectl get nodes"
    echo "  talosctl health"
    echo
    echo -e "${CYAN}🎯 Next Steps:${NC}"
    echo "  1. Set up GitOps with Flux"
    echo "  2. Deploy applications via Git"
    echo "  3. Configure monitoring and security"
    echo
    echo -e "${BLUE}🚀 Welcome to the future of Kubernetes!${NC}"
}

# Show help
show_help() {
    echo "InfraFlux v2.0 - Next-Generation Kubernetes Deployment"
    echo "======================================================"
    echo
    echo "Usage: $0 [config-file] [phase]"
    echo
    echo "Phases:"
    echo "  all            - Full deployment (default)"
    echo "  infrastructure - Create VMs only"
    echo "  cluster        - Bootstrap Talos cluster only"
    echo "  apps           - Deploy core applications only"
    echo "  gitops         - Setup GitOps with Flux v2"
    echo
    echo "Examples:"
    echo "  $0                                    # Full deployment with default config"
    echo "  $0 config/cluster-config.yaml        # Full deployment with custom config"
    echo "  $0 config/cluster-config.yaml cluster # Only bootstrap cluster"
    echo
    echo "Features:"
    echo "  ✅ Talos Linux immutable infrastructure"
    echo "  ✅ API-only operations (no SSH)"
    echo "  ✅ Single command deployment"
    echo "  ✅ GitOps-ready architecture"
    echo "  ✅ Enterprise-grade security"
    echo
}

# Main execution
main() {
    # Check for help
    if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
        show_help
        exit 0
    fi

    # Setup
    START_TIME=$(date +%s)
    mkdir -p "$WORK_DIR"
    exec > >(tee -a "${LOG_FILE}")
    exec 2>&1

    show_banner

    log "🎯 Deployment ID: ${DEPLOYMENT_ID}"
    log "📁 Working Directory: ${WORK_DIR}"
    log "📝 Configuration: ${CONFIG_FILE}"
    log "🔄 Phase: ${DEPLOYMENT_PHASE}"

    # Execute deployment phases
    case "${DEPLOYMENT_PHASE}" in
    "all")
        execute_phase "Prerequisites" check_prerequisites || exit 1
        execute_phase "Configuration" prepare_configurations || exit 1
        execute_phase "Infrastructure" deploy_infrastructure || exit 1
        execute_phase "Cluster Bootstrap" bootstrap_cluster || exit 1
        execute_phase "Core Applications" deploy_core_apps || exit 1
        execute_phase "GitOps Setup" deploy_gitops || exit 1
        ;;
    "infrastructure")
        execute_phase "Prerequisites" check_prerequisites || exit 1
        execute_phase "Configuration" prepare_configurations || exit 1
        execute_phase "Infrastructure" deploy_infrastructure || exit 1
        ;;
    "cluster")
        execute_phase "Prerequisites" check_prerequisites || exit 1
        execute_phase "Configuration" prepare_configurations || exit 1
        execute_phase "Cluster Bootstrap" bootstrap_cluster || exit 1
        ;;
    "apps")
        execute_phase "Prerequisites" check_prerequisites || exit 1
        execute_phase "Core Applications" deploy_core_apps || exit 1
        ;;
    "gitops")
        execute_phase "Prerequisites" check_prerequisites || exit 1
        execute_phase "GitOps Setup" deploy_gitops || exit 1
        ;;
    *)
        error "Invalid phase: ${DEPLOYMENT_PHASE}"
        show_help
        exit 1
        ;;
    esac

    # Success summary
    local total_duration=$(($(date +%s) - START_TIME))
    echo
    success "🎉 InfraFlux v2.0 deployment completed successfully!"
    log "⏱️  Total duration: ${total_duration}s"
    log "✅ Completed phases: ${COMPLETED_PHASES[*]}"

    if [[ ${#FAILED_PHASES[@]} -gt 0 ]]; then
        warning "❌ Failed phases: ${FAILED_PHASES[*]}"
    fi

    show_cluster_info
}

# Execute main function
main "$@"
