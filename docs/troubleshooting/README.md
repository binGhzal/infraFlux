# Troubleshooting Guide

Comprehensive troubleshooting documentation for InfraFlux issues.

## 🚨 Emergency Procedures

### Cluster Down
1. [Cluster Recovery](CLUSTER_RECOVERY.md) - Restore non-responsive cluster
2. [Node Failure](NODE_FAILURE.md) - Handle failed cluster nodes
3. [Storage Issues](STORAGE_ISSUES.md) - Persistent volume problems
4. [Network Outage](NETWORK_OUTAGE.md) - Connectivity restoration

### Data Recovery
1. [Backup Restoration](BACKUP_RESTORATION.md) - Velero backup recovery
2. [Database Recovery](DATABASE_RECOVERY.md) - PostgreSQL/Redis issues
3. [Configuration Recovery](CONFIG_RECOVERY.md) - Lost configurations

## 🔧 Common Issues

### Deployment Problems

#### 1. Ansible Deployment Failures
**Symptoms**: `./deploy.sh` fails during execution
```bash
# Check Ansible logs
ls -la /tmp/infraflux-deploy/
tail -f /tmp/infraflux-deploy/ansible.log

# Common fixes
./deploy.sh --check          # Dry run
./deploy.sh infrastructure --force  # Retry phase
```

**Common Causes**:
- SSH key authentication issues
- Proxmox API connectivity problems
- Insufficient Proxmox resources
- Network configuration conflicts

#### 2. K3s Cluster Issues
**Symptoms**: Nodes not joining cluster, kubectl fails
```bash
# Check K3s status
systemctl status k3s
journalctl -u k3s -f

# Check node connectivity
kubectl get nodes
kubectl describe node <node-name>
```

**Common Fixes**:
- Restart K3s service
- Check firewall rules
- Verify token configuration
- Reset node and rejoin

#### 3. Application Startup Failures
**Symptoms**: Pods in CrashLoopBackOff, ImagePullBackOff
```bash
# Diagnose pod issues
kubectl get pods -A
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

### GitOps Issues

#### 1. Flux Synchronization Problems
**Symptoms**: Applications not updating, Flux errors
```bash
# Check Flux status
flux get all
flux get kustomizations
flux logs --all-namespaces

# Force reconciliation
flux reconcile source git flux-system
flux reconcile kustomization apps
```

#### 2. HelmRelease Failures
**Symptoms**: Helm charts not deploying
```bash
# Check HelmRelease status
kubectl get helmreleases -A
kubectl describe helmrelease <name> -n <namespace>

# Check Helm secrets
kubectl get secrets -n <namespace> | grep helm
```

### Network & Connectivity

#### 1. Ingress Not Working
**Symptoms**: Applications not accessible via browser
```bash
# Check Traefik status
kubectl get pods -n kube-system | grep traefik
kubectl logs -n kube-system deployment/traefik

# Check ingress resources
kubectl get ingress -A
kubectl describe ingress <name> -n <namespace>
```

#### 2. DNS Resolution Issues
**Symptoms**: Services can't resolve each other
```bash
# Test DNS from pod
kubectl run test-pod --image=busybox -it --rm -- nslookup kubernetes.default

# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system deployment/coredns
```

### Storage Problems

#### 1. PVC Stuck in Pending
**Symptoms**: Persistent volumes not provisioning
```bash
# Check PVC status
kubectl get pvc -A
kubectl describe pvc <name> -n <namespace>

# Check storage class
kubectl get storageclass
kubectl describe storageclass local-path
```

#### 2. Out of Disk Space
**Symptoms**: Pods evicted, storage full
```bash
# Check node disk usage
kubectl top nodes
kubectl describe nodes

# Clean up unused resources
kubectl delete pods --field-selector=status.phase=Succeeded -A
docker system prune -a
```

## 🔍 Diagnostic Commands

### System Health Check
```bash
# Comprehensive health check
./validate-repo.sh
./validate-gitops.sh

# Cluster overview
kubectl cluster-info
kubectl get nodes -o wide
kubectl get pods -A | grep -v Running
```

### Resource Usage
```bash
# Node resources
kubectl top nodes
kubectl describe nodes

# Pod resources
kubectl top pods -A
kubectl get pods -A -o=custom-columns=NAME:.metadata.name,STATUS:.status.phase,NODE:.spec.nodeName
```

### Network Diagnostics
```bash
# Service connectivity
kubectl get svc -A
kubectl get endpoints -A

# Network policies
kubectl get networkpolicies -A

# Test pod-to-pod communication
kubectl run test-connectivity --image=busybox -it --rm -- ping <service-ip>
```

## 🔧 Recovery Procedures

### Partial Cluster Recovery
1. **Identify failing components**
2. **Isolate affected nodes**
3. **Restore from backup if needed**
4. **Gradually bring services back online**

### Complete Cluster Rebuild
1. **Backup all persistent data**
2. **Export critical configurations**
3. **Redeploy cluster infrastructure**
4. **Restore applications and data**

### Configuration Rollback
```bash
# Git-based rollback
git revert <commit-hash>
git push

# Flux-based rollback
flux suspend kustomization apps
kubectl apply -f previous-config.yaml
flux resume kustomization apps
```

## 📞 Support Channels

### Self-Service
1. [Troubleshooting Guides](.) - This documentation
2. [Configuration Reference](../infrastructure/CONFIGURATION.md)
3. [Architecture Overview](../architecture/)

### Community
1. [GitHub Issues](https://github.com/infraflux/infraflux/issues)
2. [Discussions](https://github.com/infraflux/infraflux/discussions)

### Monitoring
1. **Grafana Dashboards**: http://grafana.local.cluster
2. **Prometheus Alerts**: http://prometheus.local.cluster
3. **Log Analysis**: http://grafana.local.cluster (Loki)

## 🔄 Preventive Measures

### Regular Maintenance
- Weekly cluster health checks
- Monthly backup validation
- Quarterly security updates
- Annual disaster recovery testing

### Monitoring Setup
- Enable comprehensive alerting
- Set up log aggregation
- Monitor resource usage trends
- Track application performance

### Backup Strategy
- Daily automated backups
- Weekly backup validation
- Monthly backup restoration tests
- Quarterly disaster recovery drills