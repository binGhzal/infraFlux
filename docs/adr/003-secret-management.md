# ADR-003: Adopt Pulumi ESC for Secret Management

## Status
Accepted

## Context
InfraFlux v2.0 requires secure and efficient secret management for:
- Proxmox API credentials
- Kubernetes cluster certificates and tokens
- Application secrets and configuration
- Database passwords and connection strings
- TLS certificates and private keys
- SSH keys and access tokens

The current Ansible-based approach uses Ansible Vault, which creates several challenges:
- Manual secret rotation processes
- Limited integration with Kubernetes native secrets
- Fragmented secret lifecycle management
- No automated secret injection
- Complex secret sharing between environments

## Decision
We will adopt Pulumi ESC (Environments, Secrets, and Configuration) as the unified secret management solution for InfraFlux v2.0.

## Rationale

### Native Pulumi Integration
- **Seamless Integration**: ESC is built specifically for Pulumi infrastructure code
- **Type-Safe Secrets**: Secrets are first-class citizens in TypeScript code
- **Automatic Injection**: Secrets automatically injected into infrastructure resources
- **State Consistency**: Secrets versioned alongside infrastructure state

### Kubernetes-Native Support
- **Direct Integration**: Native Kubernetes secret synchronization
- **Namespace Isolation**: Environment-based secret scoping
- **RBAC Integration**: Leverages Kubernetes access controls
- **Operator Pattern**: ESC operator manages secret lifecycle

### Environment-Based Organization
- **Hierarchical Secrets**: Inheritance from base to specific environments
- **Configuration Management**: Unified secrets and configuration
- **Multi-Environment**: Consistent patterns across dev/staging/prod
- **Version Control**: Git-based secret configuration (encrypted)

### Security and Compliance
- **Encryption at Rest**: AES-256 encryption for all stored secrets
- **Transit Encryption**: TLS for all secret transfers
- **Audit Logging**: Comprehensive access and modification logs
- **Least Privilege**: Minimal secret exposure patterns
- **Key Rotation**: Automated secret rotation capabilities

### Operational Efficiency
- **GitOps Compatible**: Secrets managed through Git workflows
- **Automation Ready**: API-driven secret management
- **Policy Enforcement**: Secret policies as code
- **Monitoring Integration**: Secret access monitoring and alerting

## Architecture Design

### ESC Environment Hierarchy
```yaml
# Base environment: infraflux-base
values:
  shared:
    proxmox:
      endpoint: "https://proxmox.homelab.local:8006"
      node: "pve1"
    
  secrets:
    proxmox:
      api_token_id: ${pulumi.secrets.proxmox_api_token_id}
      api_token_secret: ${pulumi.secrets.proxmox_api_token_secret}
    
    cluster:
      ca_certificate: ${pulumi.secrets.cluster_ca_cert}
      admin_token: ${pulumi.secrets.cluster_admin_token}
```

### Development Environment
```yaml
# Development environment: infraflux-dev
imports:
  - infraflux-base

values:
  environment: "development"
  cluster:
    name: "homelab-dev"
    node_count: 3
    
  secrets:
    database:
      root_password: ${pulumi.secrets.dev_db_root_password}
      app_password: ${pulumi.secrets.dev_db_app_password}
```

### Production Environment
```yaml
# Production environment: infraflux-prod
imports:
  - infraflux-base

values:
  environment: "production"
  cluster:
    name: "homelab-prod"
    node_count: 5
    
  secrets:
    database:
      root_password: ${pulumi.secrets.prod_db_root_password}
      app_password: ${pulumi.secrets.prod_db_app_password}
    
    certificates:
      tls_cert: ${pulumi.secrets.prod_tls_certificate}
      tls_key: ${pulumi.secrets.prod_tls_private_key}
```

## Implementation Strategy

### Secret Categories and Patterns

