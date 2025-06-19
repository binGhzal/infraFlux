# InfraFlux v2.0: Talos Linux Architecture Plan

> **Phase 1 - Critical Priority**: Core infrastructure foundation using Talos Linux immutable OS

---

## 🎯 **Strategic Overview**

This document defines the complete Talos Linux infrastructure architecture for InfraFlux v2.0, replacing the complex Ubuntu + K3s approach with a streamlined, immutable, API-driven foundation that eliminates configuration drift and operational complexity.

### **Core Architectural Decisions**

1. **Talos Linux Foundation**: Immutable OS designed specifically for Kubernetes
2. **API-Only Operations**: Zero SSH access, all management via `talosctl`
3. **Declarative Configuration**: Everything defined in YAML, version controlled
4. **GitOps Integration**: Talos configurations managed through Git workflows
5. **Zero-Touch Operations**: Fully automated cluster lifecycle management

---

## 📋 **Implementation Tasks Overview**

**Total Tasks**: 24 (8 per major component)
**Priority**: Critical (Phase 1)
**Timeline**: Week 1-2
**Dependencies**: None (Foundation layer)

---

## 🏗️ **Component 1: Talos Configuration System**

### **1.1 Talos Machine Configuration Templates** (Task 1-2)

#### **Task 1.1.1: Control Plane Configuration Template**
- **Priority**: Critical
- **Dependencies**: None
- **Deliverable**: `templates/talos/controlplane.yaml.j2`
- **Description**: Create Jinja2 template for Talos control plane node configuration
- **Validation**: Template generates valid Talos machine config
- **Implementation**:
  ```yaml
  # templates/talos/controlplane.yaml.j2
  version: v1alpha1
  debug: false
  persist: true
  machine:
    type: controlplane
    token: {{ cluster.token }}
    ca:
      crt: {{ cluster.ca.crt }}
      key: {{ cluster.ca.key }}
    certSANs:
      - {{ cluster.endpoint }}
      {% for ip in control_plane_ips %}
      - {{ ip }}
      {% endfor %}
    kubelet:
      image: ghcr.io/siderolabs/kubelet:{{ kubernetes.version }}
      extraArgs:
        rotate-server-certificates: true
    network:
      hostname: {{ node.hostname }}
      interfaces:
        - interface: eth0
          dhcp: false
          addresses:
            - {{ node.ip }}/{{ network.cidr_suffix }}
          routes:
            - network: 0.0.0.0/0
              gateway: {{ network.gateway }}
  cluster:
    id: {{ cluster.id }}
    secret: {{ cluster.secret }}
    controlPlane:
      endpoint: {{ cluster.endpoint }}
    clusterName: {{ cluster.name }}
    network:
      dnsDomain: {{ cluster.domain }}
      podSubnets:
        {% for subnet in network.pod_subnets %}
        - {{ subnet }}
        {% endfor %}
      serviceSubnets:
        {% for subnet in network.service_subnets %}
        - {{ subnet }}
        {% endfor %}
      cni:
        name: none  # We'll install Cilium via GitOps
    proxy:
      disabled: true  # Cilium will handle this
    discovery:
      enabled: true
      registries:
        kubernetes:
          disabled: false
        service:
          disabled: false
  ```

#### **Task 1.1.2: Worker Node Configuration Template**
- **Priority**: Critical
- **Dependencies**: Task 1.1.1
- **Deliverable**: `templates/talos/worker.yaml.j2`
- **Description**: Create Jinja2 template for Talos worker node configuration
- **Validation**: Template generates valid worker config compatible with control plane

### **1.2 Cluster-Wide Configuration Management** (Task 3-4)

#### **Task 1.2.1: Cluster Configuration Schema**
- **Priority**: Critical
- **Dependencies**: Task 1.1.1, 1.1.2
- **Deliverable**: `templates/talos/cluster-config.yaml.j2`
- **Description**: Define cluster-wide settings template including networking, storage, and security
- **Validation**: Schema validates against Talos requirements and Kubernetes best practices

#### **Task 1.2.2: Machine Configuration Generation Engine**
- **Priority**: Critical
- **Dependencies**: Task 1.2.1
- **Deliverable**: `scripts/generate-talos-configs.py`
- **Description**: Python script to generate all machine configurations from master config
- **Validation**: Generated configs pass `talosctl validate` checks

### **1.3 Network and Storage Configuration** (Task 5-6)

#### **Task 1.3.1: Advanced Network Configuration**
- **Priority**: High
- **Dependencies**: Task 1.2.1
- **Deliverable**: Network configuration templates with VLAN, bonding, static routes
- **Description**: Support for complex networking scenarios including VLANs and multiple interfaces
- **Validation**: Network connectivity validated across all scenarios

