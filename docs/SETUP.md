# InfraFlux v2.0 - Setup Guide

**Declarative Infrastructure Deployment using Ansible and Jinja2**

This guide helps you set up a reproducible environment for deploying Kubernetes clusters with Talos Linux on Proxmox VE.

## 🎯 Quick Start (5 Minutes)

```bash
# 1. Clone and setup
git clone <repository-url> infraflux
cd infraflux

# 2. Create Python virtual environment  
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# venv\Scripts\activate   # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure secrets
cp config/.env.template config/.env
# Edit config/.env with your Proxmox credentials

# 5. Deploy cluster
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all
```

## 📋 Prerequisites

### System Requirements

- **Python 3.9+** (required)
- **Operating System**: Linux, macOS, or Windows (with WSL2)
- **Memory**: 4GB+ RAM
- **Network**: Access to Proxmox VE host

### Required Tools

Install these tools on your system:

#### macOS (Homebrew)
```bash
brew install talosctl kubectl helm
```

#### Linux (Ubuntu/Debian)
```bash
# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# helm  
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# talosctl
curl -sL https://talos.dev/install | sh
```

#### Windows
Use Windows Subsystem for Linux (WSL2) and follow Linux instructions.

## 🔧 Environment Setup

### 1. Python Virtual Environment

```bash
# Create virtual environment
python3 -m venv venv

# Activate environment
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate.bat     # Windows

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

### 2. Configure Proxmox Credentials

```bash
# Copy template
cp config/.env.template config/.env

# Edit with your values
vim config/.env  # or nano, code, etc.
```

**Required Configuration:**
```bash
# Proxmox Settings
PROXMOX_HOST="10.0.0.69"           # Your Proxmox host IP
PROXMOX_USER="root@pam"            # Proxmox username
PROXMOX_PASSWORD="your-password"   # Proxmox password
PROXMOX_NODE="pve"                 # Proxmox node name
PROXMOX_STORAGE="local-lvm"        # Storage pool name

# For self-signed certificates
PROXMOX_TLS_INSECURE="true"
```

**Optional: API Token (Recommended)**
```bash
# Instead of password, use API token
PROXMOX_API_TOKEN_ID="root@pam!infraflux"
PROXMOX_API_TOKEN_SECRET="your-token-secret"
```

To create API token in Proxmox:
1. Go to **Datacenter** → **API Tokens**
2. Click **Add**
3. User: `root@pam`, Token ID: `infraflux`
4. Copy the secret and add to `.env`

### 3. Configure Cluster Settings

Edit `config/test-cluster.yaml`:

```yaml
data:
  # Update IP addresses for your network
  control_plane_ips:
    - "10.0.0.10"  # Must be available on your network
  worker_ips:
    - "10.0.0.20"  # Must be available on your network
    
  # Update Proxmox settings
  proxmox_host: "10.0.0.69"    # Your Proxmox host
  proxmox_storage: "local-lvm" # Your storage pool
```

## 🚀 Deployment

### Basic Deployment

```bash
# Full deployment (recommended)
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all

# Specific phases
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=infrastructure
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=bootstrap  
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=apps
```

### Deployment Phases

1. **Prerequisites** - Check tools and connectivity
2. **Config** - Generate Talos and Terraform configurations  
3. **Infrastructure** - Create VMs on Proxmox
4. **Bootstrap** - Initialize Talos cluster
5. **Apps** - Install Cilium CNI and core applications
6. **Validate** - Test cluster functionality

## 📁 Project Structure

```
infraflux/
├── deploy.sh                    # Main deployment script
├── requirements.txt             # Python dependencies
├── config/
│   ├── .env.template           # Environment template (edit and copy to .env)
│   ├── test-cluster.yaml # Cluster configuration
│   └── production-config.yaml  # Production configuration
├── playbooks/
│   ├── main.yml               # Main Ansible playbook
│   ├── tasks/                 # Ansible task files
│   └── templates/             # Jinja2 templates
├── inventory/
│   └── localhost              # Ansible inventory
└── docs/
    └── *.md                   # Documentation
