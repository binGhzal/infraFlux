# Infrastructure Documentation

This directory contains comprehensive guides for deploying and managing InfraFlux infrastructure.

## 📋 Documentation Index

### Getting Started
- [Quick Start Guide](QUICKSTART.md) - Deploy InfraFlux in 15 minutes
- [Prerequisites](PREREQUISITES.md) - System requirements and preparation
- [Configuration Guide](CONFIGURATION.md) - cluster-config.yaml explained

### Deployment Guides
- [VM Provisioning](VM_PROVISIONING.md) - Proxmox VM creation with Terraform
- [K3s Cluster Setup](K3S_SETUP.md) - Kubernetes cluster deployment
- [Node Management](NODE_MANAGEMENT.md) - Adding/removing cluster nodes
- [Scaling Guide](SCALING.md) - Dynamic worker node scaling

### Platform Components
- [Core Infrastructure](CORE_INFRASTRUCTURE.md) - Essential cluster components
- [Storage Configuration](STORAGE.md) - Persistent volume setup
- [Network Configuration](NETWORK.md) - Cluster networking and ingress
- [GPU Setup](GPU_SETUP.md) - NVIDIA and Intel GPU configuration

### Operations
- [Backup & Recovery](BACKUP_RECOVERY.md) - Velero backup strategies
- [Updates & Maintenance](UPDATES.md) - Cluster update procedures
- [Health Monitoring](HEALTH_MONITORING.md) - Infrastructure health checks
- [Performance Tuning](PERFORMANCE.md) - Optimization guidelines

## 🚀 Quick Navigation

| Topic | Description | Audience |
|-------|-------------|----------|
| [Quick Start](QUICKSTART.md) | Get InfraFlux running quickly | Beginners |
| [Configuration](CONFIGURATION.md) | Detailed config options | All users |
| [Scaling](SCALING.md) | Add/remove nodes | Operators |
| [GPU Setup](GPU_SETUP.md) | AI/ML workload preparation | AI/ML users |
| [Backup](BACKUP_RECOVERY.md) | Data protection | Administrators |

## 🎯 Architecture Overview

InfraFlux uses a **hybrid deployment approach**:

1. **Ansible Phase**: Infrastructure provisioning and cluster bootstrap
2. **Flux Phase**: Application lifecycle and continuous delivery

See [Architecture Documentation](../architecture/) for detailed system design.