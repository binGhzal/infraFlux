# InfraFlux v2.0

A comprehensive infrastructure automation project that uses Ansible and Terraform to provision and manage Talos Kubernetes clusters on Proxmox virtual machines.

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/infraflux.git
cd infraflux

# 2. Set up development environment
./scripts/dev-setup.sh

# 3. Set up secrets management
./scripts/setup-vault.sh

# 4. Configure your environment
cp configs/global.yaml.example configs/global.yaml
cp ansible/inventory/hosts.yml.example ansible/inventory/hosts.yml
# Edit both files with your specific configuration

# 5. Validate configuration
./scripts/validate.sh

# 6. Test connectivity
ansible-playbook ansible/playbooks/test-proxmox-connection.yaml

# 7. Deploy your homelab
./scripts/deploy.sh
```

## 📋 Prerequisites

### Required Software
- Ansible >= 2.14
- Terraform >= 1.5.0
- Packer >= 1.9.0
- Python >= 3.9
- jinja2 >= 3.0

### Proxmox Requirements
- Proxmox VE >= 7.4
- API access enabled
- Sufficient resources for VM deployment
- Network bridge configured (typically vmbr0)

### Network Requirements
- IP range allocated for VMs
- VLAN support (optional)
- DNS server accessible
- Internet connectivity for package downloads

## 🏗️ Architecture

InfraFlux v2.0 follows a layered architecture:

- **Control Plane**: Ansible orchestration with dynamic Terraform generation
- **Infrastructure Layer**: Proxmox VE with VM management
- **Platform Layer**: Talos Kubernetes with Cilium CNI and Longhorn storage
- **Application Layer**: FluxCD GitOps with comprehensive observability

## 📖 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- [System Architecture](docs/specs/architecture.md)
- [Infrastructure Specification](docs/specs/infrastructure.md)
- [Talos Cluster Configuration](docs/specs/talos-cluster.md)
- [Configuration Schema](docs/specs/configuration-schema.md)
- [Implementation Plan](docs/plan/implementation-plan.md)

## ⚙️ Configuration

### Global Configuration

Edit `configs/global.yaml` with your environment details:

```yaml
proxmox:
  api_url: "https://proxmox.example.com:8006"
  api_user: "root@pam"
  api_token_id: "infraflux"
  node_name: "proxmox-node1"

cluster:
  name: "infraflux-cluster"
  type: "talos"
  talos:
    version: "v1.6.0"
    kubernetes_version: "v1.29.0"
```

### Inventory Configuration

Edit `ansible/inventory/hosts.yml` with your node details:

```yaml
proxmox_servers:
  hosts:
    proxmox-1:
      ansible_host: "192.168.0.10"

control_plane:
  hosts:
    k8s-cp-1:
      ansible_host: "192.168.1.10"
      vm_id: 100
      proxmox_node: "proxmox-1"
```

## 🔐 Security

InfraFlux implements multi-layer security:

- **Ansible Vault**: Infrastructure secrets encryption
- **Sealed Secrets**: Kubernetes secrets management
- **Network Policies**: Pod-to-pod communication control
- **RBAC**: Role-based access control
- **TLS Everywhere**: End-to-end encryption

## 🛠️ Development

### Environment Setup

```bash
# Set up development environment
./scripts/dev-setup.sh

# Activate Python virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
ansible-galaxy collection install -r ansible/collections/requirements.yaml
```

### Common Commands

```bash
# Validate configuration
./scripts/validate.sh

# Test Proxmox connectivity
ansible-playbook ansible/playbooks/test-proxmox-connection.yaml

# Deploy infrastructure
./scripts/deploy.sh

# Clean up environment
./scripts/cleanup.sh
```

### Testing

```bash
# Run all validations
ansible-playbook ansible/playbooks/validate-config.yaml

# Test specific components
ansible -m ping proxmox_servers
ansible -m ping kubernetes
```

## 📊 Monitoring

InfraFlux includes comprehensive monitoring:

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Loki**: Centralized logging
- **Cilium Hubble**: Network observability

## 🔄 GitOps

Application deployment through GitOps:

- **FluxCD**: Continuous deployment controller
- **Kustomize**: Configuration management
- **Helm**: Package management
- **Sealed Secrets**: Secure secret management

## 🆘 Troubleshooting

### Common Issues

1. **Proxmox API Connection Fails**
   ```bash
   # Test API connectivity
   ansible-playbook ansible/playbooks/test-proxmox-connection.yaml
   ```

2. **SSH Key Issues**
   ```bash
   # Regenerate SSH keys
   ./scripts/setup-vault.sh
   ```

3. **Configuration Validation Errors**
   ```bash
   # Validate all configurations
   ./scripts/validate.sh
   ```

### Debug Mode

Enable verbose output:

```bash
# Ansible debug
ANSIBLE_DEBUG=1 ansible-playbook deploy.yaml -vvv

# Terraform debug
TF_LOG=DEBUG terraform apply
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and validation
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Talos Linux](https://talos.dev/) for the immutable Kubernetes platform
- [Proxmox VE](https://www.proxmox.com/) for the virtualization platform
- [Ansible](https://www.ansible.com/) for automation capabilities
- [Terraform](https://www.terraform.io/) for infrastructure as code
- [FluxCD](https://fluxcd.io/) for GitOps workflows

---

Built with ❤️ for the homelab community