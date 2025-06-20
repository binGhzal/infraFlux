# InfraFlux v2.0 - Detailed Implementation Roadmap

## 🎯 **Vision**

Transform InfraFlux into a production-ready, enterprise-grade infrastructure automation platform for
homelab and cloud deployments using pure Pulumi approaches.

## 🚀 **Recent Major Achievements (Latest Update)**

### Network Auto-Discovery Revolution ✅

**What We Built**:

- **ProxmoxNetworkDiscovery**: Native Pulumi component using `proxmoxve.Network.getHosts()`
- **Zero-Configuration Networking**: Users no longer need to specify gateway/subnet -
  auto-discovered from Proxmox bridge
- **Enhanced QEMU Guest Agent Integration**: Real-time VM network information via native Pulumi VM
  outputs
- **Configuration Architecture Overhaul**: Moved monitoring, security, backup to GitOps (cleaner
  separation)

**Key Benefits**:

- ✅ **50% Less Configuration**: No manual network settings required
- ✅ **Native Pulumi**: No shell commands, pure provider integration
- ✅ **Auto-Discovery**: Gateway and subnet detected from existing bridge configuration
- ✅ **Better Separation**: Infrastructure (Pulumi) vs Applications (GitOps)
- ✅ **Production Ready**: Comprehensive validation with helpful error messages

**Files Enhanced**: `src/components/network-discovery.ts`, `src/config/index.ts`,
`src/types/index.ts`, `env.example`, `README.md`

## 🔥 **Critical Issues (Fix Immediately)**

### 1. Network Configuration Flow ✅ **COMPLETED**

**Problem**: VMs get DHCP IPs but Talos config applies static IPs, creating bootstrap failures.

**Solutions Implemented**:

- [x] Add DHCP discovery mechanism for initial bootstrap
- [x] Implement graceful transition from DHCP to static IPs
- [x] Add network validation before cluster creation
- [x] Support both DHCP and static IP strategies
- [x] Configuration-aware VM ID generation
- [x] Dynamic cluster size handling
- [x] Native Proxmox bridge auto-discovery using `proxmoxve.Network.getHosts`
- [x] QEMU Guest Agent integration for real-time VM network info
- [x] Zero-configuration networking (auto-detect gateway/subnet from bridge)

### 2. Template Existence Validation (Priority: 🔴 Critical)

**Problem**: ISO downloads and template creation can fail if resources already exist.

#### 2.1 ISO Existence Detection

**Complexity**: Low | **Estimated Time**: 4-6 hours **Acceptance Criteria**:

- Query existing ISOs using `proxmoxve.Storage.File` state management
- Check ISO file integrity using SHA256 checksums
- Compare remote and local ISO versions
- Provide clear feedback on ISO status

**Implementation Steps**:

1. Create `ISOChecker` component using Pulumi data sources
2. Implement checksum validation against Talos releases
3. Add force-download option for ISO refresh
4. Create ISO cleanup utilities for old versions

**Files to Create/Modify**:

- `src/components/iso-checker.ts`
- `src/utils/checksum-validator.ts`
- Update `src/components/talos-iso.ts`

#### 2.2 Template Version Management

**Complexity**: Medium | **Estimated Time**: 8-12 hours **Acceptance Criteria**:

- Track template versions with metadata tags
- Support multiple template versions simultaneously
- Implement template rollback functionality
- Add template cleanup for old versions

**Implementation Steps**:

1. Add version tagging to `VirtualMachine` templates
2. Create `TemplateRegistry` component for version tracking
3. Implement template selection logic by version
4. Add template migration utilities

**Files to Create/Modify**:

- `src/components/template-registry.ts`
- `src/utils/template-migration.ts`
- Update `src/components/talos-template.ts`

#### 2.3 Resource State Reconciliation

**Complexity**: Medium | **Estimated Time**: 6-8 hours **Acceptance Criteria**:

