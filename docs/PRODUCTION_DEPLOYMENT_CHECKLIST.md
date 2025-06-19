# InfraFlux v2.0 Production Deployment Validation Checklist

## Overview

This checklist ensures safe, reliable production deployment of InfraFlux v2.0. Each item must be verified before proceeding to the next phase. **DO NOT skip validation steps in production.**

---

## 🔍 **Phase 0: Pre-Deployment Validation**

### Infrastructure Readiness
- [ ] **Proxmox Host Accessible**
  ```bash
  ping <proxmox_host>
  curl -k https://<proxmox_host>:8006/api2/json/version
  ```
  - [ ] Network connectivity verified
  - [ ] API endpoint responding
  - [ ] SSL certificate valid (or insecure mode configured)

- [ ] **Proxmox Resources Available**
  - [ ] Sufficient CPU cores: `(control_planes × vm_cores) + (workers × vm_cores)`
  - [ ] Sufficient RAM: `(control_planes × vm_memory) + (workers × vm_memory)`
  - [ ] Sufficient storage: `(total_nodes × vm_disk_size) + 20GB buffer`
  - [ ] Network bridge exists: `vmbr0` or configured bridge

- [ ] **Talos ISO Uploaded**
  - [ ] Talos ISO present in Proxmox storage
  - [ ] ISO version matches configuration: `v1.10.0` or specified version
  - [ ] Storage has sufficient space for ISO

- [ ] **Network Configuration**
  - [ ] IP addresses available and not in use:
    ```bash
    # Test each IP
    ping -c 1 <control_plane_ip_1>  # Should timeout/fail
    ping -c 1 <control_plane_ip_2>  # Should timeout/fail
    ping -c 1 <worker_ip_1>         # Should timeout/fail
    ```
  - [ ] DNS resolution configured (if using hostnames)
  - [ ] Firewall rules allow cluster communication
  - [ ] DHCP reservations configured (if applicable)

### Configuration Validation
- [ ] **Master Configuration Valid**
  ```bash
  # Validate YAML syntax
  yq eval '.' config/cluster.yaml > /dev/null
  
  # Generate configurations (dry run)
  ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=config --check
  ```
  - [ ] YAML syntax correct
  - [ ] All required fields present
  - [ ] IP addresses in valid format
  - [ ] Resource specifications reasonable

- [ ] **Security Configuration Review**
  - [ ] Proxmox credentials secure (not default passwords)
  - [ ] Git repository access configured (if GitOps enabled)
  - [ ] SSH keys generated for GitOps (if applicable)
  - [ ] No sensitive data in configuration files
  - [ ] Network security policies defined

### Prerequisites Verification
- [ ] **Required Tools Installed**
  ```bash
  # Verify all tools
  command -v python3 && python3 --version
  command -v talosctl && talosctl version --client
  command -v kubectl && kubectl version --client
  command -v terraform && terraform version
  command -v yq && yq --version
  python3 -c "import yaml, jinja2; print('Python deps OK')"
  ```
  - [ ] Python 3.8+ with PyYAML and Jinja2
  - [ ] talosctl v1.7.0+
  - [ ] kubectl v1.28+
  - [ ] terraform v1.0+
  - [ ] yq v4.0+

- [ ] **Environment Setup**
  ```bash
  # Verify environment
  echo $PROXMOX_PASSWORD  # Should be set
  ls -la ~/.kube/         # Should exist
  umask                   # Should be 0022 or similar
  ```
  - [ ] `PROXMOX_PASSWORD` environment variable set
  - [ ] Sufficient disk space: `/tmp` has 5GB+ free
  - [ ] User has sudo access (for tool installation if needed)
  - [ ] Working directory has write permissions

### Backup and Rollback Preparation
- [ ] **Existing Infrastructure Backup**
  - [ ] Document existing VMs (if any) in IP range
  - [ ] Backup current Proxmox configuration
  - [ ] Note current resource utilization baseline
  - [ ] Document recovery procedures

- [ ] **Rollback Plan Ready**
  - [ ] Terraform state backup location identified
  - [ ] VM destruction procedure documented
  - [ ] Network cleanup procedures defined
  - [ ] Time allocation for rollback (minimum 30 minutes)

---

## 🚀 **Phase 1: Infrastructure Deployment Validation**

### Configuration Generation
- [ ] **Generate All Configurations**
  ```bash
  # Generate configurations
  ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=config
  
  # Verify generated files
  ls -la /tmp/infraflux-*/talos/
  ls -la /tmp/infraflux-*/terraform/
  ```
  - [ ] Talos configurations generated without errors
  - [ ] Terraform configuration generated
  - [ ] Secrets file created with proper permissions (600)
  - [ ] No sensitive data in generated files

