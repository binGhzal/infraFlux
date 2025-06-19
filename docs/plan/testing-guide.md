# InfraFlux v2.0 Testing Guide

## Quick Start Testing

This guide provides step-by-step instructions for testing InfraFlux v2.0 on your Proxmox environment.

### Prerequisites

Before starting, ensure you have:
- Proxmox VE cluster with API access
- Adequate resources for testing (see resource requirements below)
- Network connectivity and proper DNS resolution
- Administrative access to configure testing environment

### Minimum Resource Requirements

#### For Minimal Testing (1 CP + 2 Workers)
- **CPU:** 12 cores total (4+4+4)
- **RAM:** 24GB total (8+8+8)
- **Storage:** 150GB total (50+50+50)
- **Network:** 1 bridge with internet access

#### For Standard Testing (3 CP + 3 Workers)
- **CPU:** 24 cores total
- **RAM:** 48GB total
- **Storage:** 300GB total
- **Network:** 1 bridge with internet access

## Step-by-Step Testing Process

### Step 1: Environment Preparation

1. **Run Pre-flight Check**
   ```bash
   ./scripts/pre-flight-check.sh
   ```
   
   This will validate:
   - Required tools installation
   - Configuration files
   - Ansible vault setup
   - Proxmox connectivity
   - Project structure

2. **Configure Your Environment**
   
   If pre-flight check fails, configure your environment:
   
   ```bash
   # Copy configuration templates
   cp configs/global.yaml.example configs/global.yaml
   cp ansible/inventory/hosts.yml.example ansible/inventory/hosts.yml
   
   # Set up secrets (if not already done)
   ./scripts/setup-vault.sh
   ```

3. **Edit Configuration Files**
   
   **configs/global.yaml:**
   ```yaml
   proxmox:
     api_url: "https://YOUR_PROXMOX_IP:8006"
     api_user: "root@pam"
     api_token_id: "infraflux"
   
   cluster:
     talos:
       networking:
         cluster_endpoint: "YOUR_CLUSTER_ENDPOINT"
   ```
   
   **ansible/inventory/hosts.yml:**
   ```yaml
   proxmox_servers:
     hosts:
       proxmox-1:
         ansible_host: "YOUR_PROXMOX_IP"
   
   control_plane:
     hosts:
       k8s-cp-1:
         ansible_host: "192.168.1.10"  # Adjust to your network
         vm_id: 100
         proxmox_node: "proxmox-1"
   ```

### Step 2: Run Testing Deployment

1. **Start Testing Deployment**
   ```bash
   ansible-playbook -i ansible/inventory/hosts.yml ansible/test-deploy.yml
   ```

2. **Monitor Progress**
   
   The deployment will proceed through these phases:
   - Prerequisites Validation
   - Image Preparation
   - Template Creation
   - Infrastructure Generation
   - Infrastructure Deployment
   - Deployment Validation

3. **Expected Timeline**
   - **Minimal Cluster:** 20-30 minutes
   - **Standard Cluster:** 30-45 minutes
   - **First Run:** Add 10-15 minutes for image downloads

### Step 3: Verify Deployment

1. **Check Deployment Status**
   ```bash
   # Review deployment summary
   cat testing/TEST_SUMMARY.md
   
   # Check cluster status
   export KUBECONFIG=testing/talos/kubeconfig
   kubectl get nodes
   kubectl get pods -A
   ```

2. **Validate Cluster Health**
   ```bash
   # Using talosctl
   talosctl --talosconfig testing/talos/talosconfig health
   
   # Using kubectl
   kubectl cluster-info
   kubectl get componentstatuses
   ```

3. **Test Basic Functionality**
   ```bash
   # Deploy test workload
   kubectl create deployment test-nginx --image=nginx
   kubectl expose deployment test-nginx --port=80 --type=NodePort
   
   # Check deployment
   kubectl get deployments,services
   ```

## Testing Scenarios

### Scenario 1: Minimal Deployment Test
**Purpose:** Validate basic functionality with minimal resources

**Configuration:**
- 1 Control Plane node
- 2 Worker nodes
- Local storage only
- DHCP networking

**Expected Outcome:**
- Cluster bootstraps successfully
- All nodes join and become ready
- Basic workloads can be deployed

### Scenario 2: Standard Production-like Test
**Purpose:** Test full functionality with realistic configuration

**Configuration:**
- 3 Control Plane nodes
- 3 Worker nodes
- Shared storage configuration
- Static IP networking

**Expected Outcome:**
- High availability cluster
- Proper load balancing
- Storage classes available
- Production-ready configuration

