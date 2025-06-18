# InfraFlux Quick Start Guide

Deploy a production-ready Kubernetes cluster in 15 minutes.

## 🎯 Prerequisites (5 minutes)

### 1. Proxmox Environment
- Proxmox VE 8.0+ with Ubuntu 24.04 template (ID: 9000)
- SSH public key configured
- API access credentials

### 2. Local Tools
```bash
# Required tools
sudo apt update && sudo apt install -y \
    ansible kubectl kustomize flux git curl

# Verify installations
ansible --version
kubectl version --client
flux --version
```

## ⚡ Deployment Steps

### Step 1: Configure Cluster (2 minutes)
```bash
git clone https://github.com/your-username/infraflux.git
cd infraflux

# Interactive configuration wizard
./configure.sh
```

The wizard will prompt for:
- Proxmox connection details
- Cluster sizing (nodes, CPU, memory)
- Network configuration
- Feature selection

### Step 2: Deploy Infrastructure (8 minutes)
```bash
# Full deployment (infrastructure + applications)
./deploy.sh

# Or deploy in phases
./deploy.sh infrastructure  # VMs only
./deploy.sh k3s            # Kubernetes cluster
./deploy.sh apps           # Applications
```

### Step 3: Verify Deployment (2 minutes)
```bash
# Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces

# Access applications
kubectl get ingress --all-namespaces
```

## 🎉 Success! Your cluster is ready.

### Default Applications Available:
- **Grafana**: http://grafana.local.cluster (admin/admin)
- **Prometheus**: http://prometheus.local.cluster
- **Homepage**: http://home.local.cluster
- **Traefik Dashboard**: http://traefik.local.cluster

### Next Steps:
1. **Enable GitOps**: Run `./scripts/bootstrap-flux.sh`
2. **Add Applications**: See [Applications Guide](../applications/)
3. **Configure Monitoring**: See [Monitoring Guide](../monitoring/)
4. **Setup Security**: See [Security Guide](../security/)

## 🔧 Common Issues

### Deployment Fails
```bash
# Check logs
ls -la /tmp/infraflux-deploy/

# Retry specific phase
./deploy.sh k3s --force
```

### Can't Access Applications
```bash
# Check ingress
kubectl get ingress --all-namespaces

# Port forward for testing
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
```

### Node Issues
```bash
# Check node status
kubectl describe nodes

# SSH to node for debugging
ssh ubuntu@node-ip
```

## 🆘 Need Help?

- [Troubleshooting Guide](../troubleshooting/)
- [Configuration Reference](CONFIGURATION.md)
- [Architecture Overview](../architecture/)