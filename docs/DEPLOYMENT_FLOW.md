# Deployment Flowchart

```mermaid
flowchart TD
  A["Start: ./configure.sh"] --> B["Generate config/cluster-config.yaml"]
  B --> C["Run: ./deploy.sh [phase]"]
  C --> D["Ansible Master Playbook: deploy.yml"]
  D --> E1["Phase 1: Infrastructure\nplaybooks/infrastructure.yml"]
  E1 --> E2["Phase 2: Node Preparation\nplaybooks/node-preparation.yml"]
  E2 --> E3["Phase 3: K3s Cluster\nplaybooks/k3s-cluster.yml"]
  E3 --> E4["Phase 4: Applications\nplaybooks/applications.yml"]
  E4 --> F["Cluster Ready & Applications Deployed"]
  F --> G["Fetch kubeconfig & access services"]
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