```

## 🎛️ Configuration Options

### Cluster Configuration

Edit `config/test-cluster.yaml`:

```yaml
data:
  # Cluster Identity
  cluster_name: "my-cluster"
  cluster_domain: "cluster.local"
  
  # Network Settings
  control_plane_ips: ["10.0.0.10"]
  worker_ips: ["10.0.0.20", "10.0.0.21"]
  pod_subnets: ["10.244.0.0/16"]
  service_subnets: ["10.96.0.0/12"]
  
  # VM Resources
  vm_cores: 2
  vm_memory: 2048
  vm_disk_size: "20G"
  
  # Versions
  talos_version: "v1.10.0"
  kubernetes_version: "v1.31.0"
```

### Environment Variables

All sensitive data goes in `config/.env`:

```bash
# Authentication
PROXMOX_PASSWORD="secret"
GITHUB_TOKEN="ghp_token"

# Optional integrations
SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
EMAIL_SMTP_PASSWORD="password"
```

## 🔍 Troubleshooting

### Common Issues

**1. Missing Tools**
```bash
# Error: talosctl not found
# Solution: Install required tools (see Prerequisites)
brew install talosctl  # macOS
```

**2. Proxmox Connection**
```bash
# Error: Cannot connect to Proxmox
# Solution: Check network and credentials
curl -k https://10.0.0.69:8006/api2/json/version
```

**3. IP Address Conflicts**
```bash
# Error: IP already in use
# Solution: Update IPs in config/test-cluster.yaml
```

**4. Missing Talos ISO**
```bash
# Error: ISO not found
# Solution: Upload Talos ISO to Proxmox storage
```

### Debug Mode

```bash
# Enable Ansible debug output
ANSIBLE_VERBOSITY=3 ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all

# Check generated configurations
ls -la /tmp/infraflux-*/
```

### Manual Cleanup

```bash
# Remove failed VMs from Proxmox UI
# Delete temporary files
rm -rf /tmp/infraflux-*
```

## 🔐 Security Best Practices

### 1. Secrets Management
- Never commit `.env` files to version control
- Use API tokens instead of passwords when possible
- Rotate credentials regularly

### 2. Network Security
- Use VLANs to isolate cluster traffic
- Configure firewall rules for Proxmox access
- Consider VPN for remote access

### 3. Access Control
- Use dedicated Proxmox user with minimal permissions
- Enable two-factor authentication on Proxmox
- Audit access logs regularly

## 📈 Scaling

### Add More Nodes

1. Update `config/test-cluster.yaml`:
```yaml
worker_ips:
  - "10.0.0.20"
  - "10.0.0.21"  # Add more IPs
  - "10.0.0.22"
```

2. Re-run deployment:
```bash
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=infrastructure
```

### Production Configuration

Use `config/production-config.yaml` for production deployments:

```yaml
data:
  environment: "production"
  # More control plane nodes
  control_plane_ips: 
    - "10.0.0.10"
    - "10.0.0.11" 
    - "10.0.0.12"
  # Security features enabled
  security:
    enable_pod_security_standards: true
    enable_network_policies: true
```

## 🆘 Support

### Getting Help

1. **Check Documentation**: Review all files in `docs/`
2. **Validate Configuration**: Ensure all settings are correct
3. **Check Logs**: Review Ansible output for errors
4. **Test Components**: Verify Proxmox, networking, DNS

### Useful Commands

```bash
# Check cluster status
export KUBECONFIG=/tmp/infraflux-*/kubeconfig
kubectl get nodes
kubectl get pods --all-namespaces

# Talos cluster info
export TALOSCONFIG=/tmp/infraflux-*/talos/talosconfig
talosctl health
talosctl version

# Proxmox VMs
# Check VMs in Proxmox UI or CLI
```

This setup provides a completely reproducible, declarative infrastructure deployment system that works consistently across different environments.