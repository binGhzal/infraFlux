# InfraFlux v2.0 Production Setup Guide

## Overview

This guide provides comprehensive instructions for preparing a production environment for InfraFlux v2.0 deployment. Follow these steps carefully to ensure a secure, reliable infrastructure foundation.

---

## 🏗️ **Infrastructure Requirements**

### Hardware Specifications

#### Proxmox Host Requirements
- **CPU**: Intel/AMD 64-bit with virtualization support (Intel VT-x/AMD-V)
- **RAM**: Minimum 32GB (64GB+ recommended for production)
- **Storage**: 
  - System: 100GB+ SSD for Proxmox OS
  - VM Storage: 500GB+ high-performance storage (NVMe preferred)
  - Backup: Additional storage for VM backups
- **Network**: Gigabit Ethernet (10GbE preferred for high-performance)

#### Cluster Resource Planning
Calculate total resources needed:
```
Minimum Requirements:
- Control Planes: 3 nodes × 4 vCPU × 8GB RAM = 12 vCPU, 24GB RAM
- Workers: 3 nodes × 4 vCPU × 8GB RAM = 12 vCPU, 24GB RAM  
- Total: 24 vCPU, 48GB RAM, 300GB storage

Production Recommendations:
- Control Planes: 3 nodes × 8 vCPU × 16GB RAM = 24 vCPU, 48GB RAM
- Workers: 5 nodes × 8 vCPU × 16GB RAM = 40 vCPU, 80GB RAM
- Total: 64 vCPU, 128GB RAM, 800GB storage
```

### Network Infrastructure

#### Network Segmentation
```
Recommended Network Layout:
┌─────────────────────────────────────────────────────────┐
│ Management Network: 10.0.1.0/24                        │
│ ├── Proxmox Host: 10.0.1.10                           │
│ └── Admin Workstations: 10.0.1.100-199                │
├─────────────────────────────────────────────────────────┤
│ Kubernetes Network: 10.0.2.0/24                        │
│ ├── Control Planes: 10.0.2.10-12                      │
│ └── Workers: 10.0.2.20-29                              │
├─────────────────────────────────────────────────────────┤
│ Service Network: 10.0.3.0/24                           │
│ ├── Load Balancers: 10.0.3.10-19                      │
│ └── External Services: 10.0.3.100-199                  │
└─────────────────────────────────────────────────────────┘
```

#### DNS Configuration
- **Internal DNS**: Configure DNS server for cluster hostnames
- **External DNS**: Set up external DNS for applications (if needed)
- **Reverse DNS**: Configure PTR records for better logging

#### Firewall Rules
```bash
# Basic firewall rules for cluster communication
# Kubernetes API Server
iptables -A INPUT -p tcp --dport 6443 -s 10.0.2.0/24 -j ACCEPT

# etcd
iptables -A INPUT -p tcp --dport 2379:2380 -s 10.0.2.0/24 -j ACCEPT

# Kubelet API
iptables -A INPUT -p tcp --dport 10250 -s 10.0.2.0/24 -j ACCEPT

# Talos API
iptables -A INPUT -p tcp --dport 50000:50001 -s 10.0.2.0/24 -j ACCEPT
```

---

## 🖥️ **Proxmox VE Setup**

### Installation and Configuration

#### 1. Install Proxmox VE
```bash
# Download Proxmox VE ISO from https://www.proxmox.com/downloads
# Install following official documentation
# Post-installation updates:
apt update && apt upgrade -y
```

#### 2. Configure Storage
```bash
# Create VM storage pool
pvesm add dir vm-storage --path /var/lib/vz/vm-storage --content images

# Create ISO storage (if needed)
pvesm add dir iso-storage --path /var/lib/vz/template/iso --content iso

# Verify storage configuration
pvesm status
```

#### 3. Network Bridge Configuration
```bash
# Edit /etc/network/interfaces
auto vmbr0
iface vmbr0 inet static
    address 10.0.1.10/24
    gateway 10.0.1.1
    bridge-ports ens18
    bridge-stp off
    bridge-fd 0

# Apply network configuration
systemctl restart networking
```

#### 4. Upload Talos ISO
```bash
# Download Talos ISO
TALOS_VERSION="v1.10.0"
wget https://github.com/siderolabs/talos/releases/download/$TALOS_VERSION/talos-amd64.iso

# Upload to Proxmox storage
# Via web interface: Datacenter > <node> > local > ISO Images > Upload
# Or via CLI:
cp talos-amd64.iso /var/lib/vz/template/iso/
```

### User and API Configuration

