# InfraFlux - Infrastructure Automation System

## Overview

InfraFlux is an Ansible-based infrastructure automation system designed to deploy and manage Kubernetes clusters on Proxmox virtual machines. The system automates the entire process from VM creation to application deployment.

## How It Works

### 1. Infrastructure Layer (Proxmox)

- **VM Creation**: Creates VMs from Ubuntu templates in Proxmox
- **Resource Allocation**: Configures CPU, memory, storage, and networking
- **Template Management**: Handles cloud-init enabled Ubuntu templates
- **Multi-Node Support**: Deploys across multiple Proxmox hosts

### 2. Operating System Layer

- **Node Preparation**: Configures Ubuntu nodes with security hardening
- **Network Setup**: Configures VLANs, bonding, and firewall rules
- **Provider Support**: Handles different hosting providers (Proxmox, CrunchBits, Hetzner)
- **Automatic Updates**: Configures unattended upgrades and security patches

### 3. Kubernetes Cluster (K3s)

- **High Availability**: Multi-master setup with HAProxy load balancing
- **CNI Network**: Cilium for advanced networking and security
- **Storage**: TopoLVM for local storage management
- **Security**: Runtime security with Tetragon and Kata containers

### 4. Application Platform

- **GitOps**: Flux for continuous deployment from Git repositories
- **Authentication**: Authentik for SSO and OIDC
- **Monitoring**: Prometheus, Grafana, and custom dashboards
- **Backup**: Automated backups with Velero and Autorestic

## Architecture Components

### Core Infrastructure

```
Proxmox Hosts
├── Template VMs (Ubuntu 24.04 LTS)
├── Controller VMs (Management)
├── Master VMs (K3s Control Plane)
└── Worker VMs (K3s Data Plane)
```

### Network Architecture

```
Public Network (Provider)
├── Load Balancer (HAProxy + Keepalived)
├── Cluster Network (VLAN)
│   ├── Control Plane (K3s API)
│   ├── Pod Network (Cilium)
│   └── Service Network (K3s Services)
└── Storage Network (TopoLVM)
```

### Software Stack

```
Application Layer
├── Custom Applications (Flux GitOps)
├── Platform Services (Authentik, Monitoring)
└── Infrastructure Services (Cilium, TopoLVM)

Kubernetes Layer (K3s)
├── Control Plane (etcd, API Server, Scheduler)
├── Data Plane (kubelet, kube-proxy)
└── CNI (Cilium)

Operating System (Ubuntu 24.04 LTS)
├── Container Runtime (containerd)
├── Security (UFW, Fail2ban, Automatic Updates)
└── Monitoring (Node Exporter, Tetragon)

Infrastructure Layer (Proxmox)
├── Compute (VMs)
├── Storage (LVM, ZFS)
└── Network (VLANs, Bridges)
```

## Deployment Workflow

### Phase 1: Infrastructure Setup

1. **Template Creation**: Creates Ubuntu cloud-init templates in Proxmox
2. **VM Deployment**: Provisions VMs from templates with Terraform
3. **Network Configuration**: Sets up VLANs and network interfaces
4. **Storage Setup**: Configures LVM volume groups for TopoLVM

### Phase 2: Node Preparation

1. **OS Hardening**: Security configurations and package updates
2. **Network Setup**: Configures cluster networking and firewall rules
3. **System Tuning**: Optimizes kernel parameters for Kubernetes
4. **Monitoring Setup**: Installs node monitoring agents

### Phase 3: Kubernetes Cluster

1. **Master Setup**: Installs K3s on control plane nodes
2. **HA Configuration**: Sets up HAProxy and Keepalived for load balancing
3. **CNI Installation**: Deploys Cilium for pod networking
4. **Cluster Validation**: Verifies cluster health and connectivity

### Phase 4: Worker Nodes

1. **Agent Installation**: Joins worker nodes to the cluster
2. **Runtime Configuration**: Sets up container runtimes (containerd, Kata)
3. **Storage Configuration**: Configures TopoLVM for local storage
4. **Workload Preparation**: Prepares nodes for application workloads

### Phase 5: Platform Services

1. **GitOps Setup**: Installs and configures Flux
2. **Authentication**: Sets up Authentik for SSO
3. **Monitoring**: Deploys Prometheus and Grafana
4. **Backup**: Configures Velero and Autorestic
5. **Security**: Sets up Tetragon for runtime security

## Environments

### CI Environment (`hosts.ci`)

- **Purpose**: Development and testing
- **Resources**: Lower resource allocation
- **Features**: Full stack for testing new features
- **Access**: Internal network only

### Production Environment (`hosts`)

- **Purpose**: Production workloads
- **Resources**: Full resource allocation
- **Features**: High availability and monitoring
- **Access**: Public and private networks

### CrunchBits Environment (`hosts.cc`)

- **Purpose**: Specific provider configuration
- **Resources**: Provider-optimized settings
- **Features**: Tailscale VPN integration
- **Access**: Public cloud provider

## Key Features

### Automation

- **Full Stack**: End-to-end automation from infrastructure to applications
- **Idempotent**: Safe to run multiple times
- **Modular**: Components can be deployed independently
- **Extensible**: Easy to add new roles and playbooks

### Security

- **Hardened OS**: Security-focused Ubuntu configuration
- **Runtime Security**: Tetragon for process and network monitoring
- **Secure Containers**: Kata containers for untrusted workloads
- **RBAC**: Kubernetes role-based access control

### High Availability

- **Multi-Master**: Multiple K3s control plane nodes
- **Load Balancing**: HAProxy with health checks
- **Failover**: Keepalived for automatic failover
- **Storage**: Replicated storage with TopoLVM

### Monitoring

- **Infrastructure**: Node and VM monitoring
- **Application**: Pod and service monitoring
- **Security**: Runtime security monitoring
- **Logs**: Centralized logging with Loki

### Backup & Recovery

- **Automated Backups**: Scheduled backups with Velero
- **Configuration Backup**: Autorestic for system configs
- **Disaster Recovery**: Full cluster restoration procedures
- **Data Protection**: Encrypted backups to external storage

## Getting Started

1. **Prepare Proxmox**: Set up Proxmox hosts with networking
2. **Configure Inventory**: Update Ansible inventory files
3. **Set Variables**: Configure group_vars for your environment
4. **Run Deployment**: Use the deploy script or Ansible directly
5. **Verify Cluster**: Check cluster health and connectivity
6. **Deploy Applications**: Use Flux to deploy your applications

## Maintenance

- **Updates**: Automated OS and application updates
- **Monitoring**: Continuous monitoring and alerting
- **Backups**: Automated backup verification
- **Scaling**: Easy addition of new nodes
- **Upgrades**: Rolling upgrades with minimal downtime
