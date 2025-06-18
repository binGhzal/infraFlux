# InfraFlux Quick Start Guide

## Prerequisites

1. **Proxmox Environment**

   - One or more Proxmox hosts
   - Ubuntu 24.04 LTS template VM
   - Network access to Proxmox API
   - Sufficient storage and compute resources

2. **Control Machine**
   - macOS or Linux workstation
   - Internet access for downloading tools
   - SSH key pair for VM access (`~/.ssh/id_rsa.pub`)

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/infraFlux.git
cd infraFlux
```

### 2. Configure Your Cluster

```bash
./configure.sh
```

This interactive wizard will help you set up your cluster configuration with:

- Auto-detected network settings
- Proxmox connection details
- VM specifications
- Native K3s features

### 3. Deploy Everything

```bash
./deploy.sh
```

That's it! Your Kubernetes cluster will be automatically deployed with:

- **Native Traefik ingress** (no external NGINX)
- **Native ServiceLB** for load balancing
- **Terraform-managed VMs** on Proxmox
- **Cilium CNI** with Hubble observability
- **Monitoring stack** with Prometheus + Grafana

## 🎯 Deployment Phases

You can also deploy specific phases:

```bash
# Create VMs only
./deploy.sh config/cluster-config.yaml infrastructure

# Setup K3s cluster only
./deploy.sh config/cluster-config.yaml k3s

# Install applications only
./deploy.sh config/cluster-config.yaml apps
```

### 5. Verify Deployment

Check cluster status:

```bash
# SSH to a controller node
ssh user@controller-node
kubectl get nodes
kubectl get pods -A
```

## Configuration Examples

### Basic CI Environment

See `hosts.ci` and `group_vars/ci/` for a complete example.

### Custom Environment

1. Create inventory file with your hosts
2. Create group_vars directory for your environment
3. Configure Proxmox credentials and network settings
4. Run deployment

## Common Tasks

### Add New Worker Node

1. Add node to inventory
2. Run worker deployment:

```bash
./deploy.sh -e your-env -p playbooks/workers.yml -l new-worker-node
```

### Update Kubernetes Version

1. Update version in group_vars
2. Run cluster update:

```bash
./deploy.sh -e your-env -t k3s-server,k3s-agent
```

### Deploy New Application

Applications are managed via Flux GitOps - commit changes to your flux repository.

## Troubleshooting

### Check Logs

```bash
# Ansible logs
tail -f /var/log/ansible.log

# Node logs
journalctl -u k3s -f
```

### Common Issues

- Network connectivity between nodes
- Proxmox template configuration
- DNS resolution
- Firewall rules

### Getting Help

1. Check the logs first
2. Verify network connectivity
3. Validate inventory and variables
4. Review the playbook documentation
