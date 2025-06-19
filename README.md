# InfraFlux v2.0

**Radically Simplified Kubernetes Deployment**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Kubernetes](https://img.shields.io/badge/kubernetes-v1.31-blue.svg)](https://kubernetes.io)
[![Talos](https://img.shields.io/badge/talos-v1.10.0-green.svg)](https://talos.dev)
[![Terraform](https://img.shields.io/badge/terraform-proxmox%20v3.0.2-purple.svg)](https://registry.terraform.io/providers/telmate/proxmox/latest)

**One command. One config file. Production-ready Kubernetes.**

InfraFlux v2.0 is the simplest way to deploy production-grade Kubernetes clusters on Proxmox. With intelligent defaults, auto-detection, and environment-aware configuration, you can go from zero to production in under 5 minutes.

## 🎯 Why InfraFlux v2.0?

### ⚡ **Ridiculously Simple**
```bash
# That's it. Seriously.
./deploy.sh config/cluster.yaml
```

### 🧠 **Intelligent by Default**
- **Auto-detects** your Proxmox infrastructure
- **Auto-configures** networking and storage  
- **Auto-sizes** VMs for your environment
- **Auto-selects** latest stable versions

### 🔒 **Production Ready**
- **Sealed secrets** safe to commit to Git
- **Environment-aware** security policies
- **Zero-downtime** deployments
- **Comprehensive** monitoring

### 🌍 **One Config, Any Environment**
```yaml
# config/cluster.yaml - Everything you need
metadata:
  name: my-cluster
  environment: production  # Automatically configures everything

spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"  # Only required field!
```

## ⚡ 5-Minute Quick Start

### 1. Clone & Setup
```bash
git clone <this-repo> infraflux
cd infraflux

# Create Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Configure (1 minute)
```bash
# Copy the unified config
cp config/cluster.yaml.example config/cluster.yaml

# Edit ONE field - your Proxmox host
vim config/cluster.yaml
# Change: host: "YOUR_PROXMOX_IP"

# Setup secrets (optional - can use passwords)
cp config/.env.template config/.env
# Add: PROXMOX_PASSWORD="your-password"
```

### 3. Deploy (3 minutes)
```bash
./deploy.sh config/cluster.yaml
```

That's it! You now have a production-ready Kubernetes cluster with:
- ✅ Talos Linux (immutable OS)
- ✅ Cilium CNI with Hubble
- ✅ Metrics server
- ✅ Sealed secrets
- ✅ Monitoring (in staging/prod)

## 🏗️ What Changed in v2.0?

### ❌ Before (Complex)
```bash
# Multiple config files
config/test-cluster-config.yaml
config/production-config.yaml
config/.env (50+ variables)

# Complex deployment
python3 setup.py
python3 deploy-ansible.py config/file.yaml phase
```

### ✅ After (Simple)
```bash
# One config file with smart defaults
config/cluster.yaml

# One deployment command
./deploy.sh config/cluster.yaml
```

### 🎯 Key Improvements

| Feature | v1.x | v2.0 |
|---------|------|------|
| **Config Files** | 5+ files | 1 file |
| **Required Fields** | 50+ | 1 field |
| **Setup Time** | 30+ minutes | 5 minutes |
| **Secret Management** | Plain text | Sealed secrets |
| **Auto-Detection** | None | Everything |
| **Environment Awareness** | Manual | Automatic |

## 🤖 Smart Automation Features

### Infrastructure Auto-Detection
```yaml
# Automatically discovers:
proxmox:
  node: "{{ auto_detected }}"      # Primary Proxmox node
  storage: "{{ auto_detected }}"   # Largest storage pool  
  bridge: "{{ auto_detected }}"    # Default network bridge

network:
  gateway: "{{ auto_detected }}"   # Network gateway
  ips: "{{ auto_calculated }}"     # Available IP range
```

### Environment-Aware Defaults
```yaml
# Development: Fast & minimal
environment: development
# Results in: 1 control plane, 1 worker, 2GB RAM each

# Production: HA & optimized  
environment: production
# Results in: 3 control planes, 3 workers, 4GB+ RAM each
```

### Version Management
```yaml
versions:
  talos: latest      # → Resolves to v1.10.0 (latest stable)
  kubernetes: latest # → Resolves to v1.31.0 (latest stable)
  cilium: latest     # → Resolves to v1.16.0 (latest stable)
```

## 📁 Simple Project Structure

```
infraflux/
├── deploy.sh                # 🚀 Single deployment script
├── config/
│   ├── cluster.yaml         # 📄 Everything you need
│   ├── .env                 # 🔒 Runtime secrets only
│   └── secrets.yaml         # 🔐 Sealed secrets (safe to commit)
├── playbooks/              # 🎭 Ansible automation
│   ├── main.yml
│   ├── tasks/
│   └── templates/
└── docs/                   # 📚 Documentation
```

## 🔧 Configuration Examples

### Minimal Development
```yaml
# Absolute minimum - everything else auto-detected
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: dev-cluster
  environment: development
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"  # Only required field!
```

### Production with Overrides
```yaml
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: prod-cluster
  environment: production
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"
  
  # Override defaults
  overrides:
    nodes:
      control_plane:
        count: 5              # More than default 3
        resources:
          memory: 8192        # More than default 4096
    
    applications:
      monitoring:
        retention: "90d"      # Longer than default 30d
```

### Custom Network Configuration
```yaml
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"
      
  overrides:
    networking:
      control_plane_ips:
        - "192.168.1.10"
        - "192.168.1.11"
        - "192.168.1.12"
      worker_ips:
        - "192.168.1.20"
        - "192.168.1.21"
```

## 🔒 Secure Secret Management

### Sealed Secrets (Recommended)
```bash
# Create secret
echo "my-secret" | kubeseal --raw --from-file=/dev/stdin

# Add to config/secrets.yaml (safe to commit)
proxmox-password: AgBy3i4OJSWK...encrypted...

# Automatically applied during deployment
```

### Environment Variables (Development)
```bash
# config/.env (not committed)
DEBUG="true"
PROXMOX_PASSWORD="my-password"
```

## 🎛️ Environment Profiles

### Development Profile
- **Resources**: Minimal (1 CP, 1 worker, 2GB each)
- **Security**: Relaxed (easier debugging)
- **Monitoring**: Disabled (faster startup)
- **Updates**: Manual

### Staging Profile  
- **Resources**: Medium (1 CP, 2 workers, 4GB each)
- **Security**: Moderate (some policies)
- **Monitoring**: Enabled
- **Updates**: Automated

### Production Profile
- **Resources**: HA (3 CP, 3+ workers, 4GB+ each)
- **Security**: Hardened (all policies)
- **Monitoring**: Full stack
- **Updates**: Scheduled

## 🚀 Deployment Phases

The deployment automatically runs through these phases:

1. **🔍 Discovery** - Auto-detect Proxmox infrastructure
2. **⚙️ Configuration** - Generate configs with smart defaults
3. **🏗️ Infrastructure** - Create VMs with Terraform (v3.0.2-rc01)
4. **🔧 Bootstrap** - Initialize Talos cluster
5. **📦 Applications** - Install core components
6. **✅ Validation** - Test cluster functionality

## 📊 What You Get

### Core Infrastructure
- **Talos Linux** - Immutable, API-driven Kubernetes OS
- **Cilium CNI** - eBPF-based networking with Hubble UI
- **Metrics Server** - Resource metrics for HPA
- **Sealed Secrets** - Encrypted secret management

### Production Additions (staging/prod)
- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization dashboards
- **Loki** - Log aggregation
- **Cert Manager** - TLS certificate automation

### Security Features
- **Pod Security Standards** - Enforced security policies
- **Network Policies** - Micro-segmentation
- **Encrypted etcd** - Data at rest encryption
- **No SSH access** - API-only cluster management

## 🛠️ Advanced Usage

### Custom Applications
```yaml
spec:
  applications:
    custom:
      enabled: true
      components:
        nginx-ingress: true
        external-dns: true
        vault: true
```

### Multi-Environment Management
```bash
# Deploy development
./deploy.sh config/dev-cluster.yaml

# Deploy staging  
./deploy.sh config/staging-cluster.yaml

# Deploy production
./deploy.sh config/prod-cluster.yaml
```

### Cluster Operations
```bash
# Scale workers
./deploy.sh config/cluster.yaml --scale-workers 5

# Upgrade cluster
./deploy.sh config/cluster.yaml --upgrade

# Backup cluster
./deploy.sh config/cluster.yaml --backup
```

## 🔍 Troubleshooting

### Common Issues

**Missing tools**:
```bash
# macOS
brew install talosctl kubectl helm

# Linux
curl -sL https://talos.dev/install | sh
```

**Proxmox connection**:
```bash
# Test connectivity
curl -k https://YOUR_PROXMOX_IP:8006/api2/json/version
```

**Debug deployment**:
```bash
# Enable verbose output
DEBUG=true ./deploy.sh config/cluster.yaml
```

## 📚 Documentation

- **[Setup Guide](docs/SETUP.md)** - Detailed setup instructions
- **[Configuration Reference](docs/CONFIG.md)** - All configuration options
- **[Migration Guide](docs/MIGRATION.md)** - Migrate from v1.x
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues
- **[Architecture](docs/ARCHITECTURE.md)** - System design

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🎉 Migration from v1.x

Upgrading is simple:

```bash
# Automatic migration
./scripts/migrate-config.sh config/old-config.yaml

# Review and test
./deploy.sh config/cluster.yaml --dry-run

# Deploy new system
./deploy.sh config/cluster.yaml
```

---

**InfraFlux v2.0** - *One config. One command. Production ready.*

*Because Kubernetes deployment shouldn't be rocket science.* 🚀