#### Infrastructure Secrets
```typescript
// Proxmox API credentials
interface ProxmoxSecrets {
  apiTokenId: string;
  apiTokenSecret: pulumi.Output<string>;
  sshPrivateKey?: pulumi.Output<string>;
}

// Usage in infrastructure code
const proxmoxSecrets = pulumi.Config.requireSecret('proxmox.api_token_secret');
const provider = new proxmox.Provider('proxmox', {
  endpoint: config.require('proxmox.endpoint'),
  apiToken: proxmoxSecrets,
});
```

#### Kubernetes Secrets
```typescript
// Kubernetes cluster secrets
interface ClusterSecrets {
  adminToken: pulumi.Output<string>;
  caCertificate: pulumi.Output<string>;
  serviceAccountToken: pulumi.Output<string>;
}

// Automatic K8s secret creation
const appSecret = new k8s.core.v1.Secret('app-secret', {
  metadata: { namespace: 'default' },
  stringData: {
    database_url: pulumi.interpolate`postgres://user:${dbPassword}@${dbHost}/app`,
    api_key: config.requireSecret('app.api_key'),
  },
});
```

#### Application Secrets
```typescript
// Application configuration with secrets
interface ApplicationConfig {
  database: {
    host: string;
    port: number;
    username: string;
    password: pulumi.Output<string>;
  };
  external_apis: {
    api_key: pulumi.Output<string>;
    webhook_secret: pulumi.Output<string>;
  };
}
```

### Secret Rotation Automation

#### Automated Rotation Policies
```yaml
# ESC rotation configuration
values:
  rotation_policies:
    database_passwords:
      schedule: "0 2 * * 0"  # Weekly on Sunday 2 AM
      rotation_window: "4h"
      notification_channels: ["ops-alerts"]
    
    api_tokens:
      schedule: "0 3 1 * *"  # Monthly on 1st at 3 AM
      rotation_window: "2h"
      pre_rotation_hooks: ["backup_current_tokens"]
```

#### Rotation Implementation
```typescript
// Automated secret rotation
class SecretRotator {
  async rotateSecret(secretName: string, policy: RotationPolicy): Promise<void> {
    const currentSecret = await this.getCurrentSecret(secretName);
    const newSecret = await this.generateNewSecret(secretName);
    
    // Test new secret
    await this.validateSecret(newSecret);
    
    // Update ESC environment
    await this.updateESCSecret(secretName, newSecret);
    
    // Trigger infrastructure update
    await this.triggerInfrastructureUpdate();
    
    // Cleanup old secret after grace period
    await this.scheduleSecretCleanup(currentSecret, policy.gracePeriod);
  }
}
```

### Security Controls

#### Access Control Patterns
```typescript
// Role-based secret access
interface SecretAccess {
  environments: string[];
  roles: ('admin' | 'developer' | 'operator')[];
  resources: string[];
  operations: ('read' | 'write' | 'rotate')[];
}

// Example access control
const secretPolicies = {
  'proxmox.api_token': {
    environments: ['prod'],
    roles: ['admin', 'operator'],
    operations: ['read']
  },
  'app.database_password': {
    environments: ['dev', 'staging', 'prod'],
    roles: ['admin', 'developer'],
    operations: ['read', 'rotate']
  }
};
```

#### Audit and Monitoring
```typescript
// Secret access monitoring
interface SecretAuditEvent {
  timestamp: Date;
  user: string;
  action: 'read' | 'write' | 'rotate' | 'delete';
  secretName: string;
  environment: string;
  success: boolean;
  sourceIP: string;
}