#### 1. Create InfraFlux User
```bash
# Create user for InfraFlux automation
pveum user add infraflux@pve
pveum passwd infraflux@pve

# Create role with necessary permissions
pveum role add InfraFluxRole -privs "VM.Allocate VM.Clone VM.Config.CDROM VM.Config.CPU VM.Config.Cloudinit VM.Config.Disk VM.Config.HWType VM.Config.Memory VM.Config.Network VM.Config.Options VM.Monitor VM.Audit VM.PowerMgmt Datastore.AllocateSpace Datastore.Audit SDN.Use"

# Assign role to user
pveum aclmod / -user infraflux@pve -role InfraFluxRole
```

#### 2. Test API Access
```bash
# Test authentication
curl -k -d "username=infraflux@pve&password=<password>" \
  https://<proxmox-host>:8006/api2/json/access/ticket

# Test permissions
curl -k -H "Authorization: PVEAuthCookie=<ticket>" \
  https://<proxmox-host>:8006/api2/json/nodes
```

---

## 🔧 **Development Environment Setup**

### Required Tools Installation

#### macOS Installation
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install python3 terraform yq

# Install Talos CLI
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x kubectl && sudo mv kubectl /usr/local/bin/

# Install Python dependencies
pip3 install PyYAML Jinja2
```

#### Linux Installation
```bash
# Update package manager
sudo apt update  # Ubuntu/Debian
# OR
sudo yum update   # RHEL/CentOS

# Install Python and pip
sudo apt install python3 python3-pip -y

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | gpg --dearmor | sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install yq
sudo wget -O /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
sudo chmod +x /usr/local/bin/yq

# Install Talos CLI
curl -sL https://talos.dev/install | sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Python dependencies
pip3 install PyYAML Jinja2
```

### Tool Verification
```bash
# Verify all tools are installed correctly
python3 --version          # Should be 3.8+
terraform version          # Should be 1.0+
yq --version               # Should be 4.0+
talosctl version --client  # Should be 1.7+
kubectl version --client   # Should be 1.28+

# Test Python dependencies
python3 -c "import yaml, jinja2; print('Python dependencies OK')"
```

---

## 🔐 **Security Configuration**

### SSL/TLS Certificates

#### For Proxmox (Optional but Recommended)
```bash
# Generate SSL certificate for Proxmox
# Option 1: Self-signed (for internal use)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/pve/local/pve-ssl.key \
  -out /etc/pve/local/pve-ssl.pem \
  -subj "/CN=proxmox.yourdomain.com"

# Option 2: Let's Encrypt (for external access)
# Install certbot and configure for your domain
```

### SSH Key Management (for GitOps)

#### Generate SSH Keys
```bash
# Generate SSH key for GitOps
ssh-keygen -t ed25519 -f ~/.ssh/infraflux-gitops -N ""

# Add public key to your Git repository
cat ~/.ssh/infraflux-gitops.pub
# Copy output and add as deploy key in your Git repository
```

### Network Security

#### Firewall Configuration
```bash
# Example iptables rules for production
# Allow SSH (change port as needed)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow Proxmox web interface
iptables -A INPUT -p tcp --dport 8006 -j ACCEPT

# Allow cluster communication
iptables -A INPUT -s 10.0.2.0/24 -j ACCEPT

# Default deny
iptables -A INPUT -j DROP
iptables -A FORWARD -j DROP

# Save rules
iptables-save > /etc/iptables/rules.v4
```

---

## ⚙️ **Configuration Preparation**

### IP Address Planning

#### Create IP Address Worksheet
```yaml
# Document your IP allocation
infrastructure:
  proxmox_host: "10.0.1.10"
  gateway: "10.0.1.1"
  dns_servers: ["8.8.8.8", "8.8.4.4"]

kubernetes_cluster:
  control_plane_ips:
    - "10.0.2.10"  # k8s-cp-01
    - "10.0.2.11"  # k8s-cp-02  
    - "10.0.2.12"  # k8s-cp-03
  worker_ips:
    - "10.0.2.20"  # k8s-worker-01
    - "10.0.2.21"  # k8s-worker-02
    - "10.0.2.22"  # k8s-worker-03
  load_balancer_ip: "10.0.2.100"

services:
  monitoring_ip: "10.0.3.10"
  storage_ip: "10.0.3.20"
```

### Git Repository Setup (for GitOps)

#### 1. Create GitOps Repository
```bash
# Create new repository for cluster configuration
git init infraflux-gitops
cd infraflux-gitops

# Create basic structure
mkdir -p {clusters/{production,staging,development},apps/{base,overlays},infrastructure}

# Add initial commit
git add .
git commit -m "Initial GitOps repository structure"

# Push to remote repository
git remote add origin git@github.com:yourorg/infraflux-gitops.git
git push -u origin main
```

#### 2. Configure SSH Access
```bash
# Add SSH key to repository (GitHub/GitLab)
# Copy public key content
cat ~/.ssh/infraflux-gitops.pub