### Terraform Infrastructure
- [ ] **Terraform Validation**
  ```bash
  cd /tmp/infraflux-*/terraform
  terraform init
  terraform validate
  terraform plan -var="proxmox_password=$PROXMOX_PASSWORD"
  ```
  - [ ] Terraform initialization successful
  - [ ] Configuration validation passed
  - [ ] Plan shows expected resources (VMs, network)
  - [ ] No errors or warnings in plan

- [ ] **Infrastructure Deployment**
  ```bash
  # Apply with monitoring
  terraform apply -var="proxmox_password=$PROXMOX_PASSWORD" -auto-approve
  ```
  - [ ] All VMs created successfully
  - [ ] Network configuration applied
  - [ ] Storage allocation completed
  - [ ] No errors in terraform output

### VM Verification
- [ ] **VM Status Check**
  - [ ] All VMs visible in Proxmox interface
  - [ ] VMs boot from Talos ISO
  - [ ] Network interfaces configured
  - [ ] Console access available
  - [ ] Resource allocation matches configuration

- [ ] **Network Connectivity**
  ```bash
  # Test connectivity to each VM
  ping -c 3 <control_plane_ip_1>
  ping -c 3 <control_plane_ip_2>
  ping -c 3 <worker_ip_1>
  ```
  - [ ] All VMs respond to ping
  - [ ] Network latency acceptable (<10ms internal)
  - [ ] No packet loss observed

---

## 🔧 **Phase 2: Talos Cluster Bootstrap Validation**

### Talos Configuration Application
- [ ] **Apply Control Plane Configurations**
  ```bash
  export TALOSCONFIG=/tmp/infraflux-*/talos/talosconfig
  
  # Apply configurations
  talosctl apply-config --insecure --nodes <cp_ip_1> --file /tmp/infraflux-*/talos/controlplane-0.yaml
  talosctl apply-config --insecure --nodes <cp_ip_2> --file /tmp/infraflux-*/talos/controlplane-1.yaml
  ```
  - [ ] All control plane configs applied without errors
  - [ ] Nodes reboot successfully
  - [ ] Talos services start properly

- [ ] **Apply Worker Configurations**
  ```bash
  # Apply worker configurations
  talosctl apply-config --insecure --nodes <worker_ip_1> --file /tmp/infraflux-*/talos/worker-0.yaml
  ```
  - [ ] All worker configs applied without errors
  - [ ] Workers reboot successfully
  - [ ] Join process initiates

### Cluster Bootstrap
- [ ] **Bootstrap Kubernetes**
  ```bash
  # Configure endpoints and bootstrap
  talosctl config endpoint <control_plane_ips>
  talosctl config node <control_plane_ip_1>
  talosctl bootstrap
  ```
  - [ ] Bootstrap command succeeds
  - [ ] etcd cluster initializes
  - [ ] Kubernetes API server starts

- [ ] **Cluster Health Verification**
  ```bash
  # Wait for cluster health
  talosctl health --wait-timeout=10m
  
  # Extract kubeconfig
  talosctl kubeconfig /tmp/infraflux-*/kubeconfig
  export KUBECONFIG=/tmp/infraflux-*/kubeconfig
  ```
  - [ ] All nodes report healthy
  - [ ] Kubeconfig extracted successfully
  - [ ] Kubernetes API accessible

### Node Verification
- [ ] **Kubernetes Node Status**
  ```bash
  kubectl get nodes -o wide
  kubectl get pods -n kube-system
  ```
  - [ ] All nodes in `Ready` state
  - [ ] Node ages appropriate (< 5 minutes)
  - [ ] System pods running correctly
  - [ ] No `CrashLoopBackOff` or `Error` pods

---

## 📦 **Phase 3: Core Applications Validation**

### CNI Installation
- [ ] **Cilium Network Plugin**
  ```bash
  # Monitor Cilium installation
  kubectl apply -f https://raw.githubusercontent.com/cilium/cilium/1.16.0/install/kubernetes/quick-install.yaml
  kubectl wait --for=condition=ready pod -l k8s-app=cilium -n kube-system --timeout=300s
  ```
  - [ ] Cilium pods deployed successfully
  - [ ] All Cilium components ready
  - [ ] Network connectivity between pods verified

### Certificate Management
- [ ] **cert-manager Installation**
  ```bash
  # Install cert-manager
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
  kubectl wait --for=condition=ready pod -l app=cert-manager -n cert-manager --timeout=300s
  ```
  - [ ] cert-manager pods running
  - [ ] Webhook configured correctly
  - [ ] API resources created

