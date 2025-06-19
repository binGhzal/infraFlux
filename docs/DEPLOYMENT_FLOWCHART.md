# InfraFlux v2.0 Deployment Flowchart

## Overview

This flowchart shows the complete deployment process for InfraFlux v2.0, from initial configuration to a fully operational Kubernetes cluster with GitOps.

```mermaid
graph TD
    A[Start Deployment] --> B{Check Prerequisites}
    B -->|Missing Tools| C[Install Required Tools<br/>- python3, yq<br/>- talosctl, kubectl<br/>- terraform<br/>- Python deps: PyYAML, Jinja2]
    C --> B
    B -->|All Tools Ready| D[Load cluster-config.yaml]

    D --> E[Generate Configurations<br/>Python script creates:<br/>- Talos machine configs<br/>- Terraform VM configs<br/>- Cluster secrets]

    E --> F[Validate Configurations<br/>- Talos config syntax<br/>- Terraform plan<br/>- Network settings]

    F -->|Validation Failed| G[Fix Configuration Issues]
    G --> E
    F -->|Validation Passed| H[Deploy Infrastructure<br/>Terraform creates VMs on Proxmox]

    H --> I[Initialize Terraform]
    I --> J[Plan Deployment<br/>Review VM creation plan]
    J --> K[Apply Terraform<br/>Create VMs with Talos ISO]

    K --> L[Wait for VMs to Boot<br/>VMs start with Talos ISO]
    L --> M[Apply Talos Configurations<br/>Configure each node via talosctl]

    M --> N[Configure Control Plane Nodes<br/>Apply controlplane.yaml configs]
    N --> O[Configure Worker Nodes<br/>Apply worker.yaml configs]

    O --> P[Wait for Node Reboot<br/>Nodes restart with Talos config]
    P --> Q[Bootstrap Kubernetes Cluster<br/>Initialize etcd and K8s API]

    Q --> R[Wait for Cluster Health<br/>Verify all nodes joined]
    R --> S[Generate Kubeconfig<br/>Extract cluster access credentials]

    S --> T[Deploy Core Applications]
    T --> U[Install Cilium CNI<br/>Pod networking and security]
    U --> V[Install cert-manager<br/>TLS certificate automation]

    V --> W[Bootstrap Flux GitOps]
    W --> X{Flux CLI Available?}
    X -->|Yes| Y[Run flux bootstrap<br/>Connect to Git repository]
    X -->|No| Z[Install Flux manually<br/>Apply basic Flux manifests]

    Y --> AA[Configure GitOps<br/>Set up infrastructure and<br/>application management]
    Z --> AA

    AA --> BB[Verify Deployment<br/>Check cluster health<br/>Confirm GitOps active]

    BB --> CC[Deployment Complete<br/>✅ Talos cluster ready<br/>✅ GitOps configured<br/>✅ Ready for applications]

    subgraph "Phase 1: Prerequisites & Config"
        B
        C
        D
        E
        F
        G
    end

    subgraph "Phase 2: Infrastructure"
        H
        I
        J
        K
    end

    subgraph "Phase 3: Cluster Bootstrap"
        L
        M
        N
        O
        P
        Q
        R
        S
    end

    subgraph "Phase 4: Core Applications"
        T
        U
        V
    end

    subgraph "Phase 5: GitOps"
        W
        X
        Y
        Z
        AA
    end

    subgraph "Phase 6: Completion"
        BB
        CC
    end
```

## Key Components

### 1. Configuration Management

- **Single Source of Truth**: `config/cluster-config.yaml` drives entire deployment
- **Template Generation**: Jinja2 templates create Talos and Terraform configs
- **Validation**: Comprehensive pre-deployment validation prevents issues

### 2. Infrastructure as Code

- **Proxmox Integration**: Terraform creates VMs with Talos ISO
- **Immutable Infrastructure**: VMs boot directly from Talos ISO
- **No SSH Required**: All management via Talos API

### 3. Cluster Lifecycle

- **Automated Bootstrap**: talosctl handles cluster initialization
- **Certificate Management**: Automatic PKI setup and rotation
- **Health Monitoring**: Built-in health checks and validation

### 4. GitOps Transition

- **Flux v2**: Modern GitOps operator for Kubernetes
- **Declarative Management**: All applications managed through Git
- **Continuous Reconciliation**: Automatic drift detection and correction

## Deployment Commands

### Full Deployment

```bash
./deploy.sh config/cluster-config.yaml all
```

### Phase-by-Phase Deployment

```bash
# Infrastructure only
./deploy.sh config/cluster-config.yaml infrastructure

# Cluster bootstrap only
./deploy.sh config/cluster-config.yaml cluster

# Core applications only
./deploy.sh config/cluster-config.yaml apps

# GitOps setup only
./deploy.sh config/cluster-config.yaml gitops
```

## Post-Deployment

After successful deployment, you will have:

1. **Talos Kubernetes Cluster**: Immutable, secure, API-driven infrastructure
2. **Flux GitOps**: Continuous delivery system for applications
3. **Core Components**: Cilium networking, cert-manager for TLS
4. **Monitoring Ready**: Infrastructure prepared for observability stack

The cluster is now ready for application deployment through GitOps workflows managed by Flux v2.
