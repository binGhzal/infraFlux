#!/bin/bash

# InfraFlux Deployment Script
# This script provides a convenient way to run deployments with different environments

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="$SCRIPT_DIR"

# Default values
INVENTORY="hosts.ci"
PLAYBOOK="deploy.yml"
TAGS=""
LIMIT=""
VERBOSE=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENV    Environment to deploy (ci, prod, crunchbits)"
    echo "  -p, --playbook PLAYBOOK  Specific playbook to run (default: deploy.yml)"
    echo "  -t, --tags TAGS          Run only tasks with these tags"
    echo "  -l, --limit HOSTS        Limit deployment to specific hosts"
    echo "  -v, --verbose           Verbose output"
    echo "  -h, --help              Show this help"
    echo ""
    echo "Examples:"
    echo "  $0 -e ci                           # Deploy to CI environment"
    echo "  $0 -e ci -t node,k3s-server       # Deploy only node and k3s-server tasks"
    echo "  $0 -e ci -l pixie01                # Deploy only to pixie01"
    echo "  $0 -p playbooks/workers.yml -e ci # Deploy only workers"
    echo ""
    echo "Available playbooks:"
    echo "  deploy.yml                         # Full deployment"
    echo "  playbooks/infrastructure.yml      # Proxmox VMs only"
    echo "  playbooks/node-preparation.yml    # Node preparation only"
    echo "  playbooks/k3s-cluster.yml         # K3s masters only"
    echo "  playbooks/controllers.yml         # Controllers only"
    echo "  playbooks/workers.yml             # Workers only"
    echo "  playbooks/applications.yml        # Applications only"
    echo "  playbooks/speedtesters.yml        # Speedtesters only"
}

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
    -e | --environment)
        ENVIRONMENT="$2"
        shift 2
        ;;
    -p | --playbook)
        PLAYBOOK="$2"
        shift 2
        ;;
    -t | --tags)
        TAGS="$2"
        shift 2
        ;;
    -l | --limit)
        LIMIT="$2"
        shift 2
        ;;
    -v | --verbose)
        VERBOSE="-vv"
        shift
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        error "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
done

# Set inventory based on environment
case $ENVIRONMENT in
ci)
    INVENTORY="hosts.ci"
    ;;
prod)
    INVENTORY="hosts"
    ;;
crunchbits)
    INVENTORY="hosts.cc"
    ;;
*)
    if [ -z "$ENVIRONMENT" ]; then
        warning "No environment specified, using default: ci"
        INVENTORY="hosts.ci"
    else
        error "Unknown environment: $ENVIRONMENT"
        echo "Available environments: ci, prod, crunchbits"
        exit 1
    fi
    ;;
esac

# Check if inventory file exists
if [ ! -f "$ANSIBLE_DIR/$INVENTORY" ]; then
    error "Inventory file not found: $ANSIBLE_DIR/$INVENTORY"
    exit 1
fi

# Check if playbook exists
if [ ! -f "$ANSIBLE_DIR/$PLAYBOOK" ]; then
    error "Playbook not found: $ANSIBLE_DIR/$PLAYBOOK"
    exit 1
fi

# Build ansible-playbook command
ANSIBLE_CMD="ansible-playbook -i $INVENTORY $PLAYBOOK"

if [ -n "$TAGS" ]; then
    ANSIBLE_CMD="$ANSIBLE_CMD --tags $TAGS"
fi

if [ -n "$LIMIT" ]; then
    ANSIBLE_CMD="$ANSIBLE_CMD --limit $LIMIT"
fi

if [ -n "$VERBOSE" ]; then
    ANSIBLE_CMD="$ANSIBLE_CMD $VERBOSE"
fi

# Show what we're about to run
log "Running deployment with the following parameters:"
echo "  Environment: ${ENVIRONMENT:-ci}"
echo "  Inventory: $INVENTORY"
echo "  Playbook: $PLAYBOOK"
if [ -n "$TAGS" ]; then
    echo "  Tags: $TAGS"
fi
if [ -n "$LIMIT" ]; then
    echo "  Limit: $LIMIT"
fi
echo "  Command: $ANSIBLE_CMD"
echo ""

# Confirm before running
read -p "Do you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Deployment cancelled"
    exit 0
fi

# Change to ansible directory and run the command
cd "$ANSIBLE_DIR"
log "Starting deployment..."

if eval "$ANSIBLE_CMD"; then
    log "Deployment completed successfully!"
else
    error "Deployment failed!"
    exit 1
fi