### Core Services Health
- [ ] **System Components Status**
  ```bash
  kubectl get all -n kube-system
  kubectl get all -n cert-manager
  kubectl top nodes  # If metrics-server available
  ```
  - [ ] All deployments at desired replica count
  - [ ] No failing pods or services
  - [ ] Resource utilization within acceptable limits

---

## 🔄 **Phase 4: GitOps Setup Validation (If Enabled)**

### Flux Installation
- [ ] **Flux Bootstrap**
  ```bash
  # If Git repository configured
  ansible-playbook playbooks/main.yml --extra-vars config_file=config/cluster.yaml --extra-vars deployment_phase=apps
  ```
  - [ ] Flux controllers installed
  - [ ] Git repository connected
  - [ ] Initial sync completed

- [ ] **GitOps Health Check**
  ```bash
  kubectl get pods -n flux-system
  flux get all
  flux logs --all-namespaces
  ```
  - [ ] All Flux controllers running
  - [ ] No sync errors in logs
  - [ ] Git sources reconciling

---

## ✅ **Phase 5: Post-Deployment Validation**

### Security Verification
- [ ] **Security Policies**
  ```bash
  # Check security configurations
  kubectl get networkpolicies --all-namespaces
  kubectl get psp  # If pod security policies enabled
  kubectl auth can-i list secrets --as=system:anonymous
  ```
  - [ ] Network policies applied (if enabled)
  - [ ] RBAC rules enforced
  - [ ] Anonymous access restricted
  - [ ] Pod security standards active

### Performance Baseline
- [ ] **Resource Utilization**
  ```bash
  kubectl top nodes
  kubectl top pods --all-namespaces
  ```
  - [ ] CPU utilization < 50% on nodes
  - [ ] Memory utilization < 80% on nodes
  - [ ] No resource contention observed

### Functional Testing
- [ ] **Basic Cluster Operations**
  ```bash
  # Test pod deployment
  kubectl run test-pod --image=nginx --rm -it --restart=Never -- curl -Is google.com
  
  # Test DNS resolution
  kubectl run test-dns --image=busybox --rm -it --restart=Never -- nslookup kubernetes
  ```
  - [ ] Pod deployment succeeds
  - [ ] Network connectivity from pods
  - [ ] DNS resolution working
  - [ ] Service discovery functional

### Documentation Update
- [ ] **Deployment Documentation**
  - [ ] Record actual deployment time
  - [ ] Document any deviations from standard config
  - [ ] Update cluster access credentials
  - [ ] Note any manual steps required
  - [ ] Update operational runbooks

---

## 🚨 **Rollback Procedures**

### Immediate Rollback Triggers
- [ ] **Critical Failures** (Execute rollback immediately):
  - Security vulnerability exposed
  - Data corruption detected
  - Network segmentation failure
  - Unauthorized access observed
  - Cluster stability compromised

### Rollback Execution
- [ ] **Infrastructure Rollback**
  ```bash
  # Destroy VMs via Terraform
  cd /tmp/infraflux-*/terraform
  terraform destroy -var="proxmox_password=$PROXMOX_PASSWORD" -auto-approve
  ```
  - [ ] All VMs destroyed
  - [ ] Network configuration cleaned
  - [ ] Storage freed

- [ ] **Network Cleanup**
  - [ ] IP addresses released
  - [ ] DNS entries removed (if created)
  - [ ] Firewall rules reverted

### Post-Rollback Verification
- [ ] **Environment Restored**
  - [ ] Original state confirmed
  - [ ] No residual configurations
  - [ ] Resources available for retry

---

## 📊 **Success Criteria Summary**

### Deployment Successful If:
- [ ] All infrastructure phases completed without errors
- [ ] Kubernetes cluster operational with all nodes Ready
- [ ] Core applications (CNI, cert-manager) running
- [ ] Security policies enforced
- [ ] GitOps system operational (if enabled)
- [ ] Post-deployment tests pass
- [ ] Performance within acceptable baseline
- [ ] Documentation updated

### Time Expectations:
- **Total Deployment Time**: 25-60 minutes
- **Infrastructure Phase**: 5-15 minutes
- **Cluster Bootstrap**: 10-20 minutes
- **Applications**: 5-15 minutes
- **Validation**: 5-10 minutes

### Contact Information:
- **On-Call Engineer**: [Contact Info]
- **Escalation Path**: [Management Contact]
- **Documentation**: This checklist + `/docs/QUICK_START.md`

---

**⚠️ IMPORTANT**: This checklist must be followed completely for production deployments. Skipping validation steps may result in security vulnerabilities, data loss, or system instability.

**✅ COMPLETION**: Once all items are checked, the InfraFlux v2.0 deployment is production-ready and operational.

---

*Last Updated: 2025-06-19*  
*Version: 1.0*  
*Reviewer: [Name/Role]*