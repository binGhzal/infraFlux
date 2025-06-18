# Applications Documentation

Comprehensive guides for deploying and managing applications in InfraFlux.

## 📋 Available Applications

### 🛡️ Security & Authentication
- [Authentik SSO](security/AUTHENTIK.md) - Enterprise SSO with LDAP/SAML
- [Vaultwarden](security/VAULTWARDEN.md) - Password management
- [CrowdSec](security/CROWDSEC.md) - Behavioral security analysis

### 📊 Monitoring & Observability  
- [Prometheus](monitoring/PROMETHEUS.md) - Metrics collection and alerting
- [Grafana](monitoring/GRAFANA.md) - Dashboards and visualization
- [Loki](monitoring/LOKI.md) - Log aggregation and analysis
- [Uptime Kuma](monitoring/UPTIME_KUMA.md) - Service monitoring

### 💼 Productivity & Collaboration
- [Nextcloud](productivity/NEXTCLOUD.md) - File storage and collaboration
- [Gitea](productivity/GITEA.md) - Git repository hosting
- [Paperless-NGX](productivity/PAPERLESS.md) - Document management
- [Code Server](productivity/CODE_SERVER.md) - VS Code in browser

### 🤖 AI/ML Platform
- [Ollama](ai-ml/OLLAMA.md) - Local LLM hosting
- [Open WebUI](ai-ml/OPEN_WEBUI.md) - ChatGPT-style interface
- [Model Management](ai-ml/MODEL_MANAGEMENT.md) - AI model lifecycle

### 🎬 Media & Entertainment
- [Jellyfin](media/JELLYFIN.md) - Media streaming server
- [Immich](media/IMMICH.md) - Google Photos alternative

### 🔧 Development & DevOps
- [Homepage](devops/HOMEPAGE.md) - Centralized dashboard
- [N8N](devops/N8N.md) - Workflow automation

## 🚀 Deployment Methods

### Method 1: Ansible-Managed (Current)
Applications in `cluster/base/applications/` are deployed during cluster bootstrap.

```bash
# Deploy all applications
./deploy.sh apps

# Deploy specific application category
./deploy.sh apps --category security
```

### Method 2: Flux GitOps (New)
Applications in `apps/` are managed by Flux for continuous delivery.

```bash
# Add new application via GitOps
kubectl apply -f apps/base/my-app/

# Or use Flux CLI
flux create helmrelease my-app \
  --source=HelmRepository/bitnami \
  --chart=nginx \
  --target-namespace=applications
```

## 📝 Application Structure

### Ansible-Managed Apps
```
cluster/base/applications/
├── app-name/
│   ├── kustomization.yaml
│   └── app-name.yaml
```

### Flux-Managed Apps  
```
apps/base/app-name/
├── kustomization.yaml
├── namespace.yaml
├── helmrelease.yaml
└── values/
    ├── staging.yaml
    └── production.yaml
```

## 🔧 Configuration Management

### Environment Variables
Applications use ConfigMaps for configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgresql://..."
  feature_flags: "enable_ai,enable_gpu"
```

### Secrets Management
Sensitive data uses Sealed Secrets:

```bash
# Create sealed secret
echo -n 'my-secret-value' | \
  kubectl create secret generic my-secret \
  --dry-run=client --from-file=key=/dev/stdin -o yaml | \
  kubeseal -o yaml > my-sealed-secret.yaml
```

## 🎯 Application Categories

### Production-Ready ✅
- Authentik SSO
- Prometheus/Grafana
- Nextcloud
- Vaultwarden

### Testing Phase ⚠️
- AI/ML Platform
- Media Stack
- Advanced Automation

### Planned 🔜
- Container Registry
- CI/CD Pipeline
- Advanced Networking

## 🔍 Monitoring & Health

### Application Health
```bash
# Check application status
kubectl get pods -n applications

# View application logs
kubectl logs -n applications deployment/app-name

# Check ingress
kubectl get ingress -n applications
```

### Performance Metrics
- CPU/Memory usage via Prometheus
- Response times via Grafana dashboards
- Error rates via Loki logs

## 🆘 Troubleshooting

### Common Issues
1. **Pod CrashLoopBackOff**: Check logs and resource limits
2. **Ingress not working**: Verify Traefik configuration
3. **Persistent volume issues**: Check storage class and claims
4. **Secret access denied**: Verify RBAC and secret mounting

### Debug Commands
```bash
# Describe problematic pod
kubectl describe pod -n applications pod-name

# Check events
kubectl get events -n applications --sort-by='.lastTimestamp'

# Port forward for testing
kubectl port-forward -n applications svc/app-name 8080:80
```

## 🔗 Integration Guides

- [SSO Integration](integration/SSO.md) - Authentik with applications
- [Monitoring Integration](integration/MONITORING.md) - Prometheus metrics
- [Backup Integration](integration/BACKUP.md) - Velero backup strategies
- [Network Integration](integration/NETWORKING.md) - Ingress and service mesh