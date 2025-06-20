# InfraFlux v2.0

Modern, declarative infrastructure automation for homelab deployment on Proxmox using Pulumi and
Talos Linux.

## Features

- 🚀 **One-Command Deployment**: Deploy entire Kubernetes infrastructure with `pulumi up`
- 📝 **Declarative Configuration**: Single `.env` file controls everything
- 🔧 **Auto-Configuration**: Sensible defaults for all settings
- 🤖 **Automatic Template Management**: Custom Talos factory images with extensions
- 🏷️ **Smart Tagging**: All resources tagged as InfraFlux-managed
- 💾 **Flexible Storage**: Separate storage pools for ISOs and VM disks
- 🐳 **Talos Kubernetes**: Immutable, secure Kubernetes with Cilium CNI
- 🔄 **GitOps Enabled**: FluxCD integration for continuous deployment
- 📦 **Component-Based**: Small, reusable infrastructure components
- 🔒 **Security First**: Talos Linux hardened by design, no SSH required
- 📊 **Built-in Monitoring**: Ready for Prometheus + Grafana via GitOps
- 🌐 **CloudFlare Ready**: Built-in CloudFlare Tunnel support for secure external access

## Quick Start

### Prerequisites

1. Proxmox VE server (v7.0+)
2. Node.js 18+ installed locally
3. Pulumi CLI installed (`curl -fsSL https://get.pulumi.com | sh`)
4. SSH access to Proxmox host

### Deploy in 3 Steps

1. **Clone and Configure**

   ```bash
   git clone https://github.com/your-org/infraflux
   cd infraflux
   cp env.example .env
   # Edit .env with your Proxmox credentials
   ```

2. **Install Dependencies**

   ```bash
   npm install
   npm run build
   ```

3. **Deploy Infrastructure**
   ```bash
   pulumi stack init homelab
   pulumi up
   ```

That's it! InfraFlux will automatically:

- Create custom Talos factory images with extensions
- Deploy secure, immutable Kubernetes nodes
- Configure GitOps with FluxCD
- Set up monitoring and external access

## Automatic Talos Template Management

InfraFlux creates custom Talos OS templates from the Image Factory:

1. **Custom Factory Images**: Downloads installer with QEMU Guest Agent + CloudFlare Tunnel
2. **ISO Attachment**: Templates include the Talos ISO attached to CD-ROM
3. **Template Types**: Separate master and worker templates optimized for their roles
4. **Smart Caching**: Reuses existing templates when schematic matches
5. **Clone Ready**: VMs cloned from templates inherit the attached ISO and boot configuration

### Template Status

When you run `pulumi up`, you'll see:

- ✅ **Template ready**: Using existing Talos factory template with ISO attached
- ⏳ **Creating template**: Downloading custom factory image and creating templates
- 🔄 **Updating template**: New schematic or version available

### Template Flow

1. **ISO Download**: Custom Talos factory image downloaded to ISO storage
2. **Template Creation**: Master and worker templates created with ISO attached
3. **VM Cloning**: VMs cloned from templates inherit ISO and can boot to install Talos
4. **Auto-Installation**: Talos installs from attached ISO during first boot

## Configuration

The `.env` file requires only 3 settings to start:

```env
# Proxmox access
PROXMOX_ENDPOINT=https://192.168.1.100:8006
PROXMOX_USERNAME=root@pam
PROXMOX_PASSWORD=your-password
```

### Optional Settings

```env
# Talos template configuration
TALOS_TEMPLATE_ID=9010       # Talos factory template ID
TALOS_VERSION=v1.10.4        # Talos version to use

# Storage configuration (separate pools for better organization)
VM_STORAGE_POOL=local-lvm    # Fast storage for VM disks
ISO_STORAGE_POOL=local       # Storage for ISOs and factory images

# Cluster size (defaults: 1 master, 3 workers)
K8S_MASTER_COUNT=1
K8S_WORKER_COUNT=3

# Network configuration
K8S_MASTER_IP_START=10.0.0.200  # Starting IP for master nodes
K8S_WORKER_IP_START=10.0.0.201  # Starting IP for worker nodes

# GitOps (FluxCD)
GITOPS_ENABLED=true
GITOPS_REPO=https://github.com/your-org/gitops-repo
```

## What Gets Deployed

### Step 1: Talos Template (Current)

- Custom Talos factory image with extensions
- QEMU Guest Agent for Proxmox integration
- CloudFlare Tunnel support built-in
- InfraFlux tagging for management

### Step 2: Talos Kubernetes Cluster

- Immutable Talos Linux nodes
- Cilium CNI for networking
- Automatic cluster bootstrapping
- Secure, SSH-free management

### Step 3: GitOps & Management

- FluxCD for continuous deployment
- Monitoring ready (Prometheus/Grafana)
- CloudFlare Tunnel for external access
- Automated application deployment

## Project Structure

```
infraflux/
├── src/
│   ├── components/         # Reusable infrastructure components
│   │   ├── talos-template.ts    # Talos factory template management
│   │   ├── talos-cluster.ts     # Talos Kubernetes cluster
│   │   ├── vm.ts               # VM provisioning
│   │   └── gitops.ts           # FluxCD GitOps
│   ├── config/            # Configuration management
│   ├── types/             # TypeScript definitions
│   └── index.ts           # Main entry point
├── .env.example           # Example configuration
└── package.json           # Dependencies
```

## Talos Factory Integration

InfraFlux leverages the Talos Image Factory for custom OS images:

### Factory Images

- **Source**: factory.talos.dev with custom schematics
- **Extensions**: QEMU Guest Agent + CloudFlare Tunnel pre-installed
- **Optimization**: Perfect integration with Proxmox cloud-init
- **Security**: Immutable OS, no SSH access required

### Schematic Management

InfraFlux automatically generates schematics based on your requirements:

```typescript
// Extensions included by default:
const extensions = [
  'qemu-guest-agent', // Proxmox integration
  'cloudflared', // Secure tunnel support
];
```

### Custom Extensions

Add more extensions by modifying the schematic:

```env
# In .env file
TALOS_EXTENSIONS=qemu-guest-agent,cloudflared,iscsi-tools
```

## Troubleshooting

### Template Already Exists

If you see "Template exists but is not InfraFlux-managed":

1. Choose a different template ID in `.env`
2. Or manually remove the existing template
3. Re-run `pulumi up`

### Download Failures

If cloud image downloads fail:

1. Check internet connectivity on Proxmox host
2. Verify the image URL is accessible
3. Check available disk space in `/tmp`

### SSH Connection Issues

Ensure:

1. SSH access to Proxmox host is configured
2. Proxmox credentials in `.env` are correct
3. Firewall allows SSH connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Storage Configuration

InfraFlux uses separate storage pools for different purposes:

### ISO Storage Pool

- **Purpose**: Stores ISO files and cloud images for template creation
- **Default**: `local` (typically on the Proxmox host's local disk)
- **Configure**: `ISO_STORAGE_POOL=local`
- **Usage**: Temporary storage for downloading cloud images

### VM Storage Pool

- **Purpose**: Stores VM disks, cloud-init drives, and templates
- **Default**: `local-lvm` (typically faster LVM storage)
- **Configure**: `VM_STORAGE_POOL=local-lvm`
- **Usage**: Permanent storage for VMs and their data

This separation allows you to:

- Use cheaper/slower storage for ISOs (rarely accessed)
- Use faster storage (SSD/NVMe) for VM disks
- Manage storage capacity more efficiently
- Use shared storage for VMs while keeping ISOs local
