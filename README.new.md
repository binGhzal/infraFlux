# InfraFlux

🚀 **Zero-Config Kubernetes Deployment** - Automatically deploy production-ready Kubernetes clusters on Proxmox with just a few simple commands.

## ✨ Features

- **Fully Automated**: One command deployment from Proxmox VMs to running Kubernetes cluster
- **Network Auto-Detection**: Automatically detects and configures network settings
- **Flexible IP Ranges**: Works with any network configuration (192.168.x.x, 10.x.x.x, 172.x.x.x)
- **Production Ready**: Includes monitoring, ingress, load balancing, and backup solutions
- **User Friendly**: Interactive configuration wizard for beginners
- **Modular Design**: Deploy infrastructure, K3s, and applications independently

## 🚀 Quick Start

### 1. Configure Your Cluster
```bash
./configure.sh
```
This interactive wizard will help you set up your cluster configuration.

### 2. Deploy Everything
```bash
./deploy.sh
```
That's it! Your Kubernetes cluster will be automatically deployed.

## 📋 What Gets Deployed

### Infrastructure
- ✅ Proxmox VMs (Controllers + Workers)
- ✅ Automatic IP assignment and network configuration
- ✅ SSH key distribution and security hardening

### Kubernetes (K3s)
- ✅ Multi-master K3s cluster with HA
- ✅ Automatic cluster initialization and node joining
- ✅ Kubeconfig generation and distribution

### Applications (Optional)
- ✅ Cilium CNI with Hubble observability
- ✅ MetalLB load balancer with auto IP pool
- ✅ Ingress NGINX controller
- ✅ Cert Manager for SSL certificates
- ✅ Prometheus + Grafana monitoring stack
- ✅ Velero backup solution
- ✅ Sealed Secrets for secret management

## 🔧 Requirements

### Prerequisites
- Proxmox VE server with API access
- Ubuntu 24.04 VM template (will be cloned for nodes)
- SSH key pair for authentication
- Ansible, kubectl, and yq installed (auto-installed if missing)

### Network Requirements
- Proxmox host accessible from your machine
- Available IP range for VM assignment
- Internet access for downloading packages

## 📁 Project Structure

```
infraFlux/
├── configure.sh              # Interactive configuration wizard
├── deploy.sh                 # Main deployment script
├── config/
│   └── cluster-config.yaml   # Your cluster configuration
└── deployments/
    ├── 01-infrastructure/     # VM creation playbooks
    ├── 02-k3s-cluster/       # K3s installation playbooks
    └── 03-applications/      # Application deployment playbooks
```

## 🎯 Usage Examples

### Full Deployment
```bash
# Configure your cluster
./configure.sh

# Deploy everything
./deploy.sh
```

### Partial Deployments
```bash
# Create VMs only
./deploy.sh infrastructure

# Setup K3s cluster only
./deploy.sh k3s

# Install applications only
./deploy.sh apps

# Show configuration
./deploy.sh config
```

### Custom Configuration
Edit `config/cluster-config.yaml` directly for advanced customization:

```yaml
data:
  cluster_name: "my-cluster"
  network_cidr: "10.0.1.0/24"      # Custom network
  controller_count: "5"             # More controllers
  worker_count: "10"                # More workers
  vm_memory: "8192"                 # Larger VMs
  install_monitoring: "true"        # Enable monitoring
```

## 🌐 Network Configuration

InfraFlux automatically detects your network configuration, but you can customize it:

### Automatic Detection
- Detects available network ranges (192.168.x.x, 10.x.x.x, 172.x.x.x)
- Assigns IPs sequentially starting from .10
- Configures gateway and DNS automatically

### Manual Configuration
```yaml
# In config/cluster-config.yaml
data:
  network_cidr: "10.0.1.0/24"
  # VMs will get IPs: 10.0.1.10, 10.0.1.11, 10.0.1.12, etc.
```

## 🔒 Security Features

- Automatic SSH key distribution
- Firewall configuration
- Swap disabled for Kubernetes requirements
- Sealed Secrets for secret management
- Regular security updates (optional)

## 📊 Monitoring & Observability

When monitoring is enabled, you get:
- **Prometheus**: Metrics collection
- **Grafana**: Visualization dashboards
- **AlertManager**: Alert routing
- **Node Exporter**: Host metrics
- **Hubble**: Network observability (with Cilium)

Access Grafana:
```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80
# Visit http://localhost:3000 (admin/admin123)
```

## 🗄️ Backup & Recovery

Velero provides automated backup capabilities:
- Daily cluster backups (configurable schedule)
- Application-aware snapshots
- Cross-cluster restore capabilities
- S3-compatible storage support

## 🆘 Troubleshooting

### Common Issues

**Connection to Proxmox fails:**
```bash
# Check connectivity
ping your-proxmox-host
ssh root@your-proxmox-host
```

**VMs don't get IPs:**
```bash
# Check network configuration
./deploy.sh config
# Verify DHCP/static IP settings in Proxmox
```

**K3s installation fails:**
```bash
# Check VM accessibility
ansible all -i /tmp/inventory.ini -m ping
```

### Getting Help
- Check logs in `/tmp/infraflux-deploy/`
- Verify configuration with `./deploy.sh config`
- Ensure SSH keys are properly configured
- Verify Proxmox API access and permissions

## 🤝 Contributing

We welcome contributions! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built with Ansible for automation
- Uses K3s for lightweight Kubernetes
- Leverages Flux for GitOps workflows
- Inspired by the need for simple, automated infrastructure