#### **Task 1.3.2: Storage Configuration Templates**
- **Priority**: High
- **Dependencies**: Task 1.3.1
- **Deliverable**: Storage configuration for local storage, CSI drivers, and distributed storage
- **Description**: Configure Talos for various storage backends including local-path and Longhorn
- **Validation**: Storage provisioning works across all configured backends

### **1.4 Extension and Customization Support** (Task 7-8)

#### **Task 1.4.1: Talos System Extensions**
- **Priority**: Medium
- **Dependencies**: Task 1.2.2
- **Deliverable**: Extension management for GPU drivers, hardware-specific components
- **Description**: Template system for managing Talos system extensions
- **Validation**: Extensions install correctly and function as expected

#### **Task 1.4.2: Custom Machine Configuration Patches**
- **Priority**: Medium
- **Dependencies**: Task 1.4.1
- **Deliverable**: Patch system for environment-specific machine config modifications
- **Description**: Allow environment-specific overrides without modifying base templates
- **Validation**: Patches apply correctly and don't break base functionality

---

## 🚀 **Component 2: VM Provisioning Automation**

### **2.1 Terraform Templates for Talos VMs** (Task 9-10)

#### **Task 2.1.1: Talos VM Terraform Module**
- **Priority**: Critical
- **Dependencies**: None
- **Deliverable**: `templates/terraform/talos-vm.tf.j2`
- **Description**: Terraform module specifically optimized for Talos Linux VMs
- **Validation**: VMs boot successfully with Talos ISO
- **Implementation**:
  ```hcl
  # templates/terraform/talos-vm.tf.j2
  resource "proxmox_vm_qemu" "talos_control_plane" {
    count = var.control_plane_count
    name = "${var.cluster_name}-cp-${count.index + 1}"
    target_node = var.proxmox_node
    
    # Talos ISO configuration
    iso = var.talos_iso_path
    boot = "order=ide2;scsi0"
    onboot = true
    
    # VM specifications optimized for Talos
    cores = var.vm_cores
    memory = var.vm_memory
    balloon = 0  # Disable ballooning for K8s
    numa = var.vm_numa
    cpu = "host"
    
    # Network configuration
    network {
      model = "virtio"
      bridge = var.network_bridge
      macaddr = var.mac_addresses[count.index]
    }
    
    # Storage configuration
    disk {
      size = var.vm_disk_size
      type = "virtio"
      storage = var.proxmox_storage
      iothread = 1
      discard = "on"
      ssd = 1
    }
    
    # Talos doesn't use cloud-init
    os_type = "other"
    agent = 1  # Enable QEMU guest agent via Talos extension
    
    # Serial console for Talos API access
    serial {
      id = 0
      type = "socket"
    }
    
    lifecycle {
      ignore_changes = [
        network,
        disk
      ]
    }
  }
  ```

#### **Task 2.1.2: Terraform Variables Template**
- **Priority**: Critical
- **Dependencies**: Task 2.1.1
- **Deliverable**: `templates/terraform/variables.tf.j2`
- **Description**: Complete variable definitions for Talos VM provisioning
- **Validation**: All variables properly typed and documented

### **2.2 Proxmox Integration Optimization** (Task 11-12)

#### **Task 2.2.1: Talos ISO Management**
- **Priority**: Critical
- **Dependencies**: Task 2.1.1
- **Deliverable**: Automated Talos ISO download and Proxmox storage upload
- **Description**: Script to download latest Talos ISO and upload to Proxmox storage
- **Validation**: ISO available in Proxmox and boots successfully

#### **Task 2.2.2: VM Resource Optimization**
- **Priority**: High
- **Dependencies**: Task 2.2.1
- **Deliverable**: Optimized VM settings for Talos and Kubernetes workloads
- **Description**: Fine-tune VM settings for maximum performance with Talos
- **Validation**: Performance benchmarks meet or exceed Ubuntu + K3s baseline

### **2.3 Network Configuration Automation** (Task 13-14)

#### **Task 2.3.1: Automated Network Setup**
- **Priority**: High
- **Dependencies**: Task 2.1.2
- **Deliverable**: Network configuration automation including VLANs, bridges, firewall
- **Description**: Complete network automation for complex networking scenarios
- **Validation**: All network configurations apply successfully

