#!/bin/bash
set -euo pipefail

# InfraFlux Configuration Wizard
# This script helps users create their cluster-config.yaml file

CONFIG_FILE="config/cluster-config.yaml"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}$1${NC}"
}

print_info() {
    echo -e "${YELLOW}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Auto-detect network configuration
detect_network() {
    local network
    network=$(ip route | grep -E "192\.168\.|10\.|172\." | head -1 | awk '{print $1}' 2>/dev/null || echo "")
    if [[ -z "$network" ]]; then
        # Try alternative method for macOS
        network=$(route -n get default 2>/dev/null | grep interface | awk '{print $2}' | xargs -I {} ipconfig getifaddr {} 2>/dev/null | sed 's/\.[0-9]*$/\.0\/24/' || echo "192.168.1.0/24")
    fi
    echo "$network"
}

# Create configuration directory
mkdir -p config

echo "🌟 Welcome to InfraFlux Configuration Wizard"
echo "============================================"
echo
print_info "This wizard will help you create a configuration file for your Kubernetes cluster."
echo

# Cluster Configuration
print_header "📋 Cluster Configuration"
read -p "Cluster name [infraflux-cluster]: " CLUSTER_NAME
CLUSTER_NAME=${CLUSTER_NAME:-infraflux-cluster}

# Auto-detect network
DETECTED_NETWORK=$(detect_network)
print_info "Auto-detected network: $DETECTED_NETWORK"
read -p "Network CIDR [$DETECTED_NETWORK]: " NETWORK_CIDR
NETWORK_CIDR=${NETWORK_CIDR:-$DETECTED_NETWORK}

echo

# Proxmox Configuration
print_header "🖥️  Proxmox Configuration"
read -p "Proxmox host (IP or FQDN): " PROXMOX_HOST
read -p "Proxmox username [root@pam]: " PROXMOX_USER
PROXMOX_USER=${PROXMOX_USER:-root@pam}
read -p "Proxmox node name [pve]: " PROXMOX_NODE
PROXMOX_NODE=${PROXMOX_NODE:-pve}
read -p "Storage pool [local-lvm]: " PROXMOX_STORAGE
PROXMOX_STORAGE=${PROXMOX_STORAGE:-local-lvm}

echo

# Node Configuration
print_header "🔧 Node Configuration"
read -p "Number of controller nodes [3]: " CONTROLLER_COUNT
CONTROLLER_COUNT=${CONTROLLER_COUNT:-3}
read -p "Number of worker nodes [3]: " WORKER_COUNT
WORKER_COUNT=${WORKER_COUNT:-3}
read -p "VM memory in MB [4096]: " VM_MEMORY
VM_MEMORY=${VM_MEMORY:-4096}
read -p "VM CPU cores [2]: " VM_CORES
VM_CORES=${VM_CORES:-2}
read -p "VM disk size [20G]: " VM_DISK_SIZE
VM_DISK_SIZE=${VM_DISK_SIZE:-20G}

echo

# Application Configuration
print_header "📦 Application Configuration"
echo "Which applications would you like to install? (y/n)"
read -p "Cilium CNI [Y/n]: " INSTALL_CILIUM
INSTALL_CILIUM=$(echo "${INSTALL_CILIUM:-y}" | tr '[:upper:]' '[:lower:]')
[[ "$INSTALL_CILIUM" =~ ^(y|yes)$ ]] && INSTALL_CILIUM="true" || INSTALL_CILIUM="false"

read -p "MetalLB Load Balancer [Y/n]: " INSTALL_METALLB
INSTALL_METALLB=$(echo "${INSTALL_METALLB:-y}" | tr '[:upper:]' '[:lower:]')
[[ "$INSTALL_METALLB" =~ ^(y|yes)$ ]] && INSTALL_METALLB="true" || INSTALL_METALLB="false"

read -p "Ingress NGINX [Y/n]: " INSTALL_INGRESS
INSTALL_INGRESS=$(echo "${INSTALL_INGRESS:-y}" | tr '[:upper:]' '[:lower:]')
[[ "$INSTALL_INGRESS" =~ ^(y|yes)$ ]] && INSTALL_INGRESS="true" || INSTALL_INGRESS="false"

read -p "Cert Manager [Y/n]: " INSTALL_CERT_MANAGER
INSTALL_CERT_MANAGER=$(echo "${INSTALL_CERT_MANAGER:-y}" | tr '[:upper:]' '[:lower:]')
[[ "$INSTALL_CERT_MANAGER" =~ ^(y|yes)$ ]] && INSTALL_CERT_MANAGER="true" || INSTALL_CERT_MANAGER="false"

read -p "Prometheus Monitoring [Y/n]: " INSTALL_MONITORING
INSTALL_MONITORING=$(echo "${INSTALL_MONITORING:-y}" | tr '[:upper:]' '[:lower:]')
[[ "$INSTALL_MONITORING" =~ ^(y|yes)$ ]] && INSTALL_MONITORING="true" || INSTALL_MONITORING="false"

read -p "Backup with Velero [y/N]: " ENABLE_BACKUP
ENABLE_BACKUP=$(echo "${ENABLE_BACKUP:-n}" | tr '[:upper:]' '[:lower:]')
[[ "$ENABLE_BACKUP" =~ ^(y|yes)$ ]] && ENABLE_BACKUP="true" || ENABLE_BACKUP="false"

echo

# Generate configuration file
print_header "📄 Generating Configuration"

cat >"$CONFIG_FILE" <<EOF
# InfraFlux Cluster Configuration
# This file defines your entire infrastructure deployment
# Edit the values below and run ./deploy.sh to deploy your cluster

apiVersion: v1
kind: ConfigMap
metadata:
  name: infraflux-config
  namespace: flux-system
data:
  # Cluster Configuration
  cluster_name: "$CLUSTER_NAME"
  cluster_domain: "cluster.local"

  # Network Configuration
  network_cidr: "$NETWORK_CIDR"
  service_cidr: "10.96.0.0/12"
  pod_cidr: "10.244.0.0/16"

  # Proxmox Configuration
  proxmox_host: "$PROXMOX_HOST"
  proxmox_user: "$PROXMOX_USER"
  proxmox_node: "$PROXMOX_NODE"
  proxmox_storage: "$PROXMOX_STORAGE"

  # VM Template Configuration
  vm_template_id: "9000"
  vm_template_name: "ubuntu-24.04-template"

  # Node Configuration
  controller_count: "$CONTROLLER_COUNT"
  worker_count: "$WORKER_COUNT"
  vm_memory: "$VM_MEMORY"
  vm_cores: "$VM_CORES"
  vm_disk_size: "$VM_DISK_SIZE"

  # K3s Configuration
  k3s_version: "v1.28.5+k3s1"
  k3s_cluster_init: "true"
  k3s_disable_servicelb: "true"
  k3s_disable_traefik: "true"

  # Security Configuration
  disable_swap: "true"
  enable_firewall: "true"
  ssh_key_path: "~/.ssh/id_rsa.pub"

  # Application Configuration
  install_cilium: "$INSTALL_CILIUM"
  install_metallb: "$INSTALL_METALLB"
  install_ingress_nginx: "$INSTALL_INGRESS"
  install_cert_manager: "$INSTALL_CERT_MANAGER"
  install_monitoring: "$INSTALL_MONITORING"
  install_logging: "false"

  # Advanced Configuration
  enable_backup: "$ENABLE_BACKUP"
  backup_schedule: "0 2 * * *"
  enable_auto_updates: "true"
  enable_sealed_secrets: "true"
EOF

print_success "Configuration saved to $CONFIG_FILE"
echo
print_header "🚀 Next Steps"
echo "1. Review your configuration in $CONFIG_FILE"
echo "2. Make sure you have SSH access to your Proxmox host"
echo "3. Run: ./deploy.sh to start the deployment"
echo
print_info "You can also run individual phases:"
echo "  ./deploy.sh infrastructure  # Create VMs only"
echo "  ./deploy.sh k3s            # Setup Kubernetes only"
echo "  ./deploy.sh apps           # Install applications only"
echo
print_success "Configuration wizard completed! 🎉"
