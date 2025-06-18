# Security Documentation

Comprehensive security procedures and policies for InfraFlux.

## 🛡️ Security Overview

InfraFlux implements **defense-in-depth security** with enterprise-grade controls across all layers of the infrastructure stack.

### Security Pillars

1. **🔐 Identity & Access Management**: Authentik SSO + RBAC
2. **🔒 Data Protection**: Encryption at rest and in transit
3. **🌐 Network Security**: Network policies + behavioral analysis
4. **🔍 Monitoring & Compliance**: Continuous security monitoring
5. **🚨 Incident Response**: Automated threat detection and response

## 🔑 Authentication & Authorization

### Single Sign-On (SSO)
- **Provider**: Authentik
- **Protocols**: OIDC, SAML, LDAP
- **MFA**: TOTP, WebAuthn support
- **Integration**: All applications use centralized auth

#### Setup Guide
```bash
# Deploy Authentik (included in base deployment)
./deploy.sh security

# Access admin interface
kubectl port-forward -n security svc/authentik-server 9000:80
# Navigate to: http://localhost:9000/if/admin/
```

### Role-Based Access Control (RBAC)

#### Predefined Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **cluster-admin** | Full cluster access | Infrastructure team |
| **namespace-admin** | Full namespace access | Application owners |
| **developer** | Read/write in dev namespaces | Development team |
| **viewer** | Read-only access | Monitoring/support |
| **ai-ml-user** | GPU resource access | Data scientists |

#### Custom Role Example
```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: app-developer
  namespace: applications
rules:
- apiGroups: ["apps", ""]
  resources: ["deployments", "services", "configmaps"]
  verbs: ["get", "list", "create", "update", "delete"]
```

## 🔒 Data Protection

### Secrets Management
- **Solution**: Sealed Secrets for GitOps compatibility
- **Encryption**: AES-256 encryption with cluster-specific keys
- **Rotation**: Regular secret rotation procedures

#### Creating Sealed Secrets
```bash
# Install kubeseal CLI
curl -OL https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.18.0/kubeseal-linux-amd64
sudo install -m 755 kubeseal-linux-amd64 /usr/local/bin/kubeseal

# Create sealed secret
echo -n 'my-secret-value' | \
  kubectl create secret generic my-secret \
  --dry-run=client --from-file=password=/dev/stdin -o yaml | \
  kubeseal -o yaml > my-sealed-secret.yaml
```

### Certificate Management
- **Authority**: Let's Encrypt + cert-manager
- **Automatic Renewal**: 60-day renewal cycle
- **TLS Everywhere**: All communications encrypted

#### Certificate Issuers
```yaml
# Production issuer (rate limited)
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: traefik
```

## 🌐 Network Security

### Network Policies
- **Default Deny**: All traffic blocked by default
- **Explicit Allow**: Only required traffic permitted
- **Namespace Isolation**: Cross-namespace restrictions

#### Example Network Policy
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
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-monitoring
  namespace: applications
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    ports:
    - protocol: TCP
      port: 8080
```

### Behavioral Security (CrowdSec)
- **Threat Detection**: Real-time attack pattern recognition
- **Automatic Response**: IP blocking and rate limiting
- **Community Intelligence**: Shared threat intelligence

#### CrowdSec Configuration
```bash
# Check CrowdSec status
kubectl get pods -n security | grep crowdsec

# View decisions (blocked IPs)
kubectl exec -n security deployment/crowdsec -- cscli decisions list

# Check metrics
kubectl port-forward -n security svc/crowdsec 8080:8080
# Visit: http://localhost:8080/metrics
```

## 🔍 Security Monitoring

### Vulnerability Scanning
- **Tool**: Trivy Scanner
- **Scope**: Container images and Kubernetes manifests
- **Frequency**: Daily scans with critical alert notifications

#### Running Security Scans
```bash
# Scan container images
kubectl get pods -A -o jsonpath='{range .items[*]}{.spec.containers[*].image}{"\n"}{end}' | \
  sort -u | \
  xargs -I {} trivy image {}