- Detect state drift between Pulumi and Proxmox
- Implement safe state reconciliation
- Add conflict resolution strategies
- Provide detailed state comparison reports

**Implementation Steps**:

1. Create `StateReconciler` using `proxmoxve.VM.getVirtualMachine`
2. Implement drift detection algorithms
3. Add user-guided conflict resolution
4. Create state export/import utilities

**Files to Create/Modify**:

- `src/components/state-reconciler.ts`
- `src/utils/drift-detector.ts`

### 3. Error Handling & Recovery (Priority: 🔴 Critical)

**Problem**: Limited error recovery and debugging information.

#### 3.1 Component-Level Error Boundaries

**Complexity**: Medium | **Estimated Time**: 10-14 hours **Acceptance Criteria**:

- Catch and handle errors at component level
- Implement graceful degradation strategies
- Provide actionable error messages
- Support partial recovery scenarios

**Implementation Steps**:

1. Create `ErrorBoundary` wrapper for all components
2. Define error classification system (transient, permanent, config)
3. Implement component isolation to prevent cascade failures
4. Add error context preservation and logging

**Files to Create/Modify**:

- `src/utils/error-boundary.ts`
- `src/types/error-types.ts`
- Update all component files

#### 3.2 Retry & Circuit Breaker Mechanisms

**Complexity**: Medium | **Estimated Time**: 8-10 hours **Acceptance Criteria**:

- Implement exponential backoff for transient failures
- Add circuit breaker for repeated failures
- Support configurable retry policies
- Track retry attempts and success rates

**Implementation Steps**:

1. Create `RetryManager` with configurable policies
2. Implement circuit breaker pattern
3. Add retry state persistence
4. Create metrics collection for retry patterns

**Files to Create/Modify**:

- `src/utils/retry-manager.ts`
- `src/utils/circuit-breaker.ts`
- `src/config/retry-policies.ts`

#### 3.3 Health Check System

**Complexity**: Medium | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Monitor component and resource health continuously
- Implement dependency health checking
- Provide health dashboards and alerts
- Support automated recovery actions

**Implementation Steps**:

1. Create `HealthChecker` component
2. Define health check contracts for all components
3. Implement dependency graph health monitoring
4. Add automated recovery workflows

**Files to Create/Modify**:

- `src/components/health-checker.ts`
- `src/utils/health-monitors.ts`
- `src/types/health-types.ts`

## ⚡ **High Priority Enhancements**

### 4. Configuration Validation ✅ **COMPLETED**

**Implementation Completed**:

- [x] Add Joi schema validation for all config sections
- [x] Create config validation CLI command (`npm run validate-config`)
- [x] Add environment-specific config overrides
- [x] Support for auto-discovery validation (empty values = auto-discover)
- [x] Network conflict detection between Pod/Service CIDRs
- [x] Resource allocation validation and warnings
- [x] Configuration template generator (`npm run config-template`)

#### 4.1 Configuration Migration Tools (Priority: 🟠 High)

**Complexity**: Medium | **Estimated Time**: 6-8 hours **Acceptance Criteria**:

- Support migration between config schema versions
- Provide backward compatibility warnings
- Implement automatic config upgrades
- Generate migration reports

**Implementation Steps**:

1. Create configuration version tracking
2. Implement schema migration utilities
3. Add backward compatibility checks
4. Create migration validation tools

**Files to Create/Modify**:

- `src/utils/config-migrator.ts`
- `src/cli/migrate-config.ts`

### 5. Testing Framework (Priority: 🟠 High)

#### 5.1 Unit Testing Infrastructure

**Complexity**: Medium | **Estimated Time**: 16-20 hours **Acceptance Criteria**:

- Achieve 80%+ code coverage
- Mock all external dependencies (Proxmox API, Talos API)
- Test all component configurations and edge cases
- Implement snapshot testing for resource definitions

**Implementation Steps**:

1. Set up Jest with TypeScript and Pulumi testing utils
2. Create mock factories for Proxmox and Talos APIs
3. Implement component unit tests with resource mocking
4. Add configuration validation testing
5. Create test data generators and fixtures

**Files to Create/Modify**:

- `tests/unit/components/*.test.ts`
- `tests/mocks/proxmox-api.ts`
- `tests/mocks/talos-api.ts`
- `tests/fixtures/test-configs.ts`
- `jest.config.js`

#### 5.2 Integration Testing

**Complexity**: High | **Estimated Time**: 20-24 hours **Acceptance Criteria**:

- Test component interactions with real APIs in sandbox
- Validate end-to-end workflows
- Test error scenarios and recovery paths
- Implement test environment provisioning

**Implementation Steps**:

1. Create test Proxmox environment setup
2. Implement integration test suites
3. Add test data cleanup utilities
4. Create CI/CD integration test pipeline

**Files to Create/Modify**:

- `tests/integration/workflows/*.test.ts`
- `tests/utils/test-environment.ts`
- `.github/workflows/integration-tests.yml`

#### 5.3 Property-Based Testing

**Complexity**: High | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Generate random valid configurations
- Test configuration edge cases
- Validate invariants across config changes
- Discover configuration bugs automatically

**Implementation Steps**:

1. Set up fast-check for property-based testing
2. Create configuration generators
3. Define configuration invariants
4. Implement shrinking for minimal failing cases

**Files to Create/Modify**:

- `tests/property/config-generators.ts`
- `tests/property/config-invariants.test.ts`

### 6. Monitoring & Observability (Priority: 🟠 High)

#### 6.1 Pulumi Resource Metrics

**Complexity**: Medium | **Estimated Time**: 10-12 hours **Acceptance Criteria**:

- Export Prometheus metrics for resource states
- Track deployment durations and success rates
- Monitor resource health and availability
- Provide component-level metrics

**Implementation Steps**:

1. Create `MetricsCollector` component
2. Implement Prometheus metric exporters
3. Add custom metrics for Pulumi operations
4. Create metrics aggregation utilities

**Files to Create/Modify**:

- `src/components/metrics-collector.ts`
- `src/utils/prometheus-exporter.ts`
- `src/types/metrics-types.ts`

#### 6.2 Structured Logging

**Complexity**: Low | **Estimated Time**: 6-8 hours **Acceptance Criteria**:

- Implement structured JSON logging
- Add correlation IDs for request tracing
- Support different log levels and filtering
- Enable log aggregation in external systems

**Implementation Steps**:

1. Enhance existing logger with structured output
2. Add correlation ID tracking
3. Implement log level configuration
4. Create log formatting utilities

**Files to Modify**:

- `src/utils/logger.ts`
- Add `src/types/log-types.ts`

#### 6.3 Deployment Tracing

**Complexity**: High | **Estimated Time**: 16-20 hours **Acceptance Criteria**:

- Trace deployment operations end-to-end
- Track component dependencies and timings
- Provide deployment flow visualization
- Enable performance bottleneck identification

**Implementation Steps**:

1. Implement distributed tracing with OpenTelemetry
2. Add span creation for all major operations
3. Create trace aggregation and analysis tools
4. Build deployment flow visualization

**Files to Create/Modify**:

- `src/utils/tracing.ts`
- `src/components/trace-collector.ts`

### 7. Security Enhancements (Priority: 🟠 High)

#### 7.1 Secret Management Integration

**Complexity**: Medium | **Estimated Time**: 8-12 hours **Acceptance Criteria**:

- Integrate with Pulumi ESC for secret management
- Implement runtime secret injection
- Support secret rotation capabilities
- Provide secret audit trails

**Implementation Steps**:

1. Set up Pulumi ESC integration
2. Create secret injection mechanisms
3. Implement secret rotation utilities
4. Add secret access logging

**Files to Create/Modify**:

- `src/utils/secret-manager.ts`
- `src/components/secret-injector.ts`
- Update configuration files

#### 7.2 RBAC Implementation

**Complexity**: High | **Estimated Time**: 20-24 hours **Acceptance Criteria**:

- Define role-based access control for InfraFlux
- Implement user authentication and authorization
- Support fine-grained resource permissions
- Provide role management utilities

**Implementation Steps**:

1. Design RBAC schema and roles
2. Implement authentication providers
3. Create authorization middleware
4. Build role management interfaces

**Files to Create/Modify**:

- `src/auth/rbac-manager.ts`
- `src/auth/auth-providers.ts`
- `src/middleware/auth-middleware.ts`

#### 7.3 Network Security Policies

**Complexity**: Medium | **Estimated Time**: 10-14 hours **Acceptance Criteria**:

- Define network security groups in Pulumi
- Implement firewall rules management
- Support micro-segmentation policies
- Provide security compliance reporting

**Implementation Steps**:

1. Create security group management components
2. Implement firewall rule generation
3. Add compliance checking utilities
4. Create security reporting tools

**Files to Create/Modify**:

- `src/components/security-groups.ts`
- `src/utils/firewall-manager.ts`

## 🚀 **Medium Priority Features**

### 8. Multi-Cloud Support (Priority: 🟡 Medium)

#### 8.1 Provider Abstraction Layer

**Complexity**: High | **Estimated Time**: 24-30 hours **Acceptance Criteria**:

- Create unified interface for all cloud providers
- Support provider-specific optimizations
- Implement provider discovery and selection
- Provide seamless provider switching

**Implementation Steps**:

1. Design provider abstraction interfaces
2. Implement Proxmox provider adapter
3. Create AWS EC2 provider adapter
4. Add provider registry and selection logic

**Files to Create/Modify**:

- `src/providers/provider-interface.ts`
- `src/providers/proxmox-adapter.ts`
- `src/providers/aws-adapter.ts`
- `src/providers/provider-registry.ts`

#### 8.2 AWS EC2 Provider Implementation

**Complexity**: High | **Estimated Time**: 20-26 hours **Acceptance Criteria**:

- Support EC2 instance provisioning
- Implement AWS networking integration
- Support AWS-specific Talos configurations
- Provide cost optimization features

**Implementation Steps**:

1. Create AWS EC2 components
2. Implement VPC and networking setup
3. Add AWS-specific Talos integration
4. Create cost monitoring utilities

#### 8.3 Azure VM Provider Implementation

**Complexity**: High | **Estimated Time**: 20-26 hours **Acceptance Criteria**:

- Support Azure VM provisioning
- Implement Azure networking integration
- Support Azure-specific Talos configurations
- Provide Azure cost management

### 9. Advanced Networking (Priority: 🟡 Medium)

#### 9.1 VLAN Management

**Complexity**: Medium | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Create and manage VLANs via Pulumi
- Support VLAN tagging and trunking
- Implement VLAN-based network isolation
- Provide VLAN monitoring and troubleshooting

**Implementation Steps**:

1. Create VLAN management components using Proxmox provider
2. Implement VLAN configuration utilities
3. Add VLAN validation and monitoring
4. Create VLAN troubleshooting tools

**Files to Create/Modify**:

- `src/components/vlan-manager.ts`
- `src/utils/network-validation.ts`

#### 9.2 Load Balancer Integration

**Complexity**: Medium | **Estimated Time**: 14-18 hours **Acceptance Criteria**:

- Configure MetalLB via Pulumi Kubernetes provider
- Implement Cilium L4LB integration
- Support load balancer service management
- Provide traffic monitoring and analytics

**Implementation Steps**:

1. Create MetalLB configuration components
2. Implement Cilium integration
3. Add service monitoring capabilities
4. Create traffic analytics tools

#### 9.3 Service Mesh Setup

**Complexity**: High | **Estimated Time**: 20-26 hours **Acceptance Criteria**:

