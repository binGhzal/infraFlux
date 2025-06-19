# InfraFlux v2.0 - Configuration Directory

## Quick Start

1. **Copy cluster template**:
   ```bash
   cp cluster.example.yaml cluster.yaml
   ```

2. **Edit cluster configuration**:
   ```bash
   # Edit cluster.yaml - only change the Proxmox host IP:
   nano cluster.yaml
   # Change: host: "10.0.0.69" to your Proxmox IP
   ```

3. **Setup secrets**:
   ```bash
   cp .env.template .env
   # Edit .env with your actual Proxmox password
   nano .env
   ```

## File Structure

```
config/
├── cluster.yaml          # ← Your main configuration (edit this!)
├── cluster.example.yaml  # Template (don't edit)
├── .env                  # ← Your secrets (edit this!)
└── .env.template         # Template (don't edit)
```

## Secret Management

**Simple approach**: Only use `.env` file for runtime secrets.

```bash
# config/.env
PROXMOX_PASSWORD="your-password"     # Required for VM creation
GITHUB_TOKEN="ghp_your-token"        # Optional for GitOps
GIT_SSH_KEY_PATH="~/.ssh/id_rsa"     # Optional for SSH access
```

**No Kubernetes secrets needed** - Talos generates its own cluster secrets automatically during deployment.

## Configuration Options

### Minimal (Development)
```yaml
# cluster.yaml
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: my-cluster
  environment: development  # Auto-configures everything for dev
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"  # Only required field!
```

### Production
```yaml
# cluster.yaml  
apiVersion: infraflux.dev/v1
kind: Cluster
metadata:
  name: prod-cluster
  environment: production  # Auto-configures for production
spec:
  infrastructure:
    proxmox:
      host: "10.0.0.69"
      
  # Optional overrides
  overrides:
    nodes:
      control_plane:
        count: 5  # More than default 3
        resources:
          cpu: 8
          memory: 16384
```

## Security

- **`cluster.yaml`**: Safe to commit (no secrets)
- **`.env`**: Never commit (contains secrets)
- **`.env.template`**: Safe to commit (template only)

The `.gitignore` already excludes `.env` files automatically.