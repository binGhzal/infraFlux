# Ansible Playbooks

Infrastructure deployment automation for InfraFlux.

## 🎯 Playbook Overview

| Playbook | Purpose | Execution Time |
|----------|---------|----------------|
| `infrastructure.yml` | VM provisioning via Proxmox | 3-5 minutes |
| `node-preparation.yml` | OS configuration and hardening | 2-3 minutes |
| `k3s-cluster.yml` | Kubernetes cluster setup | 3-5 minutes |
| `applications.yml` | Application deployment | 5-10 minutes |
| `security.yml` | Security stack deployment | 3-5 minutes |
| `monitoring.yml` | Observability stack | 5-8 minutes |
| `gitops.yml` | Flux GitOps installation | 2-3 minutes |
| `scaling.yml` | Dynamic node scaling | 2-4 minutes |

## 🚀 Usage

### Full Deployment
```bash
# Deploy everything
ansible-playbook deploy.yml

# Or use wrapper script
./deploy.sh
```

### Individual Phases
```bash
# Infrastructure only
ansible-playbook playbooks/infrastructure.yml

# K3s cluster only
ansible-playbook playbooks/k3s-cluster.yml

# Applications only
ansible-playbook playbooks/applications.yml
```

## 📋 Playbook Details

Each playbook is designed to be **idempotent** and **resumable** for reliable infrastructure automation.