# Scan Kubernetes manifests
trivy k8s --report summary cluster
```

### Security Metrics
- **Failed authentication attempts**
- **Certificate expiry warnings**
- **Network policy violations**
- **Container vulnerability counts**

### Security Dashboards
Available in Grafana:
- **Security Overview**: High-level security metrics
- **Authentication Activity**: Login attempts and patterns
- **Network Traffic**: Allowed/blocked connections
- **Certificate Status**: Expiry tracking and renewal status

## 🚨 Incident Response

### Alert Categories

| Severity | Examples | Response Time | Actions |
|----------|----------|---------------|---------|
| **Critical** | Cluster compromise, data breach | Immediate | Page on-call, isolate systems |
| **High** | Failed authentication surge, cert expiry | 30 minutes | Investigate and remediate |
| **Medium** | Policy violations, scan failures | 4 hours | Review and address |
| **Low** | Info events, maintenance alerts | 24 hours | Acknowledge and plan |

### Automated Responses
1. **IP Blocking**: CrowdSec automatically blocks malicious IPs
2. **Certificate Renewal**: cert-manager handles automatic renewal
3. **Secret Rotation**: Scheduled rotation of service secrets
4. **Pod Isolation**: Network policies isolate compromised pods

### Manual Procedures

#### Security Incident Response
1. **Detection**: Alert received or anomaly discovered
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze logs and forensic data
5. **Recovery**: Restore services and implement fixes
6. **Documentation**: Record incident and lessons learned

#### Emergency Access
```bash
# Emergency cluster access (break-glass)
kubectl create clusterrolebinding emergency-access \
  --clusterrole=cluster-admin \
  --user=emergency@example.com

# Revoke after incident
kubectl delete clusterrolebinding emergency-access
```

## 🔧 Security Hardening

### Container Security
- **Non-root users**: All containers run as non-root
- **Read-only filesystems**: Containers use read-only root filesystems
- **Resource limits**: CPU and memory limits enforced
- **Security contexts**: Proper security context configurations

#### Pod Security Standards
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: secure-namespace
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### Node Security
- **OS Hardening**: Ubuntu security benchmarks applied
- **Kernel Updates**: Regular security patching
- **SSH Hardening**: Key-based authentication only
- **Firewall Rules**: UFW with minimal required ports

### Application Security
- **HTTPS Only**: All web traffic encrypted
- **Security Headers**: HSTS, CSP, and other security headers
- **Input Validation**: Proper sanitization and validation
- **Dependency Scanning**: Regular dependency vulnerability checks

## 📋 Compliance & Auditing

### Security Auditing
- **Access Logs**: All API access logged
- **Change Tracking**: Git history for configuration changes
- **Compliance Reports**: Regular security posture reports
- **Penetration Testing**: Quarterly security assessments

### Compliance Frameworks
- **CIS Benchmarks**: Kubernetes and Ubuntu hardening
- **NIST Cybersecurity Framework**: Risk management approach
- **SOC 2**: Security controls for service organizations

## 🔄 Regular Security Tasks

### Daily
- Monitor security alerts and dashboards
- Review authentication logs for anomalies
- Check certificate status and expiry warnings

### Weekly
- Update security policies and rules
- Review and approve security patches
- Analyze security metrics and trends

### Monthly
- Rotate service account secrets
- Update vulnerability scan configurations
- Review and test incident response procedures

### Quarterly
- Conduct security assessments
- Update security documentation
- Train team on security procedures

## 📖 Security Resources

### External Tools
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [OWASP Security Guidelines](https://owasp.org/)

### Internal Documentation
- [Network Security Policies](NETWORK_POLICIES.md)
- [Secret Management Procedures](SECRET_MANAGEMENT.md)
- [Incident Response Playbook](INCIDENT_RESPONSE.md)
- [Compliance Checklists](COMPLIANCE.md)