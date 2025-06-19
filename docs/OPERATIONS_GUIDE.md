# InfraFlux v2.0 - Comprehensive Operations Guide

**Status**: Production Operations Manual  
**Version**: 2.0.0  
**Date**: 2025-06-19

---

## 🎯 Overview

This guide covers complete day-2 operations for InfraFlux deployed clusters including monitoring, maintenance, troubleshooting, and disaster recovery procedures.

---

## 📋 Daily Operations Checklist

### Morning Health Check (5 minutes)
```bash
# 1. Check cluster status
kubectl get nodes
kubectl get pods --all-namespaces | grep -v Running

# 2. Check resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# 3. Check critical services
kubectl get svc -A | grep LoadBalancer
kubectl get ingress -A
```

### Weekly Maintenance (30 minutes)
```bash
# 1. Update cluster certificates (if needed)
talosctl -n <control-plane-ip> time

# 2. Check persistent volume status
kubectl get pv,pvc -A

# 3. Review resource quotas and limits
kubectl describe limitrange -A
kubectl describe resourcequota -A

# 4. Clean up unused resources
kubectl delete pods --field-selector=status.phase=Succeeded -A
kubectl delete pods --field-selector=status.phase=Failed -A
```

---

## 🔧 Troubleshooting Guide

### Deployment Issues

#### Problem: Terraform Plan Fails
```bash
# Symptoms: Terraform validation or plan errors
# Common Causes & Solutions:

1. Provider Authentication
   Error: "your API TokenID username should contain a !"
   Solution: Verify PROXMOX_PASSWORD in config/.env
   
2. Resource Conflicts  
   Error: "resource already exists"
   Solution: Check existing VMs in Proxmox console
   
3. Storage Issues
   Error: "storage pool not found"
   Solution: Verify proxmox_storage in config/cluster.yaml
```

#### Problem: Talos Bootstrap Fails
```bash
# Symptoms: Nodes not joining cluster
# Diagnostic Commands:
talosctl -n <node-ip> version
talosctl -n <node-ip> dmesg
talosctl -n <node-ip> logs --follow

# Common Solutions:
1. Network connectivity: ping test between nodes
2. Time synchronization: check NTP status
3. Certificate issues: regenerate talos configs
```

#### Problem: Ansible Playbook Errors
```bash
# Symptoms: Playbook execution failures
# Common Issues:

1. Missing Dependencies
   Solution: pip install -r requirements.txt
   
2. Configuration File Issues
   Solution: Validate YAML syntax
   yamllint config/cluster.yaml
   
3. Template Rendering Errors
   Solution: Check Jinja2 syntax in playbooks/templates/
```

### Operational Issues

#### Problem: Pod CrashLoopBackOff
```bash
# Diagnosis
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace> --previous

# Common Solutions:
1. Resource limits: increase memory/CPU requests
2. Image pull issues: check container registry access
3. Configuration errors: verify ConfigMaps and Secrets
```

#### Problem: Node NotReady
```bash
# Diagnosis
kubectl describe node <node-name>
talosctl -n <node-ip> dmesg | tail -100

# Solutions:
1. Restart kubelet: talosctl -n <node-ip> restart kubelet
2. Disk space: check /var/lib/containerd usage
3. Network issues: verify CNI plugin status
```

#### Problem: Persistent Volume Issues
```bash
# Diagnosis
kubectl get pv,pvc -A
kubectl describe pv <pv-name>

# Solutions:
1. Storage class issues: check default storage class
2. Node affinity: verify PV node selectors
3. Mount issues: check node filesystem health
```

---

## 🔄 Backup and Recovery

### Cluster Backup Procedures

#### 1. Talos Configuration Backup
```bash
# Create backup directory
mkdir -p backups/$(date +%Y-%m-%d)

# Backup Talos configs
cp -r /tmp/infraflux-*/talos/ backups/$(date +%Y-%m-%d)/
chmod 600 backups/$(date +%Y-%m-%d)/talos/*

# Backup cluster configuration
cp config/cluster.yaml backups/$(date +%Y-%m-%d)/
```

#### 2. Etcd Backup
```bash
# Connect to control plane
talosctl -n <control-plane-ip> etcd snapshot save backup.db

# Verify backup
talosctl -n <control-plane-ip> etcd snapshot status backup.db
```

#### 3. Application Data Backup
```bash
# For each namespace with persistent data
kubectl get pvc -n <namespace>

# Use velero or manual backup scripts
velero backup create cluster-backup-$(date +%Y%m%d)
```

### Disaster Recovery Procedures

#### Complete Cluster Recovery
```bash
# 1. Deploy new infrastructure
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=infrastructure

# 2. Restore etcd from backup
talosctl -n <new-control-plane-ip> bootstrap --recover-from=backup.db

# 3. Restore application data
velero restore create --from-backup cluster-backup-<date>

# 4. Verify cluster health
kubectl get nodes
kubectl get pods -A
```

#### Single Node Recovery
```bash
# For worker node replacement
1. Remove failed node: kubectl delete node <node-name>
2. Deploy replacement VM via Terraform
3. Bootstrap new node with existing talos config
4. Verify node joins cluster: kubectl get nodes
```

---

## 📊 Monitoring and Alerting