// Monitoring integration
class SecretMonitor {
  async logAccess(event: SecretAuditEvent): Promise<void> {
    await this.auditLogger.log(event);
    
    if (this.isUnusualAccess(event)) {
      await this.alertManager.sendAlert({
        severity: 'warning',
        message: `Unusual secret access: ${event.secretName}`,
        details: event
      });
    }
  }
}
```

## Migration Strategy

### Phase 1: ESC Environment Setup
1. Create base ESC environment with common secrets
2. Set up development environment inheritance
3. Configure staging and production environments
4. Implement basic secret rotation policies

### Phase 2: Infrastructure Integration
1. Update Pulumi code to use ESC secrets
2. Replace hardcoded credentials with ESC references
3. Implement secret validation in infrastructure code
4. Add secret-dependent resource creation

### Phase 3: Kubernetes Integration
1. Deploy ESC Kubernetes operator
2. Configure automatic secret synchronization
3. Update application manifests to use ESC secrets
4. Implement secret rotation for K8s resources

### Phase 4: Automation and Monitoring
1. Set up automated secret rotation
2. Implement comprehensive audit logging
3. Configure secret access monitoring
4. Create secret lifecycle management workflows

## Consequences

### Positive
- **Unified Management**: Single source of truth for all secrets
- **Enhanced Security**: Encryption, rotation, and audit capabilities
- **Developer Productivity**: Seamless secret integration in code
- **Operational Efficiency**: Automated rotation and monitoring
- **Compliance Ready**: Comprehensive audit trails and access controls
- **GitOps Compatible**: Version-controlled secret configuration

### Negative
- **Vendor Lock-in**: Tied to Pulumi ecosystem
- **Learning Curve**: Team needs to learn ESC concepts and patterns
- **Complexity**: Additional layer in secret management
- **Migration Effort**: Need to migrate existing Ansible Vault secrets

### Risk Mitigation
- **Backup Strategy**: Regular encrypted backups of ESC environments
- **Fallback Plan**: Maintain ability to use external secret stores
- **Training Investment**: Comprehensive ESC training for team
- **Gradual Migration**: Incremental migration from Ansible Vault
- **Monitoring**: Comprehensive secret access and health monitoring

## Alternatives Considered

### HashiCorp Vault
- **Pros**: Mature ecosystem, extensive integrations, dynamic secrets
- **Cons**: Additional infrastructure, complex setup, separate tool
- **Verdict**: Rejected due to complexity and tool fragmentation

### Kubernetes Native Secrets
- **Pros**: Built into Kubernetes, no external dependencies
- **Cons**: Base64 encoding only, no rotation, limited management
- **Verdict**: Used for runtime but not for management

### External Secret Operator (ESO)
- **Pros**: Kubernetes-native, supports multiple backends
- **Cons**: Additional complexity, requires external secret store
- **Verdict**: Considered for hybrid approach if needed

### Sealed Secrets
- **Pros**: GitOps native, encrypted in repository
- **Cons**: No rotation, limited lifecycle management
- **Verdict**: Considered for GitOps integration only

## Success Metrics
- **Security Incidents**: Zero secret-related security incidents
- **Rotation Compliance**: 100% automated rotation for critical secrets
- **Access Audit**: Complete audit trail for all secret access
- **Developer Satisfaction**: Positive feedback on secret management workflow
- **Operational Efficiency**: Reduced manual secret management overhead

## Implementation Checklist
- [ ] ESC environment hierarchy design and implementation
- [ ] Secret migration from Ansible Vault to ESC
- [ ] Pulumi code integration with ESC secrets
- [ ] Kubernetes operator deployment and configuration
- [ ] Automated rotation policy implementation
- [ ] Audit logging and monitoring setup
- [ ] Access control and RBAC configuration
- [ ] Backup and disaster recovery procedures
- [ ] Team training and documentation
- [ ] Security testing and validation

## Review Date
This decision will be reviewed after 6 months of implementation or if significant security requirements change.

## References
- [Pulumi ESC Documentation](https://www.pulumi.com/docs/esc/)
- [Kubernetes Secret Management Best Practices](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Secret Rotation Patterns](https://www.pulumi.com/docs/esc/environments/)
- [Security Compliance Guidelines](../specs/pulumi-architecture.md#security-architecture)