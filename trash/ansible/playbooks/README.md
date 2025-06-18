# Deployment Playbooks Structure

This directory contains modular deployment playbooks for the infraFlux infrastructure. The deployment is organized into logical phases that can be run independently or as part of the main deployment.

## Main Deployment

Use the main deployment playbook to run the entire infrastructure setup:

```bash
ansible-playbook -i hosts.ci deploy.yml
```

## Individual Playbooks

Each playbook can be run independently for targeted deployments:

### 1. Infrastructure (`playbooks/infrastructure.yml`)

- Creates VMs in Proxmox
- Handles VM templates and initial setup
- **Target hosts**: `proxmox_servers`, `proxmox_vms`

```bash
ansible-playbook -i hosts.ci playbooks/infrastructure.yml
```

### 2. Node Preparation (`playbooks/node-preparation.yml`)

- Basic node configuration and hardening
- Network setup and firewall rules
- Provider-specific setup (CrunchBits, standard)
- **Target hosts**: All compute nodes

```bash
ansible-playbook -i hosts.ci playbooks/node-preparation.yml
```

### 3. K3s Cluster (`playbooks/k3s-cluster.yml`)

- K3s master nodes installation
- HAProxy and Keepalived for HA
- OIDC and backup setup
- **Target hosts**: `k3s_servers`

```bash
ansible-playbook -i hosts.ci playbooks/k3s-cluster.yml
```

### 4. Controllers (`playbooks/controllers.yml`)

- Controller node setup
- Cilium CNI pre-installation
- **Target hosts**: `controllers`

```bash
ansible-playbook -i hosts.ci playbooks/controllers.yml
```

### 5. Workers (`playbooks/workers.yml`)

- K3s agent installation
- Worker-specific services
- **Target hosts**: `k3s_agents`, `k3s_contended`, `k3s_dedicated`

```bash
ansible-playbook -i hosts.ci playbooks/workers.yml
```

### 6. Applications (`playbooks/applications.yml`)

- Kubernetes applications and services
- Flux GitOps, Authentik, monitoring
- **Target hosts**: `controllers`

```bash
ansible-playbook -i hosts.ci playbooks/applications.yml
```

### 7. Speedtesters (`playbooks/speedtesters.yml`)

- Special deployment for speedtester nodes
- Nginx and SSL certificate setup
- **Target hosts**: `speedtesters`

```bash
ansible-playbook -i hosts.ci playbooks/speedtesters.yml
```

## Environment-Specific Deployments

The playbooks automatically detect the environment based on inventory groups:

- **CI Environment**: Uses `hosts.ci` inventory
- **CrunchBits Environment**: Detected by `public_hosts` group or `crunchbits` in group names
- **Standard Proxmox**: Default behavior

## Legacy Files

Old deployment files have been moved to the `legacy/` directory:

- `legacy/deploy-ci.yml`
- `legacy/deploy-crunchbits.yml`
- `legacy/deploy-speedtesters.yml`

## Tags

All playbooks support Ansible tags for selective execution:

```bash
# Run only node setup
ansible-playbook -i hosts.ci deploy.yml --tags node

# Run only K3s installation
ansible-playbook -i hosts.ci deploy.yml --tags k3s-server,k3s-agent

# Run only application deployment
ansible-playbook -i hosts.ci deploy.yml --tags flux,authentik
```

## Workflow Overview

The complete deployment workflow:

1. **Infrastructure**: Create VMs in Proxmox
2. **Node Preparation**: Configure base OS and networking
3. **K3s Cluster**: Set up Kubernetes masters with HA
4. **Controllers**: Prepare controller nodes and CNI
5. **Workers**: Install Kubernetes workers
6. **Applications**: Deploy GitOps and applications

This modular approach allows for:

- Easier debugging and maintenance
- Selective deployment of components
- Better separation of concerns
- Environment-specific customization