### Scenario 3: Error Recovery Test
**Purpose:** Validate error handling and recovery mechanisms

**Test Steps:**
1. Start deployment
2. Simulate network interruption
3. Restart deployment
4. Verify recovery and completion

**Expected Outcome:**
- Graceful error handling
- Successful recovery
- No resource duplication

## Troubleshooting Common Issues

### Issue: Proxmox API Connection Failed
**Symptoms:** Pre-flight check or deployment fails with API errors

**Solutions:**
1. Verify Proxmox URL in configuration
2. Check API token permissions
3. Validate network connectivity
4. Ensure certificate issues aren't blocking access

### Issue: VM Creation Fails
**Symptoms:** Terraform apply fails during VM creation

**Solutions:**
1. Check available resources in Proxmox
2. Verify storage configuration
3. Ensure VM IDs are not in use
4. Check network bridge configuration

### Issue: Talos Bootstrap Fails
**Symptoms:** VMs created but cluster doesn't form

**Solutions:**
1. Check VM network connectivity
2. Verify Talos image compatibility
3. Review cluster endpoint configuration
4. Check time synchronization

### Issue: Deployment Hangs
**Symptoms:** Deployment stalls during any phase

**Solutions:**
1. Check logs in testing/logs/
2. Verify resource availability
3. Check network connectivity
4. Review timeout configurations

## Advanced Testing

### Custom Configuration Testing

1. **Test with Custom Networking**
   ```yaml
   # In hosts.yml
   k8s-cp-1:
     ansible_host: "192.168.1.10"
     network_interface: "eth0"
     gateway: "192.168.1.1"
     dns_servers: ["8.8.8.8", "1.1.1.1"]
   ```

2. **Test with Storage Configuration**
   ```yaml
   # In hosts.yml
   k8s-worker-1:
     storage:
       type: "longhorn"
       dedicated_disks:
         - device: "/dev/sdb"
           mountpoint: "/var/lib/longhorn"
   ```

3. **Test with Node Labels and Taints**
   ```yaml
   # In hosts.yml
   k8s-worker-1:
     node_labels:
       node-type: "compute"
       storage: "ssd"
     node_taints:
       - key: "dedicated"
         value: "compute"
         effect: "NoSchedule"
   ```

### Performance Testing

1. **Measure Deployment Time**
   ```bash
   time ansible-playbook -i ansible/inventory/hosts.yml ansible/test-deploy.yml
   ```

2. **Monitor Resource Usage**
   - Watch Proxmox resource consumption
   - Monitor network traffic
   - Check storage I/O patterns

3. **Test Scale Limits**
   - Gradually increase cluster size
   - Test resource constraints
   - Validate performance degradation points

## Test Results Documentation

### Log Locations
- **Ansible Logs:** `testing/logs/`
- **Terraform State:** `testing/terraform/`
- **Talos Configs:** `testing/talos/`
- **Test Summary:** `testing/TEST_SUMMARY.md`

### Key Metrics to Track
- Total deployment time
- Resource consumption during deployment
- Error rates and recovery times
- Network traffic patterns
- Storage usage patterns

### Success Criteria
- [ ] Deployment completes without critical errors
- [ ] All nodes join the cluster successfully
- [ ] Cluster passes health checks
- [ ] Basic workloads deploy successfully
- [ ] Performance meets expectations
- [ ] Documentation accurately reflects process

## Next Steps After Testing

1. **Document Issues Found**
   - Log any bugs or unexpected behaviors
   - Note configuration challenges
   - Record performance observations

2. **Optimize Configuration**
   - Adjust timeouts based on testing
   - Optimize resource allocation
   - Refine network configuration

3. **Prepare for Production**
   - Scale up resource allocations
   - Configure high availability
   - Set up monitoring and logging

4. **Move to Phase 4**
   - GitOps integration
   - Application deployment automation
   - Continuous deployment setup

## Support and Feedback

If you encounter issues during testing:

1. **Check Logs First**
   - Review detailed logs in testing/logs/
   - Check Terraform output for infrastructure issues
   - Examine Ansible output for automation problems

2. **Document Issues**
   - Capture error messages and logs
   - Note environment specifics
   - Include steps to reproduce

3. **Common Solutions**
   - Restart deployment for transient issues
   - Check resource availability
   - Verify network connectivity
   - Validate configuration syntax

## Conclusion

This testing guide provides a comprehensive approach to validating InfraFlux v2.0 in your environment. The structured testing process ensures thorough validation while providing clear guidance for troubleshooting and optimization.

Success in this testing phase indicates readiness to proceed with Phase 4 (GitOps Integration) and production deployment planning.