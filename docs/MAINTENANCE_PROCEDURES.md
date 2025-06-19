# InfraFlux v2.0 - Maintenance Procedures

**Purpose**: Scheduled maintenance and lifecycle management procedures  
**Version**: 2.0.0  
**Date**: 2025-06-19

---

## 🗓️ Maintenance Schedule

### Daily (Automated)
- ✅ Health checks via monitoring
- ✅ Log rotation and cleanup  
- ✅ Certificate validity checks
- ✅ Resource usage monitoring

### Weekly (Manual - 30 minutes)
- 🔄 Security updates check
- 🔄 Backup verification
- 🔄 Performance review
- 🔄 Capacity planning review

### Monthly (Planned Downtime - 2 hours)
- 🔧 OS and security patches
- 🔧 Component version updates
- 🔧 Configuration optimization
- 🔧 Disaster recovery testing

### Quarterly (Planned Downtime - 4 hours)
- 🚀 Major version upgrades
- 🚀 Infrastructure scaling
- 🚀 Security audit and hardening
- 🚀 Performance optimization

---

## 📅 Weekly Maintenance Procedures

### Monday: System Health Review
```bash
# 1. Generate health report
kubectl get nodes -o wide
kubectl get pods -A | grep -v Running
kubectl top nodes
kubectl top pods -A --sort-by=memory | head -20

# 2. Review system events
kubectl get events --sort-by=.metadata.creationTimestamp -A | tail -50

# 3. Check resource usage trends
kubectl describe nodes | grep -A 10 "Allocated resources"

# 4. Verify backup systems
ls -la backups/
kubectl get volumesnapshots -A
```

### Tuesday: Security and Updates Check
```bash
# 1. Check for Talos updates
talosctl -n <control-plane-ip> version
curl -s https://api.github.com/repos/siderolabs/talos/releases/latest | grep tag_name

# 2. Check for Kubernetes updates  
kubectl version
curl -s https://api.github.com/repos/kubernetes/kubernetes/releases/latest | grep tag_name

# 3. Review security policies
kubectl get networkpolicies -A
kubectl get psp -A  # If using Pod Security Policies

# 4. Scan for vulnerabilities (if tools available)
# trivy image scan or similar
```

### Wednesday: Performance and Capacity Review
```bash
# 1. Resource utilization analysis
kubectl top nodes
kubectl describe nodes | grep -A 5 "Capacity:\|Allocatable:"

# 2. Storage capacity check
kubectl get pv
df -h  # On each node via talosctl

# 3. Network performance check
# Run network performance tests between nodes
kubectl exec -it <pod-name> -- iperf3 -c <target-pod-ip>

# 4. Application performance review
# Check application-specific metrics
kubectl logs <performance-monitoring-pod>
```

### Thursday: Configuration and Documentation Review
```bash
# 1. Review configuration drift
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=config \
  --check

# 2. Update documentation if needed
git status docs/
git log --oneline docs/ | head -10

# 3. Review automation scripts
# Check for script updates needed
# Review Ansible playbooks and templates
ls -la playbooks/

# 4. Validate backup configurations
# Test restore procedures (non-production)
```

### Friday: Weekly Cleanup and Optimization
```bash
# 1. Clean up completed jobs and pods
kubectl delete jobs --field-selector=status.successful=1 -A
kubectl delete pods --field-selector=status.phase=Succeeded -A
kubectl delete pods --field-selector=status.phase=Failed -A

# 2. Container image cleanup
talosctl -n <node-ip> system:nerdctl images prune

# 3. Log cleanup and rotation
# Verify log rotation is working
talosctl -n <node-ip> ls /var/log/

# 4. Generate weekly summary report
# Document any issues, changes, or optimizations needed
```

---

## 🔧 Monthly Maintenance Procedures

### Pre-Maintenance Checklist (1 week before)
```bash
# 1. Schedule maintenance window
# - Notify stakeholders
# - Schedule downtime (if required)
# - Prepare rollback plans

# 2. Create comprehensive backup
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=config

# Copy current working directory
cp -r /tmp/infraflux-* backups/monthly-$(date +%Y-%m)/

# 3. Document current state
kubectl get all -A > backups/monthly-$(date +%Y-%m)/cluster-state.yaml
kubectl get nodes -o yaml > backups/monthly-$(date +%Y-%m)/nodes.yaml

# 4. Test rollback procedures
# Verify backup restoration process in test environment
```

### Maintenance Day Procedures

#### Phase 1: System Updates (30 minutes)
```bash
# 1. Update Talos if available
NEW_VERSION="v1.10.1"  # Check latest version
talosctl -n <control-plane-ip> upgrade --image ghcr.io/siderolabs/installer:$NEW_VERSION

# Wait for upgrade completion
kubectl get nodes -o wide

# 2. Update worker nodes sequentially
for worker in <worker-ips>; do
  echo "Upgrading $worker..."
  talosctl -n $worker upgrade --image ghcr.io/siderolabs/installer:$NEW_VERSION
  # Wait for node to be ready
  while ! kubectl get node $worker | grep -q Ready; do
    sleep 30
  done
done
```

