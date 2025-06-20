# Deployment Workflow for InfraFlux v2.0

## Overview

This document defines the operational procedures and workflows for deploying and managing infrastructure using InfraFlux v2.0 with Pulumi.

## Core Deployment Command

```bash
# One-command deployment
pulumi up
```

## Workflow Phases

### Phase 1: Pre-deployment Validation

**Duration**: 2-5 minutes
**Purpose**: Ensure environment readiness and configuration validity

#### 1.1 Environment Checks

```bash
# Automated checks performed by Pulumi program
- Proxmox API connectivity
- Authentication token validity
- Resource availability (CPU, memory, storage)
- Network configuration validation
- DNS resolution checks
```

#### 1.2 Configuration Validation

```typescript
// Validation performed during Pulumi preview
- Schema validation against TypeScript types
- Resource naming conventions
- Network subnet conflicts
- Storage capacity requirements
- Security policy compliance
```

#### 1.3 Dependency Verification

```bash
# External dependency checks
- Pulumi CLI version compatibility
- Provider plugin availability
- Network connectivity to registries
- Backup storage accessibility
```

### Phase 2: Infrastructure Provisioning

**Duration**: 10-20 minutes
**Purpose**: Create and configure base infrastructure components

#### 2.1 Network Infrastructure

```bash
# Parallel execution order
1. VLAN creation and configuration
2. Bridge setup and port assignment
3. IP allocation and DHCP configuration
4. Firewall rules and security groups
5. DNS and domain configuration
```

#### 2.2 Storage Infrastructure

```bash
# Sequential execution for dependencies
1. Datastore validation and preparation
2. Volume creation and formatting
3. Backup storage configuration
4. Storage class definitions
5. Persistent volume setup
```

#### 2.3 Compute Infrastructure

```bash
# Template-based VM creation
1. VM template preparation/update
2. Cloud-init configuration generation
3. VM instance creation (parallel)
4. Network interface assignment
5. Storage attachment and configuration
```

### Phase 3: Kubernetes Cluster Bootstrap

**Duration**: 5-15 minutes
**Purpose**: Initialize and configure Talos Kubernetes cluster

#### 3.1 Talos Configuration

```bash
# Machine configuration generation
1. Generate machine configurations per node
2. Apply configuration patches
3. Create bootstrap token
4. Configure cluster networking
5. Set up kubelet parameters
```

#### 3.2 Cluster Initialization

```bash
# Sequential bootstrap process
1. Apply control plane configuration
2. Bootstrap etcd cluster
3. Start Kubernetes API server
4. Join worker nodes to cluster
5. Validate cluster connectivity
```

#### 3.3 Core Components Installation

```bash
# Essential cluster components
1. CNI plugin installation (Cilium/Calico)
2. CoreDNS configuration
3. Metrics server deployment
4. Storage CSI drivers
5. Load balancer configuration
```

### Phase 4: Application Platform Setup

**Duration**: 5-10 minutes
**Purpose**: Install and configure platform services

#### 4.1 GitOps Controller

```bash
# FluxCD installation and configuration
1. Install Flux controller components
2. Configure Git repository access
3. Set up secret management integration
4. Create initial synchronization
5. Validate GitOps workflow
```

#### 4.2 Secret Management

```bash
# Pulumi ESC integration
1. Configure ESC environment access
2. Create Kubernetes secret synchronization
3. Set up secret rotation policies
4. Test secret injection workflows
5. Validate encryption at rest
```

#### 4.3 Monitoring Stack

```bash
# Observability platform
1. Deploy Prometheus operator
2. Configure Grafana dashboards
3. Set up Loki for log aggregation
4. Install alert manager
5. Configure notification channels
```

### Phase 5: Validation and Health Checks

**Duration**: 2-5 minutes
**Purpose**: Verify deployment success and system health

#### 5.1 Infrastructure Validation

```typescript
// Automated validation checks
- VM status and connectivity
- Network reachability tests
- Storage mount verification
- Resource allocation confirmation
- Security policy enforcement
```

#### 5.2 Kubernetes Validation

```bash
# Cluster health verification
- Node ready status
- Pod scheduling functionality
- Service discovery tests
- Ingress controller validation
- Storage class functionality
```

#### 5.3 Application Platform Validation

```bash
# Platform service validation
- GitOps synchronization test
- Secret management verification
- Monitoring data collection
- Alert system functionality
- Backup system verification
```

## Operational Workflows

### Daily Operations

#### Morning Checks

```bash
# Automated health checks
pulumi refresh                    # Check for drift
kubectl get nodes                 # Verify node status
kubectl get pods --all-namespaces # Check pod health
flux get all                      # Validate GitOps sync
```

