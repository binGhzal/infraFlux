# InfraFlux v2.0 - Quick Troubleshooting Reference

**Purpose**: Fast resolution guide for common InfraFlux deployment and operational issues  
**Version**: 2.0.0  
**Date**: 2025-06-19

---

## 🚨 Emergency Quick Fixes

### Deployment Completely Stuck
```bash
# Nuclear option - complete reset
rm -rf /tmp/infraflux-*
source config/.env && ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=prerequisites
```

### Cluster Unresponsive
```bash
# Emergency cluster access
talosctl -n <any-control-plane-ip> health
kubectl get nodes --kubeconfig=<backup-kubeconfig>
```

### Out of Disk Space
```bash
# Emergency cleanup
kubectl delete pods --field-selector=status.phase=Succeeded -A
kubectl delete pods --field-selector=status.phase=Failed -A
```

---

## 🔍 Quick Diagnostics

### Health Check One-Liner
```bash
kubectl get nodes && kubectl get pods -A | grep -v Running && echo "=== ISSUES ABOVE ==="
```

### Resource Usage Check
```bash
kubectl top nodes && kubectl top pods -A --sort-by=memory | head -20
```

### Network Connectivity Test
```bash
kubectl run netshoot --rm -it --image nicolaka/netshoot -- /bin/bash
# Inside container: nslookup kubernetes.default.svc.cluster.local
```

---

## ⚡ Common Issues & 30-Second Fixes

### Issue: "Ansible playbook fails with config file not found"
**Symptoms**: `file not found` error when running ansible-playbook  
**Fix**: Use absolute path to config file
```bash
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=/full/path/to/config/cluster.yaml \
  --extra-vars deployment_phase=all
```

### Issue: "Terraform provider authentication error" 
**Symptoms**: `API TokenID username should contain a !`  
**Fix**: Check environment variables are loaded
```bash
# Verify secrets are loaded
source config/.env
echo $PROXMOX_PASSWORD  # Should not be empty
```

### Issue: "Talos secrets generation fails"
**Symptoms**: `talosctl gen secrets` command fails  
**Fix**: Check talosctl installation and permissions
```bash
which talosctl  # Should return path
talosctl version  # Should return version info
```

### Issue: "Generated configs are empty"
**Symptoms**: Template rendering produces empty files  
**Fix**: Check Jinja2 variable references
```bash
# Verify config file structure
yamllint config/cluster.yaml
# Check template syntax manually
```

### Issue: "VM creation fails in Proxmox"
**Symptoms**: Terraform apply fails with VM creation errors  
**Fix**: Verify Proxmox settings and storage
```bash
# Check storage exists in Proxmox
# Verify VM template/ISO is available
# Ensure sufficient resources
```

### Issue: "Nodes not joining cluster"
**Symptoms**: Kubernetes nodes show NotReady status  
**Fix**: Check Talos bootstrap process
```bash
talosctl -n <node-ip> version
talosctl -n <node-ip> logs --follow
# Look for bootstrap errors
```

### Issue: "Pod stuck in Pending state"
**Symptoms**: Pods won't schedule on any node  
**Fix**: Check resource constraints and node taints
```bash
kubectl describe pod <pod-name>
kubectl get nodes -o wide
kubectl describe node <node-name> | grep Taints
```

### Issue: "Service not accessible"
**Symptoms**: Cannot reach application via service or ingress  
**Fix**: Check service endpoints and network policies
```bash
kubectl get endpoints <service-name>
kubectl get svc <service-name>
kubectl describe ingress <ingress-name>
```

### Issue: "Certificate errors"
**Symptoms**: TLS certificate validation failures  
**Fix**: Check certificate status and regenerate if needed
```bash
kubectl get certificates -A
kubectl describe certificate <cert-name>
# If using Talos: talosctl gen config --force
```

### Issue: "Storage mount failures"
**Symptoms**: Pods fail to mount persistent volumes  
**Fix**: Check storage class and PV status
```bash
kubectl get storageclass
kubectl get pv,pvc -A
kubectl describe pv <pv-name>
```

---

## 🔧 Component-Specific Fixes

### Talos Issues

#### Node Won't Bootstrap
```bash
# Check network connectivity
ping <control-plane-ip>

# Verify talos config
talosctl validate --config talosconfig

# Reset and re-bootstrap
talosctl -n <node-ip> reset --graceful=true
talosctl -n <node-ip> apply-config --insecure --nodes <node-ip> controlplane.yaml
```

#### Clock Sync Issues  
```bash
talosctl -n <node-ip> time
# If time is wrong: check NTP configuration
```

### Kubernetes Issues

#### kubelet Not Running
```bash
talosctl -n <node-ip> service kubelet status
talosctl -n <node-ip> service kubelet restart
```