#### Phase 2: Kubernetes Updates (45 minutes)
```bash
# 1. Check available Kubernetes versions
talosctl -n <control-plane-ip> list /etc/kubernetes/

# 2. Update Kubernetes version
NEW_K8S_VERSION="v1.31.1"  # Check latest stable
talosctl -n <control-plane-ip> upgrade-k8s --to $NEW_K8S_VERSION

# 3. Verify upgrade success
kubectl version
kubectl get nodes
kubectl get pods -A | grep -v Running
```

#### Phase 3: Application Updates (30 minutes)
```bash
# 1. Update Cilium (if available)
helm repo update
helm upgrade cilium cilium/cilium --namespace kube-system

# 2. Update monitoring stack (if using)
kubectl apply -f apps/base/monitoring/

# 3. Update any custom applications
# Review and apply application updates
flux reconcile kustomization apps
```

#### Phase 4: Configuration Optimization (15 minutes)
```bash
# 1. Apply any configuration improvements
# Update config/cluster.yaml if needed
ansible-playbook playbooks/main.yml \
  --extra-vars config_file=config/cluster.yaml \
  --extra-vars deployment_phase=config

# 2. Optimize resource allocations
# Review and adjust resource requests/limits
kubectl patch deployment <app> -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"requests":{"memory":"256Mi"}}}]}}}}'

# 3. Update security policies if needed
kubectl apply -f security/network-policies/
```

---

## 🔄 Quarterly Maintenance Procedures

### Pre-Quarterly Maintenance (2 weeks before)
```bash
# 1. Comprehensive environment audit
# - Review all configurations
# - Identify deprecated features
# - Plan major upgrades
# - Test upgrade procedures in staging

# 2. Capacity planning analysis
# - Review growth trends
# - Plan infrastructure scaling
# - Evaluate cost optimization opportunities

# 3. Security hardening review
# - Update security baselines
# - Review access controls
# - Plan security improvements
```

### Quarterly Maintenance Day

#### Major Version Upgrades (2 hours)
```bash
# 1. Major Talos upgrade (if available)
# Follow Talos upgrade documentation for major versions
# May require node recreation

# 2. Major Kubernetes upgrade  
# Follow Kubernetes upgrade path (e.g., 1.30 -> 1.31)
# Update all manifests for API changes

# 3. Infrastructure scaling
# Add nodes if capacity planning indicates need
# Update Terraform configuration
terraform plan
terraform apply
```

#### Infrastructure Optimization (1 hour)
```bash
# 1. Resource right-sizing
# Based on quarterly usage analysis
kubectl patch deployment <app> --type='merge' -p='{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"200m","memory":"512Mi"},"limits":{"cpu":"500m","memory":"1Gi"}}}]}}}}'

# 2. Storage optimization
# Clean up unused PVs
kubectl get pv | grep Available
kubectl delete pv <unused-pv>

# 3. Network optimization
# Review and optimize network policies
# Update CNI configuration if needed
```

#### Security Hardening (1 hour)
```bash
# 1. Update security policies
kubectl apply -f security/rbac/
kubectl apply -f security/network-policies/
kubectl apply -f security/pod-security-policies/

# 2. Certificate rotation
# Rotate long-lived certificates
talosctl gen config <cluster-name> <endpoint> --force

# 3. Security baseline validation
# Run security scans
# Update security documentation
```

---

## 🗃️ Backup and Archive Procedures

### Daily Automated Backups
```bash
#!/bin/bash
# /usr/local/bin/daily-backup.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/daily/$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup etcd
talosctl -n <control-plane-ip> etcd snapshot save $BACKUP_DIR/etcd-backup.db

# Backup configurations
cp -r config/ $BACKUP_DIR/
cp -r /tmp/infraflux-*/talos/ $BACKUP_DIR/ 2>/dev/null || true

# Backup cluster state
kubectl get all -A --export -o yaml > $BACKUP_DIR/cluster-resources.yaml
kubectl get secrets -A --export -o yaml > $BACKUP_DIR/secrets.yaml

# Cleanup old backups (keep 7 days)
find /backups/daily/ -type d -mtime +7 -exec rm -rf {} \;
```

### Weekly Archive Procedures
```bash
#!/bin/bash
# /usr/local/bin/weekly-archive.sh

WEEK=$(date +%Y-W%V)
ARCHIVE_DIR="/archives/weekly/$WEEK"

# Create archive
mkdir -p $ARCHIVE_DIR

# Copy latest daily backup
cp -r /backups/daily/$(date +%Y%m%d)/* $ARCHIVE_DIR/

# Add weekly report
echo "Weekly Archive: $WEEK" > $ARCHIVE_DIR/README.md
echo "Created: $(date)" >> $ARCHIVE_DIR/README.md
kubectl get nodes >> $ARCHIVE_DIR/README.md
kubectl get pods -A >> $ARCHIVE_DIR/README.md

# Compress archive
tar -czf $ARCHIVE_DIR.tar.gz -C /archives/weekly/ $WEEK/
rm -rf $ARCHIVE_DIR

# Cleanup old archives (keep 12 weeks)
find /archives/weekly/ -name "*.tar.gz" -mtime +84 -delete
```

