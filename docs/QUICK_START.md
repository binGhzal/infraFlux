# InfraFlux v2.0 Quick Start Guide

## Overview

InfraFlux v2.0 provides a single-command deployment of a production-ready Kubernetes cluster using Talos Linux and GitOps automation. No complex validation or multi-stage testing required - just configure and deploy.

## Prerequisites

Install the required tools on your system:

```bash
# Python dependencies
pip3 install PyYAML Jinja2

# Talos CLI
curl -sL https://talos.dev/install | sh

# Kubernetes CLI
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install kubectl /usr/local/bin/

# Terraform
# Visit https://developer.hashicorp.com/terraform/downloads

# yq (YAML processor)
# Visit https://github.com/mikefarah/yq/releases
```

## Configuration

1. **Copy and edit the configuration file:**
   ```bash
   cp config/test-cluster-config.yaml config/my-cluster-config.yaml
   ```

2. **Update the key settings in `config/my-cluster-config.yaml`:**
   - `proxmox_host`: Your Proxmox server address
   - `control_plane_ips`: IP addresses for control plane nodes
   - `worker_ips`: IP addresses for worker nodes
   - `git_repository`: Your GitOps repository URL (optional)

## Deployment

### Single Command Deployment

Deploy the entire platform with one command:

```bash
export PROXMOX_PASSWORD="your-proxmox-password"
./deploy.sh config/my-cluster-config.yaml
```

### Phase-by-Phase Deployment

For more control, deploy in phases:

```bash
# 1. Create VMs only
./deploy.sh config/my-cluster-config.yaml infrastructure

# 2. Bootstrap Talos cluster
./deploy.sh config/my-cluster-config.yaml cluster

# 3. Deploy core applications
./deploy.sh config/my-cluster-config.yaml apps

# 4. Setup GitOps
./deploy.sh config/my-cluster-config.yaml gitops
```

## Access Your Cluster

After deployment, access your cluster:

```bash
# Set environment variables (shown in deployment output)
export KUBECONFIG=/tmp/infraflux-*/kubeconfig
export TALOSCONFIG=/tmp/infraflux-*/talos/talosconfig

# Check cluster status
kubectl get nodes
talosctl health

# View running applications
kubectl get pods --all-namespaces
```

## What You Get

- **Immutable Infrastructure**: Talos Linux with API-only access
- **Kubernetes Cluster**: Production-ready with CNI and cert-manager
- **GitOps Ready**: Flux v2 for continuous deployment
- **Security First**: Network policies and RBAC enabled
- **Monitoring**: Prometheus and Grafana (if enabled)

## Next Steps

1. **Configure GitOps**: Update `git_repository` in your config and re-run GitOps phase
2. **Deploy Applications**: Add your applications to the GitOps repository
3. **Enable Monitoring**: Set `monitoring.enabled: true` in configuration
4. **Customize**: Modify templates in `templates/` directory for your needs

## Troubleshooting

### Common Issues

1. **VM Creation Fails**
   - Verify Proxmox credentials and connectivity
   - Check available resources in Proxmox
   - Ensure IP addresses are available

2. **Talos Bootstrap Fails**
   - Check network connectivity to VMs
   - Verify IP addresses in configuration
   - Wait for VMs to fully boot before retry

3. **GitOps Issues**
   - Verify Git repository access
   - Check SSH keys or authentication
   - Ensure repository structure matches expected format

### Getting Help

- Check deployment logs in `/tmp/infraflux-*/deployment.log`
- Review generated configurations in `/tmp/infraflux-*/`
- Use `talosctl health` and `kubectl get events` for cluster issues

## Configuration Examples

### Minimal Production Setup
```yaml
data:
  cluster_name: "production"
  environment: "production"
  control_plane_ips: ["10.0.0.10", "10.0.0.11", "10.0.0.12"]
  worker_ips: ["10.0.0.20", "10.0.0.21"]
  proxmox_host: "proxmox.company.com"
  gitops:
    enabled: true
    git_repository: "ssh://git@gitlab.com/company/k8s-config.git"
```

### Development Setup
```yaml
data:
  cluster_name: "development"
  environment: "development"
  control_plane_ips: ["10.0.0.10"]
  worker_ips: ["10.0.0.20"]
  proxmox_host: "proxmox-dev.company.com"
  gitops:
    enabled: false
```

That's it! InfraFlux v2.0 handles all the complexity for you.