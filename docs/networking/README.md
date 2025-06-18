# Networking Documentation

Network configuration and management guide for InfraFlux.

## 🌐 Network Architecture Overview

InfraFlux uses **K3s native networking** with Cilium CNI for advanced network features and security.

### Network Topology
```
External Network (192.168.1.0/24)
         │
    ┌────▼────┐
    │ Proxmox │
    │  Host   │
    └────┬────┘
         │
    ┌────▼────┐
    │   VMs   │
    │ Bridge  │
    └────┬────┘
         │
┌────────▼────────┐
│  Kubernetes     │
│  Cluster        │
│                 │
│ Pod CIDR:       │
│ 10.244.0.0/16   │
│                 │
│ Service CIDR:   │
│ 10.96.0.0/12    │
└─────────────────┘
```

## 🔧 Network Configuration

### Core Network Settings
```yaml
# cluster-config.yaml
network_cidr: "auto"  # Auto-detect or specify: "192.168.1.0/24"
service_cidr: "10.96.0.0/12"
pod_cidr: "10.244.0.0/16"
cluster_dns: "10.96.0.10"
```

### CNI Configuration (Cilium)
- **Network Policy Enforcement**: Full Kubernetes NetworkPolicy support
- **Service Mesh Ready**: Envoy proxy for advanced traffic management
- **Observability**: Hubble for network monitoring
- **Security**: Transparent encryption and identity-based policies

## 🚪 Ingress & Load Balancing

### Traefik Ingress Controller
InfraFlux uses **Traefik v3** as the native K3s ingress controller:

#### Features
- **Automatic SSL**: Let's Encrypt certificate management
- **Load Balancing**: Multiple backend algorithms
- **Middleware**: Authentication, rate limiting, compression
- **Dashboard**: Web UI for configuration management

#### Configuration Example
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    traefik.ingress.kubernetes.io/router.entrypoints: web,websecure
    traefik.ingress.kubernetes.io/router.tls.certresolver: letsencrypt
    traefik.ingress.kubernetes.io/router.middlewares: auth@kubernetescrd
spec:
  rules:
  - host: myapp.local.cluster
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
  tls:
  - secretName: myapp-tls
    hosts:
    - myapp.local.cluster
```

### Service Load Balancing
K3s **native ServiceLB** provides:
- **External IP allocation**: Automatic IP assignment
- **Port management**: Service port exposure
- **Health checking**: Backend health validation

## 🔒 Network Security

### Network Policies
Kubernetes NetworkPolicies control traffic between pods:

#### Default Deny Policy
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: applications
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

#### Allow Specific Traffic
```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: applications
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend
    ports:
    - protocol: TCP
      port: 8080
```

### Cilium Security Policies
Advanced Layer 3/4/7 security policies:

```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: http-security
  namespace: applications
spec:
  endpointSelector:
    matchLabels:
      app: web-server
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "GET"
          path: "/api/.*"
```

## 🔍 Network Monitoring

### Hubble Network Observability
**Hubble UI** provides real-time network visibility:

```bash
# Access Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
# Visit: http://localhost:12000
```

#### Hubble CLI
```bash
# Install Hubble CLI
curl -L --remote-name-all https://github.com/cilium/hubble/releases/latest/download/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin

# Port forward to Hubble Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80

# Query network flows
hubble observe --server localhost:4245
hubble observe --namespace applications
hubble observe --pod my-app
```

### Network Metrics
Prometheus metrics for network monitoring:
- **Packet counts**: Ingress/egress packet statistics
- **Connection tracking**: Active connections
- **Policy violations**: Dropped packets by policy
- **Latency measurements**: Inter-pod communication latency

## 🌍 DNS Configuration

### Cluster DNS (CoreDNS)
K3s includes CoreDNS for internal name resolution:

#### Custom DNS Entries
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  custom.server: |
    example.local:53 {
        hosts {
            192.168.1.100 internal.example.local
        }
    }
```

### External DNS (Optional)
Automatic DNS record management with external providers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-dns
  namespace: external-dns
