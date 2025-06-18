# 🚀 InfraFlux

> **Enterprise-Grade Kubernetes Homelab Platform** - Zero-configuration deployment with 245+ production resources, complete security stack, and advanced AI/ML capabilities.

[![Platform](https://img.shields.io/badge/Platform-Kubernetes-blue)](https://kubernetes.io/)
[![Infrastructure](https://img.shields.io/badge/Infrastructure-Proxmox-orange)](https://www.proxmox.com/)
[![GitOps](https://img.shields.io/badge/GitOps-Flux-purple)](https://fluxcd.io/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-green)](https://github.com/yourusername/infraflux)

---

## 🎯 **What is InfraFlux?**

InfraFlux is a **complete enterprise-grade Kubernetes homelab platform** that automatically deploys production-ready infrastructure with advanced capabilities including AI/ML, media automation, security, and monitoring - all while maintaining zero-configuration simplicity.

### **🌟 Platform Highlights**
- **245+ Kubernetes Resources** with enterprise architecture
- **Complete Security Stack**: Authentik SSO, Sealed Secrets, cert-manager
- **Full Observability**: Prometheus, Grafana, Loki with custom dashboards  
- **AI/ML Ready**: Ollama, Open WebUI, JupyterHub, GPU acceleration
- **Media Center**: Jellyfin, *arr stack, hardware transcoding
- **Advanced GitOps**: Flux automation with Kustomize overlays

---

## ⚡ **Quick Start**

### **1. Configure Your Platform**
```bash
# Interactive configuration wizard
./configure.sh
```

### **2. Deploy Infrastructure**  
```bash
# Full platform deployment (VMs + K3s + Apps + Security + Monitoring)
./deploy.sh

# Or deploy specific components
./deploy.sh infrastructure  # Create Proxmox VMs
./deploy.sh k3s            # Setup Kubernetes cluster  
./deploy.sh apps           # Deploy applications
./deploy.sh security       # Enable authentication & security
./deploy.sh monitoring     # Deploy observability stack
```

### **3. Enable Advanced Features**
```bash
# Configure applications dynamically
./scripts/configure-apps.sh

# Scale cluster nodes
./scale-cluster.sh 5

# Validate deployment
./test-deploy.sh
```

---

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Proxmox VE    │───▶│  K3s Cluster    │───▶│  Applications   │
│                 │    │                 │    │                 │
│ • VM Management │    │ • Native Traefik│    │ • AI/ML Stack   │
│ • Auto Scaling  │    │ • ServiceLB     │    │ • Media Center  │  
│ • Terraform     │    │ • Cilium CNI    │    │ • Dev Tools     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │
                       ┌─────────────────┐
                       │   Security &    │
                       │   Monitoring    │
                       │                 │
                       │ • Authentik SSO │
                       │ • Prometheus    │
                       │ • CrowdSec      │
                       └─────────────────┘
```

---

## 🎮 **Platform Components**

### **🔒 Security & Authentication**
- **Authentik SSO**: Enterprise identity provider with OIDC/OAuth2
- **cert-manager**: Automated SSL certificate management
- **Sealed Secrets**: GitOps-safe secret encryption
- **CrowdSec**: Behavioral security analysis
- **Trivy**: Container vulnerability scanning

### **📊 Monitoring & Observability**
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Custom dashboards and visualization
- **Loki**: Log aggregation and analysis
- **Hubble UI**: Network observability with Cilium

### **🤖 AI/ML Platform**
- **Ollama**: Local LLM hosting with GPU acceleration
- **Open WebUI**: ChatGPT-style interface
- **JupyterHub**: Multi-user data science environment
- **Immich**: AI-powered photo management

### **🎬 Media Center**
- **Jellyfin**: Media streaming with hardware transcoding
- **Sonarr/Radarr**: Automated TV/movie management
- **Prowlarr**: Indexer management
- **Hardware Acceleration**: Intel Quick Sync + NVIDIA NVENC

### **🛠️ Development Tools**
- **Gitea**: Git hosting with integrated CI/CD
- **Code-Server**: VS Code in the browser
- **Harbor**: Enterprise container registry
- **n8n**: Workflow automation

---

## 📋 **Prerequisites**

- **Proxmox VE** 7.0+ with Ubuntu 24.04 template
- **SSH Key Pair** for VM authentication
- **Network Access** to Proxmox API
- **Storage**: 100GB+ available space
- **Memory**: 16GB+ recommended for full platform

---

## 🔧 **Configuration**

### **Essential Settings** (`config/cluster-config.yaml`)
```yaml
# Proxmox Configuration  
proxmox_host: "your-proxmox-host.local"
proxmox_user: "root@pam"

# Cluster Configuration
cluster_name: "infraflux-homelab"
controller_count: "3"
worker_count: "3"

# Application Features
enable_ai_ml: "true"        # Enable AI/ML platform
enable_jellyfin: "true"     # Enable media center
enable_gpu_support: "true"  # Enable GPU acceleration
enable_public_ingress: "false"  # Public internet access
```

### **Application Management**
```bash
# Enable/disable applications
yq eval '.data.enable_ai_ml = "true"' -i config/cluster-config.yaml
yq eval '.data.enable_jellyfin = "true"' -i config/cluster-config.yaml

# Apply configuration
./scripts/configure-apps.sh

# Deploy changes
./deploy.sh apps
```

---

## 📚 **Documentation**

- **[Strategic Plan](docs/plan/PLAN.md)** - Comprehensive roadmap and status
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and architecture
- **[Configuration Guide](docs/configuration.md)** - Detailed setup instructions
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

---

## 🚀 **Platform Status**

| Component | Status | Features |
|-----------|--------|----------|
| **Core Infrastructure** | ✅ Production | Auto-scaling, network detection, GitOps |
| **Security Stack** | ✅ Enterprise | SSO, secrets, certificates, scanning |  
| **Monitoring** | ✅ Complete | Metrics, logs, alerts, dashboards |
| **Applications** | ✅ Production | 7 apps with persistence and backup |
| **AI/ML Platform** | 🔄 Ready | GPU support, LLM hosting, data science |
| **Media Center** | 🔄 Foundation | Streaming, transcoding, automation |
| **Advanced Storage** | 📋 Planned | Distributed storage with Longhorn |
| **Home Automation** | 📋 Planned | IoT integration with Home Assistant |

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Test your changes with `./validate-repo.sh`
4. Commit your changes (`git commit -m 'Add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Kubernetes Community** for the amazing ecosystem
- **K3s Team** for the lightweight Kubernetes distribution  
- **Proxmox** for the excellent virtualization platform
- **Flux CD** for GitOps automation
- **Homelab Community** for inspiration and feedback

---

**🔗 Links**: [Documentation](docs/) | [Issues](https://github.com/yourusername/infraflux/issues) | [Discussions](https://github.com/yourusername/infraflux/discussions)

*Transform your homelab into an enterprise-grade platform with InfraFlux* 🚀