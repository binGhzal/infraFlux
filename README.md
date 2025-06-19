# 🚀 InfraFlux v2.0

> **Next-Generation Immutable Kubernetes Platform** - Built on Talos Linux with GitOps automation, zero-trust security, and enterprise-grade infrastructure.

[![Platform](https://img.shields.io/badge/Platform-Talos%20Linux-blue)](https://www.talos.dev/)
[![Infrastructure](https://img.shields.io/badge/Infrastructure-Proxmox-orange)](https://www.proxmox.com/)
[![GitOps](https://img.shields.io/badge/GitOps-Flux%20v2-purple)](https://fluxcd.io/)
[![Security](https://img.shields.io/badge/Security-Zero%20Trust-red)](https://www.talos.dev/security/)
[![Status](https://img.shields.io/badge/Status-v2.0%20Ready-green)](https://github.com/yourusername/infraflux)

---

## 🎯 **What is InfraFlux v2.0?**

InfraFlux v2.0 is a **complete rewrite** of the Kubernetes homelab platform, now built on **Talos Linux** - an immutable, API-driven operating system designed specifically for Kubernetes. This groundbreaking approach eliminates SSH access, provides enterprise-grade security, and delivers true infrastructure-as-code automation.

### **🌟 Revolutionary Features**

- **🔒 Zero-Trust Security**: No SSH access, API-only operations
- **🛡️ Immutable Infrastructure**: Read-only OS, no runtime modifications
- **⚡ Single Command Deployment**: Full cluster in one command
- **🤖 GitOps Native**: Flux v2 automation from day one
- **🔄 Configuration as Code**: Everything generated from templates
- **📊 Enterprise Architecture**: Production-ready from the start

---

## ⚡ **Quick Start**

### **Prerequisites**

Before deploying InfraFlux v2.0, ensure you have:

- **Proxmox VE** 7.0+ with API access
- **Talos ISO** uploaded to Proxmox storage
- **Network connectivity** to Proxmox host
- **Required tools**: `talosctl`, `kubectl`, `terraform`, `python3`, `yq`

### **1. Clone and Configure**

```bash
# Clone the repository
git clone https://github.com/yourusername/infraflux.git
cd infraflux

# Edit the master configuration
nano config/cluster-config.yaml
```

### **2. Deploy Your Cluster**

```bash
# Full deployment (VMs + Talos + Kubernetes + Core Apps)
./deploy.sh

# Or deploy specific phases
./deploy.sh infrastructure  # Create VMs only
./deploy.sh cluster        # Bootstrap Talos cluster
./deploy.sh apps           # Deploy core applications
```

### **3. Access Your Cluster**

```bash
# Set environment variables (shown after deployment)
export KUBECONFIG=/tmp/infraflux-*/kubeconfig
export TALOSCONFIG=/tmp/infraflux-*/talos/talosconfig

# Verify cluster health
kubectl get nodes
talosctl health
```

---

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Proxmox VE    │───▶│  Talos Linux    │───▶│   Kubernetes    │
│                 │    │                 │    │                 │
│ • VM Management │    │ • Immutable OS  │    │ • Native CNI    │
│ • Terraform     │    │ • API-Only      │    │ • Zero-Trust    │
│ • Auto-Scaling  │    │ • No SSH        │    │ • GitOps Ready  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                       ┌─────────────────┐
                       │   GitOps &      │
                       │   Applications  │
                       │                 │
                       │ • Flux v2       │
                       │ • Cilium CNI    │
                       │ • cert-manager  │
                       └─────────────────┘
```

### **Key Architectural Improvements**

- **🔄 Immutable Infrastructure**: Talos provides read-only root filesystem
- **🛡️ Zero-Trust Security**: All operations via secure APIs (talosctl/kubectl)
- **⚙️ Configuration-Driven**: Single source of truth drives entire platform
- **🤖 Template Engine**: Jinja2 templates generate all configurations
- **📦 GitOps Native**: Applications deployed via Flux from Git

---

## 🔧 **Configuration**

### **Master Configuration** (`config/cluster-config.yaml`)

InfraFlux v2.0 uses a single configuration file that drives the entire platform:

```yaml
apiVersion: v1
kind: InfraFluxConfig
metadata:
  name: infraflux-cluster
data:
  # Cluster Identity
  cluster_name: "infraflux-v2"
  cluster_domain: "cluster.local"

  # Talos and Kubernetes Versions
  talos_version: "v1.10.0"
  kubernetes_version: "v1.31.0"

  # Proxmox Infrastructure
  proxmox_host: "proxmox.local"
  proxmox_user: "root@pam"
  proxmox_node: "pve"
  proxmox_storage: "local-lvm"

  # VM Configuration
  vm_cores: 4
  vm_memory: 8192
  vm_disk_size: "50G"
  vm_network_bridge: "vmbr0"

  # Cluster Topology
  control_plane_ips:
    - "10.0.0.10"
    - "10.0.0.11"
    - "10.0.0.12"
  worker_ips:
    - "10.0.0.20"
    - "10.0.0.21"
    - "10.0.0.22"

  # Network Configuration
  pod_subnets:
    - "10.244.0.0/16"
  service_subnets:
    - "10.96.0.0/12"
```

### **Template System**

All configurations are generated from Jinja2 templates:

- **`templates/talos/`** - Talos machine configurations
- **`templates/terraform/`** - Infrastructure provisioning
- **`scripts/generate-configs.py`** - Template processor

---

## 🚀 **Deployment Process**

### **Phase 1: Infrastructure**

- Creates VMs via Terraform on Proxmox
- Configures networking and storage
- Prepares VMs for Talos boot

### **Phase 2: Cluster Bootstrap**

- Applies Talos configurations to VMs
- Bootstraps Kubernetes cluster
- Generates kubeconfig and talosconfig

### **Phase 3: Core Applications**

- Deploys Cilium CNI for networking
- Installs cert-manager for TLS
- Sets up GitOps with Flux v2

---

## 🛡️ **Security Model**

### **Zero-Trust Architecture**

InfraFlux v2.0 implements a true zero-trust security model:

- **🚫 No SSH Access**: All operations via secure APIs
- **🔐 Mutual TLS**: All cluster communication encrypted
- **🛡️ Immutable OS**: Read-only filesystem prevents tampering
- **🔒 Sealed Secrets**: GitOps-safe secret management
- **📝 Audit Logging**: Complete audit trail of all operations

### **API-Only Operations**

```bash
# Talos API commands (replace SSH)
talosctl dashboard              # System dashboard
talosctl logs                   # View system logs
talosctl restart                # Restart services
talosctl upgrade                # Upgrade OS
talosctl reset                  # Factory reset

# Kubernetes API commands
kubectl get nodes               # Cluster status
kubectl apply -f app.yaml       # Deploy applications
kubectl logs pod-name           # Application logs
```

---

## 🔄 **GitOps Workflow**

InfraFlux v2.0 is designed for GitOps from day one:

### **Repository Structure**

```
infraflux/
├── config/                     # Master configuration
├── templates/                  # Jinja2 templates
├── scripts/                    # Automation tools
├── docs/                       # Documentation
└── deploy.sh                   # Unified deployment
```

### **Future GitOps Integration**

After deployment, applications will be managed via:

- **Flux v2** for continuous deployment
- **Kustomize** for environment-specific configs
- **Sealed Secrets** for secure secret management
- **Git workflows** for change management

---

## 📊 **Monitoring & Observability**

### **Built-in Monitoring Stack**

- **Cilium Hubble**: Network observability and security
- **Talos Dashboard**: System metrics and health
- **Kubernetes Metrics**: Native cluster monitoring

### **Future Observability**

Planned integration with:

- **Prometheus** for metrics collection
- **Grafana** for visualization
- **Loki** for log aggregation
- **AlertManager** for notifications

---

## 🔧 **Management Operations**

### **Cluster Operations**

```bash
# Check cluster health
talosctl health

# View cluster info
kubectl cluster-info

# Scale cluster (future)
./scale-cluster.sh 6

# Upgrade cluster
talosctl upgrade --nodes <node-ip>
```

### **Troubleshooting**

```bash
# View Talos logs
talosctl logs --follow

# Access Talos dashboard
talosctl dashboard

# Debug networking
kubectl exec -it debug-pod -- /bin/sh
```

---

## 🚀 **Roadmap**

### **Phase 1: Core Platform** ✅

- [x] Talos Linux integration
- [x] Single command deployment
- [x] Template-driven configuration
- [x] Zero-trust security model

### **Phase 2: GitOps Automation** 🔄

- [ ] Flux v2 application deployment
- [ ] Sealed secrets integration
- [ ] Multi-environment support
- [ ] Automated scaling

### **Phase 3: Enterprise Features** 📋

- [ ] Advanced monitoring stack
- [ ] Backup and disaster recovery
- [ ] Multi-cluster management
- [ ] compliance frameworks

---

## 📚 **Documentation**

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Deep dive into system design
- **[Configuration Reference](docs/CONFIGURATION.md)** - Complete config options
- **[Security Model](docs/SECURITY.md)** - Zero-trust implementation
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🤝 **Contributing**

InfraFlux v2.0 is designed to be community-driven:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Test** your changes thoroughly
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **[Talos Systems](https://www.talos.dev/)** for the revolutionary Talos Linux
- **[Kubernetes Community](https://kubernetes.io/)** for the amazing ecosystem
- **[Flux CD](https://fluxcd.io/)** for GitOps automation
- **[Proxmox](https://www.proxmox.com/)** for virtualization platform
- **[Cilium](https://cilium.io/)** for cloud-native networking

---

**🔗 Links**: [Documentation](docs/) | [Issues](https://github.com/yourusername/infraflux/issues) | [Discussions](https://github.com/yourusername/infraflux/discussions)

_Welcome to the future of immutable Kubernetes infrastructure_ 🚀