spec:
  template:
    spec:
      containers:
      - name: external-dns
        image: k8s.gcr.io/external-dns/external-dns:v0.13.1
        args:
        - --source=ingress
        - --provider=cloudflare
        - --cloudflare-proxied
        env:
        - name: CF_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: cloudflare-api-token
              key: token
```

## 🔧 Network Troubleshooting

### Common Network Issues

#### Pod-to-Pod Communication Failure
```bash
# Test pod connectivity
kubectl exec -it source-pod -- ping target-pod-ip

# Check network policies
kubectl describe networkpolicy -n namespace

# Verify Cilium agent
kubectl get pods -n kube-system | grep cilium
kubectl logs -n kube-system daemonset/cilium
```

#### Ingress Not Working
```bash
# Check Traefik status
kubectl get pods -n kube-system | grep traefik
kubectl logs -n kube-system deployment/traefik

# Verify ingress configuration
kubectl get ingress -A
kubectl describe ingress ingress-name -n namespace

# Test service connectivity
kubectl get endpoints -n namespace
```

#### DNS Resolution Issues
```bash
# Test DNS from pod
kubectl exec -it test-pod -- nslookup kubernetes.default

# Check CoreDNS
kubectl get pods -n kube-system | grep coredns
kubectl logs -n kube-system deployment/coredns

# Verify DNS configuration
kubectl get configmap coredns -n kube-system -o yaml
```

### Network Diagnostic Tools

#### Network Testing Pod
```yaml
apiVersion: v1
kind: Pod
metadata:
  name: network-debug
spec:
  containers:
  - name: network-debug
    image: nicolaka/netshoot
    command: ["/bin/bash", "-c", "sleep 3600"]
```

#### Common Commands
```bash
# Test network connectivity
kubectl exec -it network-debug -- ping 8.8.8.8
kubectl exec -it network-debug -- nslookup google.com
kubectl exec -it network-debug -- curl http://service-name:port

# Network interface information
kubectl exec -it network-debug -- ip addr show
kubectl exec -it network-debug -- ip route show

# Port scanning
kubectl exec -it network-debug -- nmap -p 80,443 service-ip
```

## ⚡ Performance Optimization

### Network Performance Tuning

#### Node-Level Optimizations
```bash
# Increase network buffer sizes
echo 'net.core.rmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.core.wmem_max = 134217728' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_rmem = 4096 87380 134217728' >> /etc/sysctl.conf
echo 'net.ipv4.tcp_wmem = 4096 65536 134217728' >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

#### Pod Network Optimization
```yaml
# High-performance pod configuration
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    resources:
      limits:
        memory: "1Gi"
        cpu: "1000m"
      requests:
        memory: "512Mi"
        cpu: "500m"
    # Use host network for maximum performance (when appropriate)
    hostNetwork: true
    dnsPolicy: ClusterFirstWithHostNet
```

### Bandwidth Management
```yaml
# Traffic shaping with annotations
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubernetes.io/ingress-bandwidth: "10M"
    kubernetes.io/egress-bandwidth: "10M"
spec:
  containers:
  - name: bandwidth-limited-app
    image: nginx
```

## 🛠️ Advanced Networking

### Service Mesh (Future)
Plans for service mesh integration:
- **Istio**: Advanced traffic management
- **Linkerd**: Lightweight service mesh
- **Consul Connect**: HashiCorp service mesh

### Multi-Cluster Networking (Future)
- **Cluster mesh**: Cross-cluster communication
- **Federation**: Service discovery across clusters
- **WAN connectivity**: Secure inter-site networking

## 📚 Network Resources

### Configuration Files
- `cluster/base/dns/` - DNS configurations
- `cluster/base/security/` - Network policies
- `cluster/overlays/*/patches/` - Environment-specific network settings

### External Documentation
- [Cilium Documentation](https://docs.cilium.io/)
- [Traefik Documentation](https://doc.traefik.io/traefik/)
- [Kubernetes Networking](https://kubernetes.io/docs/concepts/cluster-administration/networking/)