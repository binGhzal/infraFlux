#!/bin/bash
# InfraFlux v2.0 Flux Bootstrap Automation Script
# Automated Flux v2 installation and GitOps configuration

set -euo pipefail

# Script metadata
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly CONFIG_FILE="${1:-config/cluster-config.yaml}"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

# Default configuration
readonly DEFAULT_GIT_BRANCH="main"
readonly DEFAULT_GIT_PATH="clusters/production"
readonly DEFAULT_FLUX_NAMESPACE="flux-system"

# Configuration variables
GIT_REPOSITORY=""
GIT_BRANCH="${DEFAULT_GIT_BRANCH}"
GIT_PATH="${DEFAULT_GIT_PATH}"
FLUX_NAMESPACE="${DEFAULT_FLUX_NAMESPACE}"
CLUSTER_NAME=""
ENVIRONMENT="production"

# Logging functions
log() {
    echo -e "${BLUE}[FLUX]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
show_banner() {
    echo -e "${PURPLE}${WHITE}"
    cat << 'EOF'
  ███████╗██╗     ██╗   ██╗██╗  ██╗    ██████╗  ██████╗  ██████╗ ████████╗███████╗████████╗██████╗  █████╗ ██████╗ 
  ██╔════╝██║     ██║   ██║╚██╗██╔╝    ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝██╔════╝╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗
  █████╗  ██║     ██║   ██║ ╚███╔╝     ██████╔╝██║   ██║██║   ██║   ██║   ███████╗   ██║   ██████╔╝███████║██████╔╝
  ██╔══╝  ██║     ██║   ██║ ██╔██╗     ██╔══██╗██║   ██║██║   ██║   ██║   ╚════██║   ██║   ██╔══██╗██╔══██║██╔═══╝ 
  ██║     ███████╗╚██████╔╝██╔╝ ██╗    ██████╔╝╚██████╔╝╚██████╔╝   ██║   ███████║   ██║   ██║  ██║██║  ██║██║     
  ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝    ╚═════╝  ╚═════╝  ╚═════╝    ╚═╝   ╚══════╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     
EOF
    echo -e "${NC}"
    echo -e "${WHITE}InfraFlux v2.0 - Flux GitOps Bootstrap${NC}"
    echo -e "${BLUE}Automated GitOps setup for Talos Kubernetes platform${NC}"
    echo "================================================================================"
    echo
}

# Load configuration
load_configuration() {
    log "📝 Loading cluster configuration..."
    
    if [[ ! -f "$CONFIG_FILE" ]]; then
        error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
    
    # Extract cluster information
    CLUSTER_NAME=$(yq eval '.data.cluster_name' "$CONFIG_FILE")
    
    if [[ -z "$CLUSTER_NAME" || "$CLUSTER_NAME" == "null" ]]; then
        error "Cluster name not found in configuration"
        exit 1
    fi
    
    success "Configuration loaded: cluster '$CLUSTER_NAME'"
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --git-repo)
                GIT_REPOSITORY="$2"
                shift 2
                ;;
            --git-branch)
                GIT_BRANCH="$2"
                shift 2
                ;;
            --git-path)
                GIT_PATH="$2"
                shift 2
                ;;
            --environment)
                ENVIRONMENT="$2"
                GIT_PATH="clusters/$ENVIRONMENT"
                shift 2
                ;;
            --namespace)
                FLUX_NAMESPACE="$2"
                shift 2
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                if [[ -z "$CONFIG_FILE" ]]; then
                    CONFIG_FILE="$1"
                fi
                shift
                ;;
        esac
    done
}

# Validate prerequisites
validate_prerequisites() {
    log "🔍 Validating prerequisites..."
    
    # Check required tools
    local tools=("kubectl" "flux" "yq")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            error "Required tool not found: $tool"
            echo "Please install $tool and try again"
            exit 1
        fi
    done
    
    # Check cluster access
    if ! kubectl cluster-info &>/dev/null; then
        error "Cannot access Kubernetes cluster"
        echo "Please ensure kubeconfig is properly configured"
        exit 1
    fi
    
    # Check Flux prerequisites
    log "Checking Flux prerequisites..."
    if ! flux check --pre; then
        error "Flux prerequisites not met"
        exit 1
    fi
    
    success "Prerequisites validated"
}

# Detect Git repository
detect_git_repository() {
    if [[ -z "$GIT_REPOSITORY" ]]; then
        log "🔍 Auto-detecting Git repository..."
        
        # Try to get from git remote
        if git remote get-url origin &>/dev/null; then
            GIT_REPOSITORY=$(git remote get-url origin)
            success "Detected Git repository: $GIT_REPOSITORY"
        else
            error "Could not detect Git repository"
            echo "Please specify with --git-repo option"
            exit 1
        fi
    else
        success "Using specified Git repository: $GIT_REPOSITORY"
    fi
}

# Prepare Git repository
prepare_git_repository() {
    log "📦 Preparing Git repository..."
    
    # Ensure we're on the correct branch
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "$GIT_BRANCH" ]]; then
        warning "Current branch ($current_branch) != target branch ($GIT_BRANCH)"
        read -p "Switch to $GIT_BRANCH branch? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout "$GIT_BRANCH" || {
                error "Failed to switch to branch $GIT_BRANCH"
                exit 1
            }
        fi
    fi
    
    # Ensure repository is clean
    if ! git diff --quiet || ! git diff --staged --quiet; then
        warning "Git repository has uncommitted changes"
        read -p "Commit changes before bootstrapping? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            git add .
            git commit -m "Pre-Flux bootstrap commit - save current state"
            git push origin "$GIT_BRANCH"
        fi
    fi
    
    success "Git repository prepared"
}