# Test SSH access
ssh -T git@github.com  # For GitHub
ssh -T git@gitlab.com  # For GitLab
```

### Environment Configuration

#### 1. Create Production Configuration
```bash
# Copy template configuration
cp config/test-cluster-config.yaml config/production-cluster-config.yaml

# Edit production configuration
nano config/production-cluster-config.yaml
```

#### 2. Configure Environment Variables
```bash
# Create environment file (DO NOT commit this)
cat > .env << EOF
# Proxmox Configuration
PROXMOX_PASSWORD="your-secure-password"
PROXMOX_HOST="10.0.1.10"

# GitOps Configuration
GITHUB_TOKEN="your-github-token"  # If using GitHub API
GITLAB_TOKEN="your-gitlab-token"  # If using GitLab API

# Optional: Monitoring and Alerting
SLACK_WEBHOOK_URL="your-slack-webhook"
EMAIL_SMTP_PASSWORD="your-smtp-password"
EOF

# Source environment variables
source .env

# Add .env to .gitignore
echo ".env" >> .gitignore
```

---

## 🔍 **Pre-Deployment Verification**

### Infrastructure Checklist
```bash
# Verify Proxmox is accessible
ping 10.0.1.10
curl -k https://10.0.1.10:8006/api2/json/version

# Verify IP addresses are free
for ip in 10.0.2.10 10.0.2.11 10.0.2.12 10.0.2.20 10.0.2.21; do
  ping -c 1 $ip || echo "$ip is available"
done

# Verify DNS resolution
nslookup proxmox.yourdomain.com
```

### Configuration Validation
```bash
# Test configuration generation
python3 scripts/generate-configs.py \
  --config config/production-cluster-config.yaml \
  --output /tmp/test-production \
  --validate-only

# Verify Terraform configuration
cd /tmp/test-production/terraform
terraform init
terraform validate
```

### Security Verification
```bash
# Verify SSH key access
ssh -i ~/.ssh/infraflux-gitops -T git@github.com

# Test Proxmox API access
curl -k -d "username=infraflux@pve&password=$PROXMOX_PASSWORD" \
  https://10.0.1.10:8006/api2/json/access/ticket
```

---

## 📋 **Production Deployment Preparation Checklist**

### Infrastructure ✅
- [ ] Proxmox VE installed and configured
- [ ] Network bridges configured correctly
- [ ] Storage pools created and available
- [ ] Talos ISO uploaded to Proxmox
- [ ] Firewall rules configured
- [ ] DNS configuration completed

### Security ✅
- [ ] Proxmox user created with appropriate permissions
- [ ] SSH keys generated for GitOps
- [ ] SSL certificates configured (if needed)
- [ ] Network security policies implemented
- [ ] Backup procedures documented

### Development Environment ✅
- [ ] All required tools installed and verified
- [ ] Python dependencies installed
- [ ] API access to Proxmox tested
- [ ] Git repository access configured

### Configuration ✅
- [ ] IP address allocation planned and documented
- [ ] Production configuration file created
- [ ] Environment variables configured
- [ ] GitOps repository prepared (if using)
- [ ] Configuration validation completed

### Documentation ✅
- [ ] Infrastructure documentation updated
- [ ] Access credentials documented securely
- [ ] Emergency contact information available
- [ ] Rollback procedures reviewed

---

## 🚨 **Important Security Notes**

### Credential Management
- **NEVER** commit passwords or API keys to Git
- Use environment variables for sensitive data
- Implement proper secret management (HashiCorp Vault, etc.)
- Rotate credentials regularly

### Network Security
- Implement network segmentation
- Use strong firewall rules
- Enable logging and monitoring
- Regular security audits

### Access Control
- Follow principle of least privilege
- Use multi-factor authentication where possible
- Regular access reviews
- Audit logging enabled

---

## 🎯 **Next Steps**

After completing this setup:

1. **Review** the [Production Deployment Checklist](PRODUCTION_DEPLOYMENT_CHECKLIST.md)
2. **Execute** deployment using `./deploy.sh config/production-cluster-config.yaml`
3. **Monitor** the deployment progress through each phase
4. **Validate** the cluster using the post-deployment checklist
5. **Document** any environment-specific configurations

---

**⚠️ Critical**: This setup guide must be followed completely for production deployments. Shortcuts or omissions may result in security vulnerabilities or deployment failures.

**📞 Support**: For assistance during setup, refer to the troubleshooting guide or contact your infrastructure team.

---

*Last Updated: 2025-06-19*  
*Version: 1.0*  
*Environment: Production*