#### **Task 2.3.2: Load Balancer Configuration**
- **Priority**: Medium
- **Dependencies**: Task 2.3.1
- **Deliverable**: Optional external load balancer setup for HA control plane
- **Description**: Integrate with HAProxy/Nginx for external load balancing
- **Validation**: HA control plane accessible through load balancer

### **2.4 Storage Provisioning** (Task 15-16)

#### **Task 2.4.1: Local Storage Configuration**
- **Priority**: High
- **Dependencies**: Task 2.1.1
- **Deliverable**: Optimized local storage setup for Talos VMs
- **Description**: Configure local storage for optimal Kubernetes performance
- **Validation**: Storage performance meets requirements

#### **Task 2.4.2: Distributed Storage Preparation**
- **Priority**: Medium
- **Dependencies**: Task 2.4.1
- **Deliverable**: Prepare VMs for distributed storage solutions (Longhorn, Ceph)
- **Description**: Configure additional disks and storage networks for distributed storage
- **Validation**: Distributed storage can be successfully deployed

---

## ⚡ **Component 3: Cluster Bootstrap Process**

### **3.1 talosctl Integration and Automation** (Task 17-18)

#### **Task 3.1.1: talosctl Automation Framework**
- **Priority**: Critical
- **Dependencies**: Task 1.2.2
- **Deliverable**: `scripts/talos-cluster-manager.sh`
- **Description**: Complete automation framework for talosctl operations
- **Validation**: Can deploy cluster end-to-end without manual intervention
- **Implementation**:
  ```bash
  #!/bin/bash
  # scripts/talos-cluster-manager.sh
  
  set -euo pipefail
  
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  CONFIG_DIR="${SCRIPT_DIR}/../config"
  TALOS_CONFIG_DIR="${SCRIPT_DIR}/../_out/talos"
  
  # Colors for output
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
  
  log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
  }
  
  error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
  }
  
  success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
  }
  
  # Generate Talos machine configurations
  generate_configs() {
    log "Generating Talos machine configurations..."
    
    # Create output directory
    mkdir -p "${TALOS_CONFIG_DIR}"
    
    # Generate secrets
    if [[ ! -f "${TALOS_CONFIG_DIR}/secrets.yaml" ]]; then
      talosctl gen secrets -o "${TALOS_CONFIG_DIR}/secrets.yaml"
    fi
    
    # Generate machine configs
    python3 "${SCRIPT_DIR}/generate-talos-configs.py" \
      --config "${CONFIG_DIR}/cluster-config.yaml" \
      --secrets "${TALOS_CONFIG_DIR}/secrets.yaml" \
      --output "${TALOS_CONFIG_DIR}"
    
    success "Talos configurations generated"
  }
  
  # Apply machine configurations to nodes
  apply_configs() {
    log "Applying machine configurations to nodes..."
    
    # Apply control plane configs
    for ((i=0; i<${CONTROL_PLANE_COUNT}; i++)); do
      local ip="${CONTROL_PLANE_IPS[$i]}"
      log "Applying control plane config to ${ip}..."
      talosctl apply-config --insecure \
        --nodes "${ip}" \
        --file "${TALOS_CONFIG_DIR}/controlplane-${i}.yaml"
    done
    
    # Apply worker configs
    for ((i=0; i<${WORKER_COUNT}; i++)); do
      local ip="${WORKER_IPS[$i]}"
      log "Applying worker config to ${ip}..."
      talosctl apply-config --insecure \
        --nodes "${ip}" \
        --file "${TALOS_CONFIG_DIR}/worker-${i}.yaml"
    done
    
    success "Machine configurations applied"
  }
  
  # Bootstrap the cluster
  bootstrap_cluster() {
    log "Bootstrapping Talos cluster..."
    
    # Set talosctl configuration
    export TALOSCONFIG="${TALOS_CONFIG_DIR}/talosconfig"
    talosctl config endpoint ${CONTROL_PLANE_IPS[0]}
    talosctl config node ${CONTROL_PLANE_IPS[0]}
    
    # Bootstrap the cluster
    talosctl bootstrap
    
    # Wait for cluster to be ready
    log "Waiting for cluster to be ready..."
    talosctl health --wait-timeout=10m
    
    # Generate kubeconfig
    talosctl kubeconfig "${CONFIG_DIR}/kubeconfig"
    
    success "Cluster bootstrapped successfully"
  }
  ```

#### **Task 3.1.2: Configuration Management Integration**
- **Priority**: Critical
- **Dependencies**: Task 3.1.1
- **Deliverable**: Integration between master config and talosctl operations
- **Description**: Bridge between unified configuration and Talos-specific operations
- **Validation**: Configuration changes reflected in cluster without manual intervention