- Deploy Istio or Linkerd via Pulumi
- Configure service mesh policies
- Implement mTLS and security policies
- Provide service mesh observability

**Implementation Steps**:

1. Create service mesh deployment components
2. Implement policy management
3. Add security configuration
4. Create monitoring and observability

### 10. Backup & Disaster Recovery (Priority: 🟡 Medium)

#### 10.1 VM Snapshot Management

**Complexity**: Medium | **Estimated Time**: 10-14 hours **Acceptance Criteria**:

- Create automated VM snapshots via Proxmox provider
- Implement snapshot scheduling and retention
- Support snapshot restoration workflows
- Provide snapshot monitoring and alerting

**Implementation Steps**:

1. Create snapshot management components
2. Implement scheduling utilities
3. Add restoration workflows
4. Create monitoring and alerting

#### 10.2 Kubernetes Backup Integration

**Complexity**: Medium | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Deploy Velero via Pulumi Kubernetes provider
- Configure backup storage and schedules
- Implement restore testing automation
- Provide backup monitoring and reporting

**Implementation Steps**:

1. Create Velero deployment components
2. Configure backup policies
3. Implement restore testing
4. Add monitoring and reporting

### 11. GitOps Enhancements (Priority: 🟡 Medium)

#### 11.1 Multi-Environment Pipeline

**Complexity**: High | **Estimated Time**: 18-24 hours **Acceptance Criteria**:

- Support dev/staging/prod environment promotion
- Implement progressive deployment strategies
- Support configuration drift detection
- Provide rollback automation

**Implementation Steps**:

1. Create environment management components
2. Implement promotion workflows
3. Add drift detection utilities
4. Create rollback automation

#### 11.2 Configuration Drift Detection

**Complexity**: Medium | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Monitor configuration changes across environments
- Detect unauthorized modifications
- Provide drift reporting and alerts
- Support automated remediation

## 🛠 **Development Quality Improvements**

### 12. Developer Experience (Priority: 🟡 Medium)

#### 12.1 CLI Tool Development

**Complexity**: Medium | **Estimated Time**: 16-20 hours **Acceptance Criteria**:

- Create comprehensive CLI for common operations
- Support interactive configuration setup
- Provide deployment status monitoring
- Include troubleshooting utilities

**Implementation Steps**:

1. Create CLI framework with commander.js
2. Implement interactive configuration wizard
3. Add status monitoring commands
4. Create troubleshooting utilities

#### 12.2 VS Code Extension

**Complexity**: High | **Estimated Time**: 30-40 hours **Acceptance Criteria**:

- Provide syntax highlighting for InfraFlux configs
- Support IntelliSense for configuration options
- Integrate deployment status in editor
- Include debugging and troubleshooting tools

### 13. Documentation (Priority: 🟡 Medium)

#### 13.1 Interactive Documentation Site

**Complexity**: Medium | **Estimated Time**: 20-26 hours **Acceptance Criteria**:

- Create comprehensive documentation website
- Include interactive tutorials and examples
- Provide API reference documentation
- Support search and navigation

#### 13.2 Troubleshooting Runbooks

**Complexity**: Low | **Estimated Time**: 12-16 hours **Acceptance Criteria**:

- Document common issues and solutions
- Provide step-by-step troubleshooting guides
- Include diagnostic commands and tools
- Support community contributions

### 14. Performance Optimization (Priority: 🟡 Medium)

#### 14.1 Parallel Resource Creation

**Complexity**: Medium | **Estimated Time**: 10-14 hours **Acceptance Criteria**:

- Implement parallel VM provisioning where safe
- Optimize dependency graphs for parallel execution
- Support configurable parallelism levels
- Provide performance monitoring and tuning

#### 14.2 Resource Caching

**Complexity**: Medium | **Estimated Time**: 8-12 hours **Acceptance Criteria**:

- Cache template downloads and builds
- Implement intelligent cache invalidation
- Support cache sharing across deployments
- Provide cache management utilities

## 🎯 **Revised Priority Implementation Order**

### Phase 1 (Immediate - Next 2 weeks)

**Focus**: Stability and Reliability

1. **Template Existence Validation** (2.1, 2.2, 2.3) - 18-26 hours
2. **Error Handling & Recovery** (3.1, 3.2, 3.3) - 30-40 hours
3. **Configuration Migration Tools** (4.1) - 6-8 hours

**Total Estimated Time**: 54-74 hours (1.5-2 weeks for 2 developers)

### Phase 2 (Short-term - Next 4-6 weeks)

**Focus**: Testing and Observability

1. **Testing Framework** (5.1, 5.2, 5.3) - 48-60 hours
2. **Monitoring & Observability** (6.1, 6.2, 6.3) - 32-40 hours
3. **Security Enhancements** (7.1, 7.2, 7.3) - 38-50 hours

**Total Estimated Time**: 118-150 hours (3-4 weeks for 2 developers)

### Phase 3 (Medium-term - Next 3-4 months)

**Focus**: Multi-cloud and Advanced Features

1. **Multi-Cloud Support** (8.1, 8.2, 8.3) - 64-82 hours
2. **Advanced Networking** (9.1, 9.2, 9.3) - 46-60 hours
3. **Backup & Disaster Recovery** (10.1, 10.2) - 22-30 hours

### Phase 4 (Long-term - 4-6 months)

**Focus**: Developer Experience and Ecosystem

1. **GitOps Enhancements** (11.1, 11.2) - 30-40 hours
2. **Developer Experience** (12.1, 12.2) - 46-60 hours
3. **Documentation** (13.1, 13.2) - 32-42 hours
4. **Performance Optimization** (14.1, 14.2) - 18-26 hours

## 📊 **Success Metrics**

- **Reliability**: 99%+ successful deployments
- **Performance**: Sub-10 minute cluster deployments
- **Test Coverage**: 80%+ code coverage with comprehensive integration tests
- **Security**: Zero critical vulnerabilities, automated security scanning
- **Documentation**: 95%+ user satisfaction, comprehensive troubleshooting guides
- **Developer Experience**: Sub-5 minute setup time, intuitive CLI tools

## 🤝 **Implementation Guidelines**

### For Each Subtask

1. **Research Phase**: Review relevant Pulumi documentation and best practices
2. **Design Phase**: Create technical design document with acceptance criteria
3. **Implementation Phase**: Follow pure Pulumi approaches, avoid shell commands
4. **Testing Phase**: Implement unit tests with 80%+ coverage
5. **Documentation Phase**: Update README and create usage examples
6. **Review Phase**: Code review and integration testing

### Pure Pulumi Principles

- Use native Pulumi providers instead of shell commands
- Leverage Pulumi's resource dependencies and outputs
- Implement proper error handling with Pulumi's error model
- Use Pulumi's configuration and secret management
- Follow Pulumi's component model for reusability

### Technology Stack Preferences

- **Monitoring**: Grafana/Loki (via GitOps)
- **Identity**: Authentik (via GitOps)
- **Networking**: Cilium CNI (via GitOps)
- **Service Mesh**: Istio (via GitOps)
- **Storage**: Longhorn (via GitOps)
- **Load Balancing**: MetalLB + Cilium L4LB (via GitOps)
- **Secret Management**: Pulumi ESC + External Secrets Operator (via GitOps)
- **Certificate Management**: cert-manager (via GitOps)
- **Ingress**: Traefik (via GitOps)

This roadmap provides a comprehensive, implementable plan with clear subtasks, time estimates, and
success criteria for each component.

## 🔧 **Technical Implementation Notes**

### Pulumi Proxmox VE Provider Capabilities

Based on research of the `@muhlba91/pulumi-proxmoxve` provider documentation:

#### ISO and File Management

```typescript
// Use proxmoxve.Storage.File for ISO management
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';

const talosISO = new proxmoxve.storage.File('talos-iso', {
  contentType: 'iso',
  datastoreId: 'local',
  nodeName: config.nodeName,
  sourceFile: {
    path: 'https://factory.talos.dev/image/...',
    checksum: 'sha256:...', // Enable integrity checking
    fileName: 'talos-v1.10.4-custom.iso',
  },
  overwrite: false, // Prevent accidental overwrites
});
```

#### VM Template Management

```typescript
// Use proxmoxve.VM.VirtualMachine with template: true
const talosTemplate = new proxmoxve.vm.VirtualMachine('talos-template', {
  nodeName: config.nodeName,
  vmId: 9010,
  template: true, // Mark as template
  cdrom: {
    fileId: talosISO.id, // Reference the ISO
    interface: 'ide2',
  },
  tags: ['talos', 'template', 'v1.10.4'], // Version tracking
});
```

#### Resource State Checking

```typescript
// Use data sources for existence checking
import * as pulumi from "@pulumi/pulumi";

const existingVM = proxmoxve.vm.getVirtualMachine({
    nodeName: config.nodeName,
    vmId: templateId,
});

// Handle optional resources with apply()
const conditionalTemplate = existingVM.then(vm => {
    if (vm) {
        return vm;
    } else {
        return new proxmoxve.vm.VirtualMachine(...);
    }
});
```

#### Network Auto-Discovery

```typescript
// Use proxmoxve.Network.getHosts for bridge discovery
const networkInfo = proxmoxve.network.getHosts({
  nodeName: config.nodeName,
});

// Extract gateway and subnet from bridge configuration
const bridgeConfig = networkInfo.then((info) => ({
  gateway: info.gateway,
  subnet: info.subnet,
  bridge: info.bridge,
}));
```

### Error Handling Patterns

#### Resource Creation with Existence Checking

```typescript
async function createResourceSafely<T>(
  name: string,
  resourceFactory: () => T,
  existenceChecker: () => Promise<boolean>
): Promise<T> {
  try {
    const exists = await existenceChecker();
    if (exists && !config.forceRecreate) {
      logger.info(`Resource ${name} already exists, skipping`);
      return; // Return existing resource reference
    }
    return resourceFactory();
  } catch (error) {
    logger.error(`Failed to create ${name}:`, error);
    throw new ComponentResourceError(`${name} creation failed`, error);
  }
}
```

#### Retry with Exponential Backoff

```typescript
import { retry } from "@pulumi/pulumi";

const vmWithRetry = retry({
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
}, () => {
    return new proxmoxve.vm.VirtualMachine(...);
});
```

### Component Architecture Patterns

#### Resource Component Pattern

```typescript
export class TalosClusterComponent extends pulumi.ComponentResource {
  public readonly masters: proxmoxve.vm.VirtualMachine[];
  public readonly workers: proxmoxve.vm.VirtualMachine[];
  public readonly kubeconfig: pulumi.Output<string>;

  constructor(name: string, args: TalosClusterArgs, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:talos:Cluster', name, {}, opts);

    // Create ISO and templates first
    const iso = this.createISO(args);
    const template = this.createTemplate(args, iso);

    // Create VMs from template
    this.masters = this.createMasters(args, template);
    this.workers = this.createWorkers(args, template);

    // Bootstrap cluster
    const cluster = this.bootstrapCluster(args, this.masters, this.workers);
    this.kubeconfig = cluster.kubeconfig;

    this.registerOutputs({
      masters: this.masters,
      workers: this.workers,
      kubeconfig: this.kubeconfig,
    });
  }
}
```

### Testing Strategies

#### Mock Provider for Unit Tests

