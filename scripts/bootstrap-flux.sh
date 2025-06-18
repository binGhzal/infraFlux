#!/bin/bash
# InfraFlux Flux Bootstrap Script
# This script configures Flux GitOps after Ansible deploys the cluster

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[FLUX-BOOTSTRAP]${NC} $*"
}

success() {
    echo -e "${GREEN}✅${NC} $*"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $*"
}

error() {
    echo -e "${RED}❌${NC} $*"
}

# Configuration
GITHUB_USER="${GITHUB_USER:-}"
GITHUB_REPO="${GITHUB_REPO:-infraflux}"
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
CLUSTER_ENV="${CLUSTER_ENV:-production}"

usage() {
    cat << EOF
InfraFlux Flux Bootstrap Script

This script bootstraps Flux GitOps for InfraFlux after Ansible deployment.

USAGE:
    ./scripts/bootstrap-flux.sh [OPTIONS]

ENVIRONMENT VARIABLES:
    GITHUB_USER     GitHub username (required)
    GITHUB_TOKEN    GitHub personal access token (required)
    GITHUB_REPO     GitHub repository name (default: infraflux)
    CLUSTER_ENV     Cluster environment: production|staging (default: production)

EXAMPLES:
    # Bootstrap production cluster
    GITHUB_USER=myuser GITHUB_TOKEN=ghp_xxx ./scripts/bootstrap-flux.sh

    # Bootstrap staging cluster
    CLUSTER_ENV=staging GITHUB_USER=myuser GITHUB_TOKEN=ghp_xxx ./scripts/bootstrap-flux.sh

OPTIONS:
    -h, --help      Show this help message
    -v, --verbose   Enable verbose output

PREREQUISITES:
    - Kubernetes cluster deployed by Ansible
    - kubectl configured for cluster access
    - flux CLI installed
    - GitHub repository with InfraFlux code
EOF
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check flux CLI
    if ! command -v flux >/dev/null 2>&1; then
        error "flux CLI not found. Install from: https://fluxcd.io/flux/installation/"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl >/dev/null 2>&1; then
        error "kubectl not found. Ensure Kubernetes cluster is accessible."
        exit 1
    fi
    
    # Check cluster connectivity
    if ! kubectl cluster-info >/dev/null 2>&1; then
        error "Cannot connect to Kubernetes cluster. Check kubeconfig."
        exit 1
    fi
    
    # Check required environment variables
    if [[ -z "$GITHUB_USER" || -z "$GITHUB_TOKEN" ]]; then
        error "GITHUB_USER and GITHUB_TOKEN environment variables are required."
        usage
        exit 1
    fi
    
    success "Prerequisites check passed"
}

bootstrap_flux() {
    log "Bootstrapping Flux for ${CLUSTER_ENV} environment..."
    
    # Verify Flux prerequisites
    flux check --pre
    
    # Bootstrap Flux
    flux bootstrap github \
        --owner="${GITHUB_USER}" \
        --repository="${GITHUB_REPO}" \
        --branch=main \
        --path="clusters/${CLUSTER_ENV}" \
        --personal \
        --private=false
        
    success "Flux bootstrap completed"
}

verify_deployment() {
    log "Verifying Flux deployment..."
    
    # Wait for Flux system to be ready
    kubectl wait --for=condition=ready pod -l app=source-controller -n flux-system --timeout=300s
    kubectl wait --for=condition=ready pod -l app=kustomize-controller -n flux-system --timeout=300s
    kubectl wait --for=condition=ready pod -l app=helm-controller -n flux-system --timeout=300s
    
    # Check Flux status
    flux get all --all-namespaces
    
    success "Flux is operational"
}

main() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -v|--verbose)
                set -x
                shift
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    log "Starting Flux bootstrap for InfraFlux..."
    log "Environment: ${CLUSTER_ENV}"
    log "Repository: ${GITHUB_USER}/${GITHUB_REPO}"
    
    check_prerequisites
    bootstrap_flux
    verify_deployment
    
    success "🎉 Flux GitOps successfully bootstrapped!"
    log "Monitor with: flux get kustomizations --watch"
    log "View logs with: flux logs --all-namespaces"
}

main "$@"