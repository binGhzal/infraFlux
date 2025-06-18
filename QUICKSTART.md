# InfraFlux Quick Start Guide

## Prerequisites

1. **Proxmox Environment**

   - One or more Proxmox hosts
   - Ubuntu 24.04 LTS template VM
   - Network VLANs configured
   - Sufficient storage and compute resources

2. **Control Machine**
   - Ansible 2.9+
   - Python 3.8+
   - SSH access to Proxmox hosts
   - Git access to configuration repositories

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/your-org/infraFlux.git
cd infraFlux/ansible
```

### 2. Configure Environment

Copy and edit the inventory file for your environment:

```bash
cp hosts.ci hosts.your-env
# Edit hosts.your-env with your infrastructure details
```

### 3. Configure Variables

Edit the group variables:

```bash
# Edit group_vars/all/main.yml for global settings
# Edit group_vars/your-env/main.yml for environment-specific settings
```

### 4. Deploy Infrastructure

Use the deployment script:

```bash
# Full deployment
./deploy.sh -e your-env

# Or specific phases
./deploy.sh -e your-env -p playbooks/infrastructure.yml
./deploy.sh -e your-env -p playbooks/k3s-cluster.yml
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