### Health Monitoring Commands

#### Cluster Health
```bash
# Overall cluster status
kubectl cluster-info
kubectl get componentstatuses

# Resource utilization
kubectl top nodes
kubectl describe nodes | grep -A 5 "Allocated resources"

# Network connectivity
kubectl exec -it <pod-name> -- nc -zv <service> <port>
```

#### Application Health
```bash
# Service endpoints
kubectl get endpoints -A

# Ingress status
kubectl get ingress -A
kubectl describe ingress <ingress-name> -n <namespace>

# Certificate status (if using cert-manager)
kubectl get certificates -A
kubectl describe certificate <cert-name> -n <namespace>
```

### Log Analysis
```bash
# System logs
talosctl -n <node-ip> dmesg
talosctl -n <node-ip> logs --follow

# Application logs
kubectl logs -f deployment/<app-name> -n <namespace>
kubectl logs --previous <pod-name> -n <namespace>

# Cluster events
kubectl get events --sort-by=.metadata.creationTimestamp -A
```

---

## 🚀 Upgrade Procedures

### Talos OS Upgrade
```bash
# 1. Check current version
talosctl -n <control-plane-ip> version

# 2. Upgrade control plane first
talosctl -n <control-plane-ip> upgrade \
  --image ghcr.io/siderolabs/installer:v1.10.1

# 3. Upgrade workers one by one
for node in <worker-ips>; do
  talosctl -n $node upgrade \
    --image ghcr.io/siderolabs/installer:v1.10.1
  sleep 300  # Wait for node to be ready
done

# 4. Verify upgrade
kubectl get nodes -o wide
```

### Kubernetes Upgrade
```bash
# 1. Update cluster configuration
# Edit config/cluster.yaml: kubernetes_version: "v1.31.1"

# 2. Apply configuration update
talosctl -n <control-plane-ip> upgrade-k8s --to v1.31.1

# 3. Verify upgrade
kubectl version
kubectl get nodes
```

### Application Updates
```bash
# For Flux-managed applications
flux reconcile kustomization apps
flux get kustomizations

# For manual deployments
kubectl set image deployment/<app-name> \
  <container-name>=<new-image> -n <namespace>
kubectl rollout status deployment/<app-name> -n <namespace>
```

---

## 🔒 Security Operations

### Security Scanning
```bash
# Node security scan
talosctl -n <node-ip> list /etc/kubernetes/
talosctl -n <node-ip> read /etc/kubernetes/kubelet.yaml

# Container security
kubectl run --rm -it security-scan --image=aquasec/trivy:latest \
  --restart=Never -- image <image-name>

# Network policy verification
kubectl get networkpolicies -A
kubectl describe networkpolicy <policy-name> -n <namespace>
```

### Certificate Management
```bash
# Check certificate expiration
kubectl get secrets -A | grep tls
openssl x509 -in <cert-file> -text -noout | grep "Not After"

# Rotate certificates (if needed)
talosctl -n <control-plane-ip> gen config <cluster-name> <endpoint> \
  --force --output-dir /tmp/new-certs/
```

### Access Control
```bash
# Review RBAC permissions
kubectl get clusterrolebindings
kubectl describe clusterrolebinding cluster-admin

# Service account audit
kubectl get serviceaccounts -A
kubectl get secrets -A | grep service-account-token
```

---

## 🚨 Emergency Procedures

### Cluster Unresponsive
```bash
# 1. Check control plane nodes
for node in <control-plane-ips>; do
  ping -c 3 $node
  talosctl -n $node version
done

# 2. Emergency node restart
talosctl -n <node-ip> reboot

# 3. Emergency cluster reset (DESTRUCTIVE)
talosctl -n <control-plane-ip> reset --graceful=false
# Only use if cluster is completely corrupted
```

### Storage Emergency
```bash
# 1. Check disk usage on nodes
talosctl -n <node-ip> df

# 2. Emergency cleanup
kubectl delete pods --field-selector=status.phase=Succeeded -A
kubectl delete pods --field-selector=status.phase=Failed -A

# 3. Evacuate node if critical
kubectl drain <node-name> --ignore-daemonsets --force
```

### Network Emergency
```bash
# 1. Check CNI status
kubectl get pods -n kube-system | grep cilium
kubectl logs -n kube-system -l k8s-app=cilium

# 2. Restart network components
kubectl delete pods -n kube-system -l k8s-app=cilium

# 3. Network policy emergency disable
kubectl delete networkpolicies --all -A
```

---

## 📞 Support Contacts and Escalation

### Internal Team
- **Infrastructure Team**: `infrastructure@company.com`
- **Security Team**: `security@company.com`  
- **DevOps Oncall**: `oncall@company.com`

### External Support
- **Talos Linux**: https://github.com/siderolabs/talos/issues
- **Cilium Support**: https://github.com/cilium/cilium/issues
- **Proxmox Forum**: https://forum.proxmox.com/

### Documentation Resources
- **Talos Documentation**: https://www.talos.dev/docs/
- **Kubernetes Documentation**: https://kubernetes.io/docs/
- **InfraFlux Repository**: Local `docs/` directory

---

This operations guide should be reviewed and updated quarterly to reflect changes in the infrastructure and operational procedures.