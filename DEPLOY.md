# InfraFlux v2.0 - Pure Declarative Deployment

**No scripts. Pure Ansible. Works everywhere.**

## Quick Start

### 1. Setup Environment (Any OS)

```bash
# Create Python environment
python3 -m venv venv

# Activate (Linux/macOS)
source venv/bin/activate

# Activate (Windows)
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Your Cluster

```bash
# Copy configuration template
cp config/cluster.yaml.example config/cluster.yaml

# Edit your Proxmox host IP (only required field!)
# Change: host: "10.0.0.69" to your Proxmox IP

# Setup runtime secrets
cp config/.env.template config/.env
# Add your Proxmox password and other secrets
```

### 3. Deploy (Pure Declarative)

```bash
# Full deployment - one command, works on any OS
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all

# Or deploy specific phases:
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=infrastructure

ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=bootstrap

ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=apps
```

## Cross-Platform Commands

### Windows

```cmd
REM Setup
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

REM Deploy
ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=all
```

### Linux/macOS

```bash
# Setup
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Deploy
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all
```

## Secret Management

**Simple `.env` file approach** - no complex secret management needed:

```bash
# config/.env - Only file you need for secrets
PROXMOX_PASSWORD="your-proxmox-root-password"  # Required
PROXMOX_API_TOKEN_ID="root@pam!infraflux"     # Required for Terraform
PROXMOX_API_TOKEN_SECRET="your-api-secret"    # Required for Terraform
GITHUB_TOKEN="ghp_your-github-token"          # Optional for GitOps
GIT_SSH_KEY_PATH="~/.ssh/id_rsa"              # Optional

# Optional settings
DEBUG="false"
ANSIBLE_VERBOSITY="0"
```

### Creating Proxmox API Token

1. **Login to Proxmox Web UI** as root
2. **Go to**: Datacenter → Permissions → API Tokens
3. **Click**: Add
4. **Configure**:
   - User: `root@pam`
   - Token ID: `infraflux` (or any name)
   - Privilege Separation: **Uncheck** (for full root access)
5. **Copy** the displayed secret immediately (shown only once!)
6. **Set in `.env`**:
   ```bash
   PROXMOX_API_TOKEN_ID="root@pam!infraflux"
   PROXMOX_API_TOKEN_SECRET="your-copied-secret"
   ```

**Note**: Talos cluster secrets are auto-generated during deployment - no manual management required!

No shell scripts needed - Ansible handles everything declaratively!

## Configuration

Single file with intelligent defaults:

```yaml
# config/cluster.yaml
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: my-cluster
  environment: development # Automatically configures everything

spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69" # Only required field!
```

## What You Get

- **Talos Linux** - Immutable Kubernetes OS
- **Cilium CNI** - Modern networking
- **Auto-sized VMs** - Based on environment
- **Sealed Secrets** - Encrypted secret management
- **Production Monitoring** - In staging/production environments

## Pure Declarative Benefits

- ✅ **Cross-platform** - Same commands everywhere
- ✅ **No shell dependencies** - Pure Python/Ansible
- ✅ **Reproducible** - Exact same behavior on any OS
- ✅ **Version controlled** - All configuration in Git
- ✅ **Idempotent** - Safe to run multiple times
- ✅ **Environment aware** - Smart defaults for dev/staging/prod

## Troubleshooting

### Debug Mode

```bash
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all \
  --verbose
```

### Validate Configuration

```bash
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=prerequisites \
  --check
```

### Environment Variables

```bash
# Linux/macOS
export ANSIBLE_VERBOSITY=3

# Windows
set ANSIBLE_VERBOSITY=3
```

No shell scripts. No platform-specific commands. Pure declarative infrastructure!