# Bootstrap Flux
bootstrap_flux() {
    log "🚀 Bootstrapping Flux v2..."
    
    # Create flux-system namespace if it doesn't exist
    kubectl create namespace "$FLUX_NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -
    
    # Bootstrap Flux with GitOps
    log "Running Flux bootstrap..."
    flux bootstrap git \
        --url="$GIT_REPOSITORY" \
        --branch="$GIT_BRANCH" \
        --path="$GIT_PATH" \
        --namespace="$FLUX_NAMESPACE" \
        --components-extra="image-reflector-controller,image-automation-controller" \
        --read-write-key \
        --timeout=5m \
        --verbose
    
    success "Flux v2 bootstrapped successfully"
}

# Verify Flux installation
verify_flux_installation() {
    log "✅ Verifying Flux installation..."
    
    # Wait for Flux controllers to be ready
    log "Waiting for Flux controllers..."
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=flux -n "$FLUX_NAMESPACE" --timeout=300s
    
    # Check Flux status
    if flux check; then
        success "Flux installation verified"
    else
        error "Flux installation verification failed"
        return 1
    fi
    
    # Show Flux components
    log "Flux components:"
    kubectl get pods -n "$FLUX_NAMESPACE"
    
    # Show GitRepository status
    log "Git repository status:"
    flux get sources git -n "$FLUX_NAMESPACE"
    
    # Show Kustomizations status
    log "Kustomizations status:"
    flux get kustomizations -n "$FLUX_NAMESPACE"
}

# Deploy initial infrastructure
deploy_initial_infrastructure() {
    log "🏗️ Deploying initial infrastructure..."
    
    # Wait a moment for GitOps to sync
    sleep 30
    
    # Check infrastructure deployment
    log "Checking infrastructure controllers..."
    
    # Wait for infrastructure kustomization
    kubectl wait --for=condition=ready kustomization infrastructure -n "$FLUX_NAMESPACE" --timeout=600s || {
        warning "Infrastructure deployment taking longer than expected"
        log "Current kustomization status:"
        flux get kustomizations -n "$FLUX_NAMESPACE"
    }
    
    success "Initial infrastructure deployment completed"
}

# Show cluster status
show_cluster_status() {
    echo
    echo -e "${PURPLE}================================================================================${NC}"
    echo -e "${PURPLE}InfraFlux v2.0 GitOps Bootstrap Complete!${NC}"
    echo -e "${PURPLE}================================================================================${NC}"
    echo
    
    echo -e "${GREEN}🎉 Flux GitOps has been successfully bootstrapped!${NC}"
    echo
    
    echo -e "${BLUE}📊 Cluster Information:${NC}"
    echo -e "  • Cluster: $CLUSTER_NAME"
    echo -e "  • Environment: $ENVIRONMENT"
    echo -e "  • Flux Namespace: $FLUX_NAMESPACE"
    echo -e "  • Git Repository: $GIT_REPOSITORY"
    echo -e "  • Git Branch: $GIT_BRANCH"
    echo -e "  • Git Path: $GIT_PATH"
    echo
    
    echo -e "${BLUE}🔧 Management Commands:${NC}"
    echo -e "  • Check Flux status: ${WHITE}flux check${NC}"
    echo -e "  • View GitOps sources: ${WHITE}flux get sources git${NC}"
    echo -e "  • View kustomizations: ${WHITE}flux get kustomizations${NC}"
    echo -e "  • Force reconciliation: ${WHITE}flux reconcile kustomization flux-system${NC}"
    echo -e "  • View logs: ${WHITE}flux logs --follow${NC}"
    echo
    
    echo -e "${BLUE}📱 Next Steps:${NC}"
    echo -e "  1. Monitor GitOps synchronization with Flux dashboard"
    echo -e "  2. Verify infrastructure controllers are deployed"
    echo -e "  3. Deploy applications via Git commits"
    echo -e "  4. Access Grafana for monitoring and observability"
    echo
    
    echo -e "${GREEN}🌟 Welcome to GitOps with InfraFlux v2.0!${NC}"
}

# Show help
show_help() {
    echo "InfraFlux v2.0 Flux Bootstrap"
    echo "============================"
    echo
    echo "Usage: $0 [config-file] [options]"
    echo
    echo "Options:"
    echo "  --git-repo URL        Git repository URL (auto-detected if not specified)"
    echo "  --git-branch BRANCH   Git branch (default: main)"
    echo "  --git-path PATH       Path in repository (default: clusters/production)"
    echo "  --environment ENV     Environment (production, staging, development)"
    echo "  --namespace NS        Flux namespace (default: flux-system)"
    echo "  -h, --help           Show this help message"
    echo
    echo "Examples:"
    echo "  $0                                              # Bootstrap production environment"
    echo "  $0 --environment staging                        # Bootstrap staging environment"
    echo "  $0 --git-repo https://github.com/user/repo.git  # Use specific repository"
    echo "  $0 config/test-config.yaml --environment development"
    echo
    echo "Prerequisites:"
    echo "  • kubectl configured for target cluster"
    echo "  • flux CLI installed"
    echo "  • Git repository with push access"
    echo "  • InfraFlux GitOps structure in repository"
}

# Main execution
main() {
    show_banner
    
    # Parse arguments (after first one which is config file)
    if [[ $# -gt 1 ]]; then
        shift  # Remove config file from args
        parse_arguments "$@"
    fi
    
    load_configuration
    validate_prerequisites
    detect_git_repository
    prepare_git_repository
    bootstrap_flux
    verify_flux_installation
    deploy_initial_infrastructure
    show_cluster_status
}

# Handle help request
if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    show_help
    exit 0
fi

# Execute main function
main "$@"