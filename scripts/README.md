# InfraFlux Scripts

Automation scripts for deployment and management.

## 🚀 Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `configure.sh` | Interactive cluster configuration | `./configure.sh` |
| `deploy.sh` | Main deployment orchestrator | `./deploy.sh [phase]` |
| `scale-cluster.sh` | Dynamic node scaling | `./scale-cluster.sh <count>` |
| `bootstrap-flux.sh` | Flux GitOps activation | `./scripts/bootstrap-flux.sh` |
| `configure-apps.sh` | Application enable/disable | `./scripts/configure-apps.sh` |
| `install-flux.sh` | Flux CLI installation | `./scripts/install-flux.sh` |

## 📖 Quick Reference

### Deployment
```bash
# Configure and deploy
./configure.sh
./deploy.sh

# Deploy specific phase
./deploy.sh infrastructure
./deploy.sh k3s
./deploy.sh apps
```

### Scaling
```bash
# Scale to 5 worker nodes
./scale-cluster.sh 5

# Scale down to 1 worker node  
./scale-cluster.sh 1
```

### GitOps
```bash
# Activate Flux GitOps
GITHUB_USER=myuser GITHUB_TOKEN=ghp_xxx ./scripts/bootstrap-flux.sh
```

All scripts include comprehensive help and error handling for reliable operations.