---

## 📊 Performance Monitoring and Optimization

### Performance Baseline Establishment
```bash
# 1. Capture baseline metrics
kubectl top nodes > performance/baseline-nodes-$(date +%Y%m).txt
kubectl top pods -A > performance/baseline-pods-$(date +%Y%m).txt

# 2. Network performance baseline
# Run network tests between all nodes
# Document results for comparison

# 3. Storage performance baseline
# Run disk I/O tests on all nodes
# Document IOPS and throughput metrics

# 4. Application performance baseline
# Document application response times
# Record resource utilization patterns
```

### Continuous Performance Optimization
```bash
# Monthly performance review script
#!/bin/bash

echo "=== Performance Review $(date) ==="

echo "Node Resource Usage:"
kubectl top nodes

echo "Top 10 Memory Consumers:"
kubectl top pods -A --sort-by=memory | head -10

echo "Top 10 CPU Consumers:"  
kubectl top pods -A --sort-by=cpu | head -10

echo "Storage Usage:"
kubectl get pv | grep Bound

echo "Network Policies Count:"
kubectl get networkpolicies -A --no-headers | wc -l

# Generate recommendations based on metrics
echo "Recommendations:"
# Add logic to suggest optimizations based on usage patterns
```

---

## 🔍 Health Check Automation

### Automated Health Monitoring Script
```bash
#!/bin/bash
# /usr/local/bin/health-check.sh

HEALTH_LOG="/var/log/cluster-health.log"
ALERT_THRESHOLD=80

echo "=== Health Check $(date) ===" >> $HEALTH_LOG

# Node health
UNHEALTHY_NODES=$(kubectl get nodes | grep -v Ready | grep -v NAME | wc -l)
if [ $UNHEALTHY_NODES -gt 0 ]; then
  echo "ALERT: $UNHEALTHY_NODES unhealthy nodes detected" >> $HEALTH_LOG
  kubectl get nodes | grep -v Ready >> $HEALTH_LOG
fi

# Pod health
FAILING_PODS=$(kubectl get pods -A | grep -v Running | grep -v Completed | grep -v NAME | wc -l)
if [ $FAILING_PODS -gt 0 ]; then
  echo "ALERT: $FAILING_PODS pods not in Running state" >> $HEALTH_LOG
  kubectl get pods -A | grep -v Running | grep -v Completed >> $HEALTH_LOG
fi

# Resource usage
CPU_USAGE=$(kubectl top nodes --no-headers | awk '{sum+=$3} END {print sum/NR}' | cut -d'%' -f1)
if [ $(echo "$CPU_USAGE > $ALERT_THRESHOLD" | bc) -eq 1 ]; then
  echo "ALERT: High CPU usage: $CPU_USAGE%" >> $HEALTH_LOG
fi

MEMORY_USAGE=$(kubectl top nodes --no-headers | awk '{sum+=$5} END {print sum/NR}' | cut -d'%' -f1)
if [ $(echo "$MEMORY_USAGE > $ALERT_THRESHOLD" | bc) -eq 1 ]; then
  echo "ALERT: High memory usage: $MEMORY_USAGE%" >> $HEALTH_LOG
fi

echo "Health check completed" >> $HEALTH_LOG
```

---

## 📞 Maintenance Communication

### Pre-Maintenance Communication Template
```
Subject: Scheduled Maintenance - [Date] [Time]

Dear Team,

Scheduled maintenance for InfraFlux cluster:
- Date: [DATE]
- Time: [START TIME] - [END TIME] 
- Expected Downtime: [DURATION]
- Impact: [DESCRIPTION]

Maintenance activities:
- System updates and security patches
- Performance optimizations
- Backup verification

Please plan accordingly and contact the infrastructure team with any concerns.

Best regards,
Infrastructure Team
```

### Post-Maintenance Report Template
```
Subject: Maintenance Completed - [Date]

Maintenance Summary:
- Completed: [DATE TIME]
- Duration: [ACTUAL DURATION]
- Downtime: [ACTUAL DOWNTIME]

Activities Completed:
✅ System updates applied
✅ Security patches installed  
✅ Performance optimizations implemented
✅ Backups verified

Current Status:
- All nodes: Healthy
- All services: Running
- Performance: [BASELINE/IMPROVED/STABLE]

Issues Encountered: [NONE/DESCRIPTION]
Next Maintenance: [DATE]

Contact the infrastructure team with any issues.

Best regards,
Infrastructure Team
```

---

This maintenance guide should be followed consistently to ensure reliable cluster operations and prevent unplanned outages.