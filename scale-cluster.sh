#!/bin/bash
# InfraFlux Cluster Scaling Script
# Usage: ./scale-cluster.sh <target_worker_count> [scale_operation]

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONFIG_FILE="${CONFIG_FILE:-config/cluster-config.yaml}"
TARGET_WORKER_COUNT="${1:-}"
SCALE_OPERATION="${2:-auto}"

print_banner() {
    echo -e "${BLUE}"
    echo "██╗███╗   ██╗███████╗██████╗  █████╗ ███████╗██╗     ██╗   ██╗██╗  ██╗"
    echo "██║████╗  ██║██╔════╝██╔══██╗██╔══██╗██╔════╝██║     ██║   ██║╚██╗██╔╝"
    echo "██║██╔██╗ ██║█████╗  ██████╔╝███████║█████╗  ██║     ██║   ██║ ╚███╔╝ "
    echo "██║██║╚██╗██║██╔══╝  ██╔══██╗██╔══██║██╔══╝  ██║     ██║   ██║ ██╔██╗ "
    echo "██║██║ ╚████║██║     ██║  ██║██║  ██║██║     ███████╗╚██████╔╝██╔╝ ██╗"
    echo "╚═╝╚═╝  ╚═══╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝"
    echo -e "${NC}"
    echo -e "${GREEN}🔄 Kubernetes Cluster Scaling with Native K3s${NC}"
    echo "================================================="
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

show_help() {
    echo "InfraFlux Cluster Scaling"
    echo "========================="
    echo
    echo "Usage: $0 <target_worker_count> [scale_operation]"
    echo
    echo "Arguments:"
    echo "  target_worker_count    Target number of worker nodes (1-10)"
    echo "  scale_operation       Scaling operation: auto, scale-up, scale-down"
    echo
    echo "Examples:"
    echo "  $0 5                  # Scale to 5 worker nodes"
    echo "  $0 1 scale-down       # Scale down to 1 worker"
    echo "  $0 8 scale-up         # Scale up to 8 workers"
    echo
    echo "Environment Variables:"
    echo "  CONFIG_FILE           Path to cluster config (default: config/cluster-config.yaml)"
    echo "  PROXMOX_PASSWORD      Proxmox password (will prompt if not set)"
    echo
    echo "Current Configuration:"
    if [[ -f "$CONFIG_FILE" ]]; then
        current_workers=$(yq eval '.data.worker_count' "$CONFIG_FILE" 2>/dev/null || echo "unknown")
        min_workers=$(yq eval '.data.min_worker_count' "$CONFIG_FILE" 2>/dev/null || echo "1")
        max_workers=$(yq eval '.data.max_worker_count' "$CONFIG_FILE" 2>/dev/null || echo "10")
        echo "  Current workers: $current_workers"
        echo "  Min workers: $min_workers"
        echo "  Max workers: $max_workers"
    else
        echo "  Config file not found: $CONFIG_FILE"
    fi
}

validate_input() {
    if [[ -z "$TARGET_WORKER_COUNT" ]]; then
        print_error "Target worker count is required"
        show_help
        exit 1
    fi

    if ! [[ "$TARGET_WORKER_COUNT" =~ ^[0-9]+$ ]]; then
        print_error "Target worker count must be a number"
        exit 1
    fi

    if [[ ! -f "$CONFIG_FILE" ]]; then
        print_error "Configuration file not found: $CONFIG_FILE"
        print_step "Run './configure.sh' first to create the configuration."
        exit 1
    fi

    # Get current configuration
    CURRENT_WORKER_COUNT=$(yq eval '.data.worker_count' "$CONFIG_FILE")
    MIN_WORKER_COUNT=$(yq eval '.data.min_worker_count' "$CONFIG_FILE")
    MAX_WORKER_COUNT=$(yq eval '.data.max_worker_count' "$CONFIG_FILE")
    ENABLE_VM_SCALING=$(yq eval '.data.enable_vm_scaling' "$CONFIG_FILE")

    if [[ "$ENABLE_VM_SCALING" != "true" ]]; then
        print_error "VM scaling is disabled in configuration"
        print_step "Set 'enable_vm_scaling: \"true\"' in $CONFIG_FILE"
        exit 1
    fi

    if [[ "$TARGET_WORKER_COUNT" -lt "$MIN_WORKER_COUNT" ]]; then
        print_error "Target worker count ($TARGET_WORKER_COUNT) is below minimum ($MIN_WORKER_COUNT)"
        exit 1
    fi

    if [[ "$TARGET_WORKER_COUNT" -gt "$MAX_WORKER_COUNT" ]]; then
        print_error "Target worker count ($TARGET_WORKER_COUNT) exceeds maximum ($MAX_WORKER_COUNT)"
        exit 1
    fi
}

run_scaling() {
    print_step "Starting cluster scaling operation..."

    # Prompt for Proxmox password if not set
    if [[ -z "${PROXMOX_PASSWORD:-}" ]]; then
        read -r -s -p "Enter Proxmox password: " PROXMOX_PASSWORD
        echo
        export PROXMOX_PASSWORD
    fi

    # Create work directory and variables
    WORK_DIR="/tmp/infraflux-scaling"
    mkdir -p "$WORK_DIR"

    # Generate Ansible extra vars
    cat >"$WORK_DIR/scaling_vars.yml" <<EOF
# InfraFlux Scaling Variables
target_worker_count: $TARGET_WORKER_COUNT
scale_operation: "$SCALE_OPERATION"
proxmox_password: "$PROXMOX_PASSWORD"
EOF

    # Run scaling playbook
    print_step "Executing scaling playbook..."
    
    ansible-playbook playbooks/scaling.yml \
        -e @"$WORK_DIR/scaling_vars.yml" \
        -e @config/cluster-config.yaml \
        -v

    print_success "Scaling operation completed!"
}

show_status() {
    print_step "Cluster status after scaling:"
    
    if command -v kubectl &>/dev/null; then
        echo
        echo "=== Cluster Nodes ==="
        kubectl get nodes -o wide || echo "kubectl not configured or cluster not accessible"
        
        echo
        echo "=== Worker Node Status ==="
        kubectl get nodes -l node-role.kubernetes.io/worker --no-headers | wc -l | xargs echo "Active worker nodes:" || echo "Cannot determine worker count"
        
        echo
        echo "=== Pod Distribution ==="
        kubectl top nodes 2>/dev/null || echo "Metrics not available (install metrics-server)"
    else
        print_warning "kubectl not found - install kubectl to see cluster status"
    fi
}

# Main execution
main() {
    if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
        show_help
        exit 0
    fi

    print_banner
    validate_input
    
    print_step "Scaling Configuration:"
    echo "  Current workers: $CURRENT_WORKER_COUNT"
    echo "  Target workers: $TARGET_WORKER_COUNT"
    echo "  Scale operation: $SCALE_OPERATION"
    echo "  Min workers: $MIN_WORKER_COUNT"
    echo "  Max workers: $MAX_WORKER_COUNT"
    echo

    # Confirm operation
    if [[ "$TARGET_WORKER_COUNT" != "$CURRENT_WORKER_COUNT" ]]; then
        read -r -p "Proceed with scaling operation? [y/N] " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            print_step "Scaling operation cancelled"
            exit 0
        fi
    else
        print_step "No scaling required - target matches current worker count"
        show_status
        exit 0
    fi

    run_scaling
    show_status
    
    print_success "🎉 Cluster scaling completed successfully!"
    echo
    echo "Next steps:"
    echo "• Verify cluster health: kubectl get nodes"
    echo "• Check pod distribution: kubectl get pods -A -o wide"
    echo "• Monitor cluster: ./deploy.sh monitoring"
}

main "$@"