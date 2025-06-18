# InfraFlux Deployment Flow

## Overview

This document describes the complete deployment flow for InfraFlux - an automated Kubernetes cluster deployment system for Proxmox.

## Deployment Flow Diagram

```mermaid
flowchart TD
    A[Start: ./configure.sh] --> B{Config Exists?}
    B -->|No| C[Interactive Configuration Wizard]
    B -->|Yes| D[Load Existing Config]

    C --> E[Save config/cluster-config.yaml]
    D --> E

    E --> F[Run: ./deploy.sh]
    F --> G[Parse Configuration]
    G --> H[Check Prerequisites]

    H --> I{All Tools Available?}
    I -->|No| J[Install Missing Tools]
    I -->|Yes| K[Start Deployment]
    J --> K

    K --> L[Phase 1: Infrastructure]
    L --> M[Generate Terraform Plans]
    M --> N[Create Proxmox VMs via Terraform]
    N --> O[Wait for VM Boot & SSH Ready]

    O --> P[Phase 2: Node Preparation]
    P --> Q[Update System Packages]
    Q --> R[Configure SSH Keys]
    R --> S[Install Docker/Containerd]
    S --> T[Configure Networking]
    T --> U[Disable Swap & Configure Kernel]

    U --> V[Phase 3: K3s Cluster Setup]
    V --> W[Install K3s on First Master]
    W --> X[Extract Cluster Token]
    X --> Y[Join Additional Masters]
    Y --> Z[Join Worker Nodes]
    Z --> AA[Configure kubectl Access]

    AA --> BB[Phase 4: Applications]
    BB --> CC{Install Cilium?}
    CC -->|Yes| DD[Deploy Cilium CNI]
    CC -->|No| EE[Use Flannel CNI]
    DD --> FF
    EE --> FF[Configure Traefik Ingress]

    FF --> GG{Install MetalLB?}
    GG -->|Yes| HH[Deploy MetalLB Load Balancer]
    GG -->|No| II
    HH --> II{Install Monitoring?}

    II -->|Yes| JJ[Deploy Prometheus Stack]
    II -->|No| KK
    JJ --> KK{Install Backup?}

    KK -->|Yes| LL[Deploy Velero Backup]
    KK -->|No| MM
    LL --> MM[Deployment Complete ✅]

    MM --> NN[Generate kubeconfig]
    NN --> OO[Display Access Information]
```

## Detailed Steps

## Key Features & Flow

### 🔐 Authentication Flow

- **Proxmox**: Username/Password via API (no SSH needed)
- **VMs**: SSH key-based authentication (deployed during VM creation)
- **Secure**: Password auth disabled on VMs after deployment

### 🌐 Network Intelligence

- **Auto-Detection**: Discovers local network configuration
- **Flexible**: Supports any private IP range (192.168.x.x, 10.x.x.x, 172.x.x.x)
- **Sequential IPs**: Assigns IPs starting from .10 (Controllers first, then Workers)

### 🔄 Phase-Based Deployment

1. **Infrastructure**: Proxmox VM creation with Terraform templates
2. **Node Prep**: System hardening and Kubernetes prerequisites
3. **K3s Setup**: HA cluster with embedded etcd
4. **Applications**: Core services using native K3s features

### 🚀 Native K3s Advantages

- **Traefik**: Built-in ingress controller (enabled instead of NGINX)
- **ServiceLB**: Native load balancer for small clusters
- **Local Storage**: Built-in storage class
- **Lightweight**: Single binary, minimal resource usage

### 🛠️ Error Handling

- **Validation**: Pre-flight checks for all dependencies
- **Rollback**: Phase-based deployment allows partial recovery
- **Logging**: Detailed logs for each phase
- **Health Checks**: Continuous monitoring during deployment