```typescript
// tests/mocks/proxmox-provider.ts
export class MockProxmoxProvider {
  static mockVirtualMachine(vmId: number) {
    return {
      id: pulumi.output(`${vmId}`),
      nodeName: pulumi.output('test-node'),
      ipv4Addresses: pulumi.output([['192.168.1.100']]),
      // ... other VM properties
    };
  }
}
```

#### Integration Test Environment

```typescript
// tests/integration/test-environment.ts
export class TestEnvironment {
  static async setup(): Promise<TestConfig> {
    return {
      proxmoxEndpoint: process.env.TEST_PROXMOX_ENDPOINT,
      testNodeName: 'test-node',
      testVmIdRange: [9900, 9999], // Safe test range
      cleanupAfterTest: true,
    };
  }
}
```

### Performance Optimization Techniques

#### Parallel Resource Creation

```typescript
// Create VMs in parallel where dependencies allow
const masterPromises = Array.from({ length: config.masters }, (_, i) => {
  return new proxmoxve.vm.VirtualMachine(`master-${i}`, {
    clone: { vmId: template.vmId },
    // ... other config
  });
});

const masters = await Promise.all(masterPromises);
```

#### Resource Dependency Optimization

```typescript
// Use explicit dependencies to optimize creation order
const template = new proxmoxve.vm.VirtualMachine("template", {...});

const vm = new proxmoxve.vm.VirtualMachine("vm", {
    clone: { vmId: template.vmId },
}, { dependsOn: [template] }); // Explicit dependency
```

### Security Best Practices

#### Secret Management with Pulumi ESC

```typescript
import * as pulumi from '@pulumi/pulumi';

const config = new pulumi.Config();
const proxmoxPassword = config.requireSecret('proxmox-password');

const provider = new proxmoxve.Provider('proxmox', {
  endpoint: config.require('proxmox-endpoint'),
  username: config.require('proxmox-username'),
  password: proxmoxPassword, // Handled as secret
});
```

#### Network Security Groups

```typescript
// Define security policies via Proxmox firewall rules
const securityRules = new proxmoxve.network.FirewallRules('cluster-security', {
  nodeName: config.nodeName,
  rules: [
    {
      type: 'in',
      action: 'ACCEPT',
      proto: 'tcp',
      dport: '6443', // Kubernetes API
      source: config.allowedCIDR,
    },
    // ... more rules
  ],
});
```

### Monitoring Integration

#### Prometheus Metrics Export

```typescript
// src/utils/metrics.ts
export class MetricsCollector {
  private static registry = new prometheus.Registry();

  static deploymentDuration = new prometheus.Histogram({
    name: 'infraflux_deployment_duration_seconds',
    help: 'Time spent on deployments',
    labelNames: ['component', 'status'],
    registers: [this.registry],
  });

  static resourceCreation = new prometheus.Counter({
    name: 'infraflux_resources_created_total',
    help: 'Total number of resources created',
    labelNames: ['type', 'provider'],
    registers: [this.registry],
  });
}
```

### Configuration Validation

#### Joi Schema with Pulumi Context

```typescript
// src/utils/config-validator.ts
export const TalosConfigSchema = Joi.object({
  cluster: Joi.object({
    name: Joi.string()
      .pattern(/^[a-z0-9-]+$/)
      .required(),
    masters: Joi.number().min(1).max(7).odd().required(),
    workers: Joi.number().min(0).max(50).required(),
  }),
  network: Joi.object({
    bridge: Joi.string().default('vmbr0'),
    gateway: Joi.string().ip().optional(), // Optional = auto-discover
    subnet: Joi.string()
      .pattern(/^(\d+\.){3}\d+\/\d+$/)
      .optional(),
  }),
  talos: Joi.object({
    version: Joi.string()
      .pattern(/^v\d+\.\d+\.\d+$/)
      .required(),
    schematicId: Joi.string().hex().length(64).required(),
  }),
});
```

This technical guidance should help implement each roadmap item following pure Pulumi best practices
while leveraging the full capabilities of the Proxmox VE provider.