#### Resource Monitoring

```bash
# Resource utilization checks
kubectl top nodes                 # Node resource usage
kubectl top pods --all-namespaces # Pod resource usage
df -h                            # Storage utilization
free -h                          # Memory usage
```

### Weekly Maintenance

#### Security Updates

```bash
# Update workflow
pulumi preview                    # Check for updates
pulumi up                        # Apply updates if safe
kubectl drain <node>             # Graceful node drain
# Node OS updates (Talos automatic)
kubectl uncordon <node>          # Return node to service
```

#### Backup Verification

```bash
# Backup validation
velero backup get                # Check backup status
velero restore create            # Test restore process
# Database backup verification
# Configuration backup validation
```

### Monthly Operations

#### Capacity Planning

```bash
# Resource analysis
kubectl describe nodes           # Node capacity review
# Storage growth analysis
# Network utilization review
# Performance benchmarking
```

#### Security Audit

```bash
# Security validation
kube-bench run                   # CIS benchmark
kubehunter                       # Security scanning
# Certificate expiration check
# Access log review
```

## Emergency Procedures

### Disaster Recovery

```bash
# Complete cluster rebuild
1. Backup current state
   pulumi stack export > backup.json

2. Destroy existing infrastructure
   pulumi destroy --yes

3. Restore from backup
   pulumi stack import < backup.json
   pulumi up

4. Restore application data
   velero restore create --from-backup <backup-name>
```

### Rollback Procedures

```bash
# Infrastructure rollback
pulumi stack select <previous-stack>
pulumi up                        # Restore previous state

# Application rollback
flux suspend source git <source>
kubectl apply -f previous-config.yaml
flux resume source git <source>
```

### Performance Optimization

#### Resource Scaling

```bash
# Horizontal scaling
kubectl scale deployment <app> --replicas=<count>

# Vertical scaling (requires restart)
kubectl patch deployment <app> -p '{"spec":{"template":{"spec":{"containers":[{"name":"<container>","resources":{"requests":{"cpu":"<cpu>","memory":"<memory>"}}}]}}}}'

# Cluster scaling
pulumi config set node-count <new-count>
pulumi up
```

#### Network Optimization

```bash
# Network performance tuning
# MTU optimization
# Load balancer configuration
# Traffic shaping policies
```

## Troubleshooting Workflows

### Infrastructure Issues

```bash
# Proxmox connectivity
curl -k https://<proxmox-host>:8006/api2/json/version

# VM status investigation
qm status <vmid>
qm config <vmid>

# Network troubleshooting
ping <target-ip>
traceroute <target-ip>
nmap -p <port> <target-ip>
```

### Kubernetes Issues

```bash
# Cluster debugging
kubectl cluster-info dump
kubectl get events --sort-by=.metadata.creationTimestamp

# Node debugging
kubectl describe node <node-name>
kubectl logs <pod-name> -n <namespace>

# Network debugging
kubectl exec -it <pod> -- ping <target>
kubectl get networkpolicies
```

### Application Issues

```bash
# Application debugging
kubectl logs -f <pod-name>
kubectl exec -it <pod-name> -- /bin/sh
kubectl port-forward <pod-name> <local-port>:<remote-port>

# GitOps debugging
flux get all
flux logs --follow
```

## Performance Monitoring

### Key Metrics

```bash
# Infrastructure metrics
- CPU utilization per node
- Memory utilization per node
- Storage I/O performance
- Network throughput and latency
- VM creation time

# Kubernetes metrics
- Pod scheduling time
- Container startup time
- Service response time
- Resource request vs usage
- Cluster resource utilization
```

### Alerting Thresholds

```yaml
# Example alert configurations
- CPU utilization > 80% for 5 minutes
- Memory utilization > 85% for 5 minutes
- Disk usage > 90%
- Pod restart count > 5 in 10 minutes
- Node not ready for > 2 minutes
```

## Compliance and Governance

### Change Management

```bash
# All changes through GitOps
1. Create feature branch
2. Update configuration
3. Create pull request
4. Automated testing
5. Peer review
6. Merge to main
7. Automatic deployment
```

### Audit Logging

```bash
# Comprehensive audit trail
- Pulumi state changes
- Kubernetes API access
- Container registry access
- Secret access patterns
- Network access logs
```

### Backup Strategy

```bash
# Multi-tier backup approach
- Pulumi state backup (real-time)
- Kubernetes configuration backup (daily)
- Application data backup (daily)
- VM snapshot backup (weekly)
- Full system backup (monthly)
```
