# InfraFlux Repository Reorganization Plan

## Current Issues & Solutions

### 1. **Eliminate Complex Folder Structures**

**Issues:**

- Multiple deployment paths: `playbooks/`, `deployments/`, `deploy.sh`, `deploy.yml`
- Empty `terraform/templates/` folder
- Duplicated configuration files

**Solution:**

- Single deployment method using Ansible + Terraform
- Move unused files to trash
- Streamlined folder structure

### 2. **Enable Native K3s Features**

**Issues:**

- Traefik disabled: `k3s_disable_traefik: "true"`
- Using external NGINX instead of native Traefik
- Missing native K3s integrations

**Solution:**

- Enable Traefik: `k3s_disable_traefik: "false"`
- Configure Traefik middleware and IngressRoutes
- Use K3s ServiceLB instead of MetalLB where possible

### 3. **Clarify Authentication Methods**

**Issues:**

- Mixed Proxmox password vs SSH key usage
- Unclear authentication flow

**Solution:**

- Proxmox API: Use password authentication
- VM Access: Use SSH keys (distributed during VM creation)
- Clear documentation of auth flow

## Reorganization Steps

### Phase 1: Clean Up & Move to Trash

```bash
# Files to move to trash (duplicates, unused, complex structures)
trash/
├── terraform/                    # Empty folder, move to trash
├── validate.sh                   # Unused validation script
└── [existing trash contents]
```

### Phase 2: Simplified Structure

```
infraFlux/
├── README.md                     # Keep in root
├── configure.sh                  # Interactive setup wizard
├── deploy.sh                     # Single deployment script
├── config/
│   └── cluster-config.yaml       # Unified configuration
├── docs/                         # All documentation here
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT_FLOW.md
│   ├── DEPLOYMENT_FLOWCHART.md
│   └── QUICKSTART.md
├── ansible/                      # Single Ansible structure
│   ├── ansible.cfg
│   ├── deploy.yml                # Main playbook
│   ├── inventory/
│   │   └── dynamic_inventory.yml
│   ├── playbooks/
│   │   ├── infrastructure.yml    # VM creation with Terraform
│   │   ├── node-preparation.yml  # Node setup
│   │   ├── k3s-cluster.yml       # K3s with Traefik enabled
│   │   └── applications.yml      # Core apps
│   ├── roles/
│   │   ├── proxmox/             # Terraform + Proxmox
│   │   └── node/                # Node configuration
│   └── templates/
│       ├── terraform/
│       │   ├── main.tf          # Proxmox VM creation
│       │   ├── variables.tf     # Terraform variables
│       │   └── outputs.tf       # IP addresses, etc.
│       └── inventory.ini.j2     # Dynamic inventory template
└── trash/                       # All unwanted files
```

### Phase 3: Configuration Updates

**cluster-config.yaml changes:**

```yaml
# Enable native K3s features
k3s_disable_traefik: "false" # Changed from "true"
k3s_disable_servicelb: "false" # Use native service LB
install_ingress_nginx: "false" # Don't install external NGINX
install_metallb: "false" # Use K3s ServiceLB instead

# Traefik configuration
traefik_dashboard_enabled: "true"
traefik_api_insecure: "false"
traefik_log_level: "INFO"
```

### Phase 4: Enhanced Terraform Integration

**terraform/main.tf:**

- Proper Proxmox provider configuration
- VM creation with cloud-init
- Network configuration
- Output generation for Ansible

## Implementation Priority

1. ✅ **Move unused files to trash**
2. ✅ **Update cluster-config.yaml for native K3s features**
3. ✅ **Create proper Terraform templates**
4. ✅ **Simplify deployment scripts**
5. ✅ **Update documentation**
6. ✅ **Test deployment flow**

## Benefits of New Structure

- **Simplified**: Single deployment path, clear structure
- **Native**: Uses K3s built-in features (Traefik, ServiceLB)
- **Maintainable**: Easier to debug and extend
- **Clear**: Obvious separation of concerns
- **Efficient**: Faster deployment with fewer dependencies