### **3.2 Multi-Node Cluster Formation** (Task 19-20)

#### **Task 3.2.1: HA Control Plane Setup**
- **Priority**: Critical
- **Dependencies**: Task 3.1.2
- **Deliverable**: Automated HA control plane configuration and validation
- **Description**: Ensure proper HA control plane setup with etcd clustering
- **Validation**: Control plane survives single node failures

#### **Task 3.2.2: Worker Node Management**
- **Priority**: High
- **Dependencies**: Task 3.2.1
- **Deliverable**: Dynamic worker node addition and removal procedures
- **Description**: Support for scaling worker nodes up and down
- **Validation**: Worker nodes can be added/removed without cluster disruption

### **3.3 Certificate Management** (Task 21-22)

#### **Task 3.3.1: PKI Infrastructure**
- **Priority**: Critical
- **Dependencies**: Task 3.1.1
- **Deliverable**: Automated PKI setup and certificate rotation
- **Description**: Secure certificate management for all cluster components
- **Validation**: Certificates auto-rotate without service interruption

#### **Task 3.3.2: Certificate Monitoring**
- **Priority**: Medium
- **Dependencies**: Task 3.3.1
- **Deliverable**: Certificate expiry monitoring and alerting
- **Description**: Monitor certificate health and alert before expiry
- **Validation**: Alerts trigger properly for certificate issues

### **3.4 Health Checking and Validation** (Task 23-24)

#### **Task 3.4.1: Cluster Health Monitoring**
- **Priority**: High
- **Dependencies**: Task 3.2.2
- **Deliverable**: Comprehensive cluster health checking system
- **Description**: Monitor all cluster components and report health status
- **Validation**: Health checks accurately reflect cluster state

#### **Task 3.4.2: Automated Recovery Procedures**
- **Priority**: Medium
- **Dependencies**: Task 3.4.1
- **Deliverable**: Automated recovery for common failure scenarios
- **Description**: Implement self-healing capabilities for cluster issues
- **Validation**: Cluster recovers automatically from simulated failures

---

## 🔧 **Technical Specifications**

### **Talos Linux Version**
- **Target Version**: v1.10.0+ (latest stable)
- **Extensions**: `qemu-guest-agent`, `util-linux-tools`
- **Custom Image**: Factory-generated with required extensions

### **Kubernetes Integration**
- **Version**: v1.31.0+ (latest stable)
- **CNI**: None (Cilium installed via GitOps)
- **CRI**: containerd (built into Talos)
- **CSI**: local-path (built-in), Longhorn (via GitOps)

### **Network Configuration**
- **Pod CIDR**: 10.244.0.0/16
- **Service CIDR**: 10.96.0.0/12
- **DNS**: CoreDNS (automatic)
- **Ingress**: Cilium Ingress Controller (via GitOps)

### **Security Features**
- **RBAC**: Enabled by default
- **PSPs**: Pod Security Standards (restricted)
- **Network Policies**: Cilium-based
- **API Access**: Certificate-based authentication only

---

## 📊 **Success Criteria**

### **Functional Requirements**
- ✅ Cluster deploys in < 10 minutes from VM creation to ready state
- ✅ All nodes join cluster automatically without manual intervention
- ✅ HA control plane functions correctly with leader election
- ✅ Worker nodes can be scaled dynamically
- ✅ Configuration changes apply through GitOps workflow

### **Performance Requirements**
- ✅ Boot time < 60 seconds for Talos nodes
- ✅ Cluster startup < 5 minutes after all nodes boot
- ✅ API response time < 100ms for basic operations
- ✅ Resource usage < 500MB RAM per control plane node

### **Security Requirements**
- ✅ Zero SSH access to any node
- ✅ All communications encrypted (TLS)
- ✅ Certificate rotation functional
- ✅ RBAC properly configured and enforced

### **Reliability Requirements**
- ✅ Cluster survives single control plane node failure
- ✅ Worker node failure doesn't affect cluster operations
- ✅ Automatic recovery from network partitions
- ✅ Configuration drift prevention working

---

## 🚀 **Next Steps**

Upon completion of this Talos Architecture implementation:

1. **Integration**: Components integrate with Configuration Management system
2. **Testing**: Comprehensive testing of all failure scenarios  
3. **Documentation**: Complete user guides and operational procedures
4. **GitOps**: Integration with Flux v2 for application deployment
5. **Security**: Implementation of zero-trust security framework

This Talos Linux foundation provides the immutable, secure, and automated infrastructure required for InfraFlux v2.0's next-generation Kubernetes platform.