#### CNI Plugin Problems
```bash
kubectl get pods -n kube-system | grep cilium
kubectl logs -n kube-system -l k8s-app=cilium
kubectl delete pods -n kube-system -l k8s-app=cilium  # Force restart
```

#### DNS Resolution Fails
```bash
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system -l k8s-app=kube-dns
```

### Ansible Issues

#### Template Rendering Errors
```bash
# Check variable definitions in config
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=config \
  --syntax-check
```

#### Task Execution Failures
```bash
# Run with maximum verbosity
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=all \
  -vvvv
```

---

## 📊 Performance Issues

### High Memory Usage
```bash
# Identify memory hogs
kubectl top pods -A --sort-by=memory | head -10

# Check node memory
kubectl describe nodes | grep -A 5 "Allocated resources"

# Emergency memory reclaim
kubectl delete pods --field-selector=status.phase=Succeeded -A
```

### High CPU Usage
```bash
# Identify CPU intensive pods
kubectl top pods -A --sort-by=cpu | head -10

# Check node CPU
talosctl -n <node-ip> processes

# Limit CPU for runaway processes
kubectl patch deployment <deployment-name> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container-name>","resources":{"limits":{"cpu":"500m"}}}]}}}}'
```

### Disk Space Issues
```bash
# Check disk usage per node
talosctl -n <node-ip> df

# Clean up old container images
talosctl -n <node-ip> system:nerdctl images prune

# Emergency pod cleanup
kubectl delete pods --field-selector=status.phase=Failed -A
kubectl delete pods --field-selector=status.phase=Succeeded -A
```

---

## 🌐 Network Troubleshooting

### Pod-to-Pod Communication Fails
```bash
# Test from pod
kubectl exec -it <pod-name> -- nc -zv <target-pod-ip> <port>

# Check network policies  
kubectl get networkpolicies -A
kubectl describe networkpolicy <policy-name>

# Bypass network policies (emergency)
kubectl delete networkpolicies --all -A
```

### Service Discovery Issues
```bash
# Test DNS resolution
kubectl exec -it <pod-name> -- nslookup <service-name>.<namespace>.svc.cluster.local

# Check kube-proxy
kubectl get pods -n kube-system | grep kube-proxy
kubectl logs -n kube-system <kube-proxy-pod>
```

### Ingress Not Working
```bash
# Check ingress controller
kubectl get pods -n ingress-nginx  # or your ingress namespace
kubectl describe ingress <ingress-name>

# Test direct service access
kubectl port-forward svc/<service-name> 8080:80
```

---

## 🔄 Recovery Procedures

### Lost Access to Cluster
```bash
# Regenerate kubeconfig
talosctl -n <control-plane-ip> kubeconfig
export KUBECONFIG=./kubeconfig

# Alternative: use backup kubeconfig
cp /tmp/infraflux-*/talos/kubeconfig ~/.kube/config
```

### Corrupted etcd
```bash
# Check etcd health
talosctl -n <control-plane-ip> etcd member list

# Restore from backup (if available)
talosctl -n <control-plane-ip> bootstrap --recover-from=backup.db
```

### Complete Node Failure
```bash
# Remove failed node
kubectl delete node <node-name>

# Deploy replacement
# Update terraform count or recreate VM
terraform apply

# Re-bootstrap replacement node
talosctl -n <new-node-ip> apply-config --insecure --nodes <new-node-ip> worker.yaml
```

---

## 📞 When to Escalate

### Escalate Immediately If:
- **Data Loss Risk**: Persistent volumes corrupted or inaccessible
- **Security Breach**: Unauthorized access detected  
- **Complete Outage**: All control plane nodes down
- **Resource Exhaustion**: Nodes running out of critical resources

### Escalate Within 1 Hour If:
- **Performance Degradation**: Response times > 5x normal
- **Partial Outage**: Some services unavailable
- **Backup Failures**: Regular backups failing
- **Certificate Expiration**: Critical certificates expiring soon

### Can Handle Locally:
- **Individual Pod Failures**: Single application pods failing
- **Minor Resource Issues**: Temporary resource constraints
- **Configuration Updates**: Routine configuration changes
- **Log Analysis**: Investigating logs for issues

---

## 📝 Documentation After Resolution

### Always Document:
1. **What Happened**: Brief description of the issue
2. **Root Cause**: What caused the problem  
3. **Resolution**: Exact steps taken to fix it
4. **Prevention**: How to prevent recurrence

### Log Template:
```
Date: YYYY-MM-DD
Issue: [Brief description]
Impact: [Affected services/users]
Root Cause: [Technical cause]
Resolution: [Steps taken]
Prevention: [Preventive measures]
Time to Resolution: [Duration]
```

---

This reference should be printed and kept accessible during operations. Update it based on new issues encountered in production.