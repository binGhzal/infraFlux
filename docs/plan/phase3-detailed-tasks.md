# InfraFlux v2.0 - Phase 3 Detailed Task Breakdown

## Document Overview

**Version**: 1.0  
**Date**: 2025-06-20  
**Phase**: Phase 3 - Core Pulumi Implementation  
**Estimated Duration**: 15-21 hours across multiple sessions  

This document provides extremely granular task breakdown with acceptance criteria, testing requirements, and time estimates for Phase 3 implementation.

## Task Organization

### Priority Levels
- **P0**: Critical path items, must be completed first
- **P1**: High priority, blocks other tasks
- **P2**: Medium priority, can be done in parallel
- **P3**: Low priority, nice-to-have improvements

### Task States
- **Pending**: Not started
- **In Progress**: Currently working
- **Blocked**: Waiting for dependency
- **Review**: Ready for review/testing
- **Completed**: Fully implemented and tested

## Phase 3.1: Core Infrastructure Foundation (6-8 hours)

### T3.1.1: Proxmox Provider Configuration Component (P0)
**Duration**: 1.5 hours  
**Dependencies**: None  
**File**: `src/components/core/proxmox-provider.ts`

#### Subtasks:
1. **T3.1.1.1**: Create ProxmoxProviderConfig interface (15 min)
   - **Acceptance Criteria**:
     - Interface includes all required Proxmox connection parameters
     - Optional parameters have sensible defaults
     - TypeScript types are comprehensive and strict
   - **Testing**: Type-only, no runtime tests needed

2. **T3.1.1.2**: Implement ProxmoxProviderComponent class (30 min)
   - **Acceptance Criteria**:
     - Extends pulumi.ComponentResource
     - Creates proxmoxve.Provider instance
     - Handles authentication via token or username/password
     - Supports insecure SSL for development
   - **Testing**: Unit test with mocked provider creation

3. **T3.1.1.3**: Add connection validation utility (30 min)
   - **Acceptance Criteria**:
     - Function validates Proxmox API connectivity
     - Returns detailed error messages for connection failures
     - Supports timeout configuration
   - **Testing**: Unit test with mocked HTTP calls

4. **T3.1.1.4**: Environment variable integration (15 min)
   - **Acceptance Criteria**:
     - Reads PROXMOX_* environment variables
     - Falls back to Pulumi config if env vars not set
     - Validates required variables are present
   - **Testing**: Unit test with different env var scenarios

#### Implementation Notes:
```typescript
// Required environment variables:
// PROXMOX_VE_ENDPOINT, PROXMOX_VE_USERNAME, PROXMOX_VE_PASSWORD or PROXMOX_VE_API_TOKEN
```

### T3.1.2: Network Infrastructure Component (P0)
**Duration**: 2.5 hours  
**Dependencies**: T3.1.1 (Proxmox Provider)  
**File**: `src/components/network/network-component.ts`

#### Subtasks:
1. **T3.1.2.1**: Update network configuration schemas (20 min)
   - **Acceptance Criteria**:
     - BridgeConfig interface supports all required properties
     - VLANConfig includes proper validation
     - FirewallConfig covers basic security rules
   - **Testing**: Joi schema validation tests

2. **T3.1.2.2**: Implement bridge creation logic (45 min)
   - **Acceptance Criteria**:
     - Creates Proxmox network bridges
     - Supports VLAN-aware bridges
     - Configures MTU and STP settings
   - **Testing**: Unit test with mocked Proxmox calls

3. **T3.1.2.3**: Implement VLAN configuration (45 min)
   - **Acceptance Criteria**:
     - Creates VLAN interfaces on bridges
     - Assigns VLAN IDs correctly
     - Supports IP range allocation per VLAN
   - **Testing**: Integration test with bridge component

4. **T3.1.2.4**: Basic firewall rules implementation (30 min)
   - **Acceptance Criteria**:
     - Creates Proxmox firewall rules
     - Supports allow/deny rules
     - Handles source/destination IP filtering
   - **Testing**: Unit test with rule validation

5. **T3.1.2.5**: IP address allocation utility (15 min)
   - **Acceptance Criteria**:
     - Tracks allocated IP addresses per network
     - Prevents IP conflicts
     - Supports both DHCP and static allocation
   - **Testing**: Unit test with IP range scenarios

#### Implementation Notes:
```bash
# Proxmox CLI commands for reference:
# pvesh create /nodes/{node}/network -iface vmbr1 -type bridge
# pvesh create /cluster/firewall/groups -group k8s-nodes
```

### T3.1.3: VM Template Management Component (P0)
**Duration**: 2.5 hours  
**Dependencies**: T3.1.1 (Proxmox Provider), T3.1.2 (Network)  
**File**: `src/components/storage/vm-template.ts`

#### Subtasks:
1. **T3.1.3.1**: Talos Image Factory integration utility (45 min)
   - **Acceptance Criteria**:
     - Posts schematic to factory.talos.dev/schematics
     - Retrieves schematic ID from response
     - Constructs image download URL
     - Handles API errors gracefully
   - **Testing**: Unit test with mocked HTTP calls
   - **Implementation**: Use node-fetch for HTTP requests

2. **T3.1.3.2**: Image download to Proxmox datastore (30 min) ✅ **COMPLETED**
   - **Acceptance Criteria**:
     - Uses proxmoxve.DownloadFile resource ✅ (implemented with `proxmoxve.download.File`)
     - Downloads compressed Talos images ✅ (from Talos Image Factory URLs)
     - Decompresses .gz files automatically ✅ (decompressionAlgorithm: "gz")
     - Validates downloaded file integrity ✅ (optional checksum verification)
   - **Testing**: Integration test with small test image ✅
   - **Implementation**: `downloadImageToProxmox()` method with proper resource dependencies

3. **T3.1.3.3**: Base VM creation from image (45 min) ✅ **COMPLETED**
   - **Acceptance Criteria**:
     - Creates VM with minimal specs ✅ (2 cores, 2GB RAM, 8GB disk)
     - Attaches downloaded image as primary disk ✅ (using fileId from downloaded image)
     - Configures basic hardware (CPU, memory, network) ✅ (virtio drivers, vmbr0 bridge)
     - Uses cloud-init for initial setup ✅ (prepared for Talos bootstrap)
   - **Testing**: Integration test creating actual VM ✅
   - **Implementation**: `createBaseVMFromImage()` method with `proxmoxve.vm.VirtualMachine` resource

4. **T3.1.3.4**: Template conversion logic (30 min)
   - **Acceptance Criteria**:
     - Converts VM to template using Proxmox API
     - Template is read-only and clonable
     - Removes VM-specific configurations
     - Updates template metadata
   - **Testing**: Integration test with template creation

5. **T3.1.3.5**: Template lifecycle management (15 min)
   - **Acceptance Criteria**:
     - Supports template updates
     - Handles template deletion
     - Tracks template usage
   - **Testing**: Unit test with lifecycle scenarios

#### Implementation Notes:
```typescript
// Talos schematic example:
const schematic = {
  customization: {
    systemExtensions: {
      officialExtensions: [
        "siderolabs/i915-ucode",
        "siderolabs/intel-ucode", 
        "siderolabs/qemu-guest-agent"
      ]
    }
  }
};
```

### T3.1.4: Basic VM Component Implementation (P1)
**Duration**: 1.5 hours  
**Dependencies**: T3.1.3 (VM Template)  
**File**: `src/components/compute/vm-component.ts`

#### Subtasks:
1. **T3.1.4.1**: VM configuration schema updates (15 min)
   - **Acceptance Criteria**:
     - VMComponentProps includes all required properties
     - NodeConfig supports template-based creation
     - Resource specifications are properly typed
   - **Testing**: Type validation tests

2. **T3.1.4.2**: Basic VM provisioning logic (45 min)
   - **Acceptance Criteria**:
     - Clones VM from template
     - Applies CPU and memory specifications
     - Configures primary disk
     - Sets VM name and description
   - **Testing**: Integration test with template

3. **T3.1.4.3**: Network interface configuration (30 min)
   - **Acceptance Criteria**:
     - Attaches VM to correct bridge/VLAN
     - Configures virtio network adapters
     - Supports multiple network interfaces
   - **Testing**: Unit test with network scenarios

4. **T3.1.4.4**: VM lifecycle operations (20 min)
   - **Acceptance Criteria**:
     - Supports start/stop/restart operations
     - Monitors VM status
     - Handles state transitions gracefully
   - **Testing**: Integration test with VM operations

#### Implementation Notes:
```typescript
// VM cloning from template:
clone: {
  vmId: props.templateId,
  full: true,
  target: props.nodeConfig.proxmoxNode
}
```

## Phase 3.2: Advanced VM Management (4-5 hours)

### T3.2.1: Cloud-Init Integration (P1)
**Duration**: 1.5 hours  
**Dependencies**: T3.1.4 (Basic VM Component)  
**File**: Enhanced `src/components/compute/vm-component.ts`

#### Subtasks:
1. **T3.2.1.1**: Cloud-init configuration schema (20 min)
   - **Acceptance Criteria**:
     - CloudInitConfig interface covers all use cases
     - Supports user data, meta data, network config
     - Validates SSH key formats
   - **Testing**: Schema validation tests

2. **T3.2.1.2**: Dynamic cloud-init generation (45 min)
   - **Acceptance Criteria**:
     - Generates user-data with SSH keys
     - Creates network configuration for static IPs
     - Includes hostname and domain settings
     - Supports custom user data scripts
   - **Testing**: Unit test with different scenarios

3. **T3.2.1.3**: Cloud-init integration with Proxmox (25 min)
   - **Acceptance Criteria**:
     - Attaches cloud-init ISO to VM
     - Configures VM to use cloud-init
     - Validates cloud-init execution
   - **Testing**: Integration test with VM boot

#### Implementation Notes:
```yaml
# Example cloud-init user-data:
#cloud-config
hostname: k8s-node-1
fqdn: k8s-node-1.homelab.local
users:
  - name: talos
    ssh_authorized_keys:
      - ssh-rsa AAAAB3NzaC1yc2E...
```

### T3.2.2: VM Monitoring and Health Checks (P2)
**Duration**: 1 hour  
**Dependencies**: T3.2.1 (Cloud-Init)  
**File**: `src/utils/vm-health-monitor.ts`

#### Subtasks:
1. **T3.2.2.1**: QEMU guest agent integration (30 min)
   - **Acceptance Criteria**:
     - Queries VM status via guest agent
     - Retrieves IP addresses and network info
     - Monitors disk usage and performance
   - **Testing**: Integration test with running VM

2. **T3.2.2.2**: Health check automation (30 min)
   - **Acceptance Criteria**:
     - Periodic health checks for all VMs
     - Alerts on VM failures or issues
     - Supports custom health check scripts
   - **Testing**: Unit test with health scenarios

### T3.2.3: Resource Optimization (P2)
**Duration**: 1.5 hours  
**Dependencies**: T3.2.1 (Cloud-Init)  
**File**: `src/utils/resource-optimizer.ts`

#### Subtasks:
1. **T3.2.3.1**: Load balancing across Proxmox nodes (45 min)
   - **Acceptance Criteria**:
     - Distributes VMs across available nodes
     - Considers node resource capacity
     - Avoids over-allocation of resources
   - **Testing**: Unit test with multi-node scenarios

2. **T3.2.3.2**: Resource constraint validation (30 min)
   - **Acceptance Criteria**:
     - Validates resource requests against available capacity
     - Prevents over-subscription of CPU/memory
     - Provides clear error messages for constraints
   - **Testing**: Unit test with resource limit scenarios

3. **T3.2.3.3**: Performance optimization settings (15 min)
   - **Acceptance Criteria**:
     - Configures CPU topology for performance
     - Optimizes disk I/O settings
     - Sets appropriate network buffer sizes
   - **Testing**: Performance benchmark tests

### T3.2.4: Enhanced Error Handling (P1)
**Duration**: 1 hour  
**Dependencies**: All T3.2 tasks  
**File**: `src/utils/error-handler.ts`

#### Subtasks:
1. **T3.2.4.1**: Comprehensive error categorization (20 min)
   - **Acceptance Criteria**:
     - Defines all error categories
     - Maps errors to appropriate categories
     - Provides actionable error messages
   - **Testing**: Unit test with error scenarios

2. **T3.2.4.2**: Retry logic with exponential backoff (25 min)
   - **Acceptance Criteria**:
     - Retries transient failures automatically
     - Uses exponential backoff for rate limiting
     - Limits maximum retry attempts
   - **Testing**: Unit test with retry scenarios

3. **T3.2.4.3**: Error reporting and logging (15 min)
   - **Acceptance Criteria**:
     - Logs errors with appropriate severity
     - Includes context and stack traces
     - Supports structured logging
   - **Testing**: Unit test with logging validation

## Phase 3.3: Kubernetes Cluster Integration (5-6 hours)

### T3.3.1: Talos Machine Configuration (P0)
**Duration**: 2 hours  
**Dependencies**: T3.2 (VM Management)  
**File**: `src/components/kubernetes/talos-cluster.ts`

#### Subtasks:
1. **T3.3.1.1**: Talos configuration schema (30 min)
   - **Acceptance Criteria**:
     - TalosMachineConfig covers all required settings
     - Supports control plane and worker configurations
     - Includes networking and security settings
   - **Testing**: Schema validation tests

2. **T3.3.1.2**: Cluster secrets generation (45 min)
   - **Acceptance Criteria**:
     - Generates cluster CA certificate
     - Creates bootstrap tokens with TTL
     - Generates service account keys
     - Encrypts secrets appropriately
   - **Testing**: Unit test with secret validation

3. **T3.3.1.3**: Machine config template generation (45 min)
   - **Acceptance Criteria**:
     - Generates machine configs for each node type
     - Includes node-specific network settings
     - Configures kubelet and etcd settings
   - **Testing**: Unit test with config validation

#### Implementation Notes:
```yaml
# Talos machine config example:
version: v1alpha1
machine:
  type: controlplane
  token: wlzjyw.bei2zfylhs2by0wd
  ca:
    crt: LS0tLS1CRUdJTi...
```

### T3.3.2: Control Plane Bootstrap (P0)
**Duration**: 1.5 hours  
**Dependencies**: T3.3.1 (Machine Configuration)  
**File**: Enhanced `src/components/kubernetes/talos-cluster.ts`

#### Subtasks:
1. **T3.3.2.1**: First control plane node initialization (45 min)
   - **Acceptance Criteria**:
     - Applies machine config to first node
     - Bootstraps etcd cluster
     - Starts Kubernetes API server
     - Waits for node to be ready
   - **Testing**: Integration test with single node

2. **T3.3.2.2**: Additional control plane nodes (30 min)
   - **Acceptance Criteria**:
     - Joins additional nodes to etcd cluster
     - Configures multi-node control plane
     - Ensures leader election works
   - **Testing**: Integration test with 3-node cluster

3. **T3.3.2.3**: Control plane health validation (15 min)
   - **Acceptance Criteria**:
     - Validates all control plane components are running
     - Checks etcd cluster health
     - Verifies API server accessibility
   - **Testing**: Unit test with health checks

### T3.3.3: Worker Node Management (P1)
**Duration**: 1 hour  
**Dependencies**: T3.3.2 (Control Plane)  
**File**: Enhanced `src/components/kubernetes/talos-cluster.ts`

#### Subtasks:
1. **T3.3.3.1**: Worker node joining (40 min)
   - **Acceptance Criteria**:
     - Applies worker machine configs
     - Joins nodes to cluster
     - Configures kubelet settings
     - Validates node readiness
   - **Testing**: Integration test with worker nodes

2. **T3.3.3.2**: Node labeling and taints (20 min)
   - **Acceptance Criteria**:
     - Applies appropriate node labels
     - Sets up node taints if required
     - Configures node roles
   - **Testing**: Unit test with label validation

### T3.3.4: Cluster Networking Setup (P1)
**Duration**: 1.5 hours  
**Dependencies**: T3.3.3 (Worker Nodes)  
**File**: `src/components/kubernetes/cni-config.ts`

#### Subtasks:
1. **T3.3.4.1**: CNI configuration (45 min)
   - **Acceptance Criteria**:
     - Configures Cilium CNI
     - Sets pod and service subnets
     - Enables network policies
   - **Testing**: Integration test with pod networking

2. **T3.3.4.2**: Service networking (30 min)
   - **Acceptance Criteria**:
     - Configures kube-proxy
     - Sets up service discovery
     - Validates service connectivity
   - **Testing**: Integration test with service creation

3. **T3.3.4.3**: Network policy defaults (15 min)
   - **Acceptance Criteria**:
     - Applies default network policies
     - Restricts cross-namespace traffic
     - Allows required system traffic
   - **Testing**: Unit test with policy validation

## Phase 3.4: Integration and Testing (3-4 hours)

### T3.4.1: HomeLabStack Integration (P0)
**Duration**: 1.5 hours  
**Dependencies**: All Phase 3.3 tasks  
**File**: `src/stacks/homelab-stack.ts`

#### Subtasks:
1. **T3.4.1.1**: Component orchestration (45 min)
   - **Acceptance Criteria**:
     - Instantiates all components in correct order
     - Passes outputs between components
     - Handles component dependencies
   - **Testing**: Integration test with full stack

2. **T3.4.1.2**: Configuration management (30 min)
   - **Acceptance Criteria**:
     - Validates global configuration
     - Applies environment-specific overrides
     - Handles secret management
   - **Testing**: Unit test with different environments

3. **T3.4.1.3**: Stack outputs (15 min)
   - **Acceptance Criteria**:
     - Exports all important resource outputs
     - Provides kubeconfig for cluster access
     - Includes connection information
   - **Testing**: Unit test with output validation

### T3.4.2: End-to-End Testing (P1)
**Duration**: 1.5 hours  
**Dependencies**: T3.4.1 (Stack Integration)  
**File**: `tests/e2e/full-deployment.test.ts`

#### Subtasks:
1. **T3.4.2.1**: Complete deployment test (60 min)
   - **Acceptance Criteria**:
     - Deploys full infrastructure from scratch
     - Validates all components are working
     - Tests cluster functionality
   - **Testing**: E2E test with real Proxmox environment

2. **T3.4.2.2**: Cleanup and teardown test (30 min)
   - **Acceptance Criteria**:
     - Properly destroys all resources
     - Validates complete cleanup
     - Tests idempotency
   - **Testing**: E2E test with resource cleanup

### T3.4.3: Performance Validation (P2)
**Duration**: 1 hour  
**Dependencies**: T3.4.2 (E2E Testing)  
**File**: `tests/performance/deployment-performance.test.ts`

#### Subtasks:
1. **T3.4.3.1**: Deployment time benchmarks (30 min)
   - **Acceptance Criteria**:
     - Measures deployment time for different configurations
     - Validates performance is acceptable
     - Identifies bottlenecks
   - **Testing**: Performance test with timing

2. **T3.4.3.2**: Resource usage validation (30 min)
   - **Acceptance Criteria**:
     - Monitors resource usage during deployment
     - Validates memory and CPU consumption
     - Checks for resource leaks
   - **Testing**: Performance test with monitoring

## Continuous Activities

### Code Quality and Standards
- **Linting**: ESLint rules enforced on every file
- **Formatting**: Prettier applied to all TypeScript files
- **Type Checking**: Strict TypeScript compilation
- **Testing**: Minimum 80% code coverage required

### Documentation Requirements
- **Code Comments**: All public APIs documented with JSDoc
- **README Updates**: Keep README current with implementation
- **API Documentation**: Generate TypeScript API docs
- **Examples**: Provide working examples for each component

### Git Workflow
- **Commit Frequency**: Commit after each completed subtask
- **Commit Messages**: Follow conventional commit format
- **Branch Strategy**: Feature branches for major components
- **Pull Requests**: Required for all changes

### MCP Tool Integration
- **Research**: Use `context7` for technical documentation
- **Validation**: Use `vibe-check` for complex decisions
- **Analysis**: Use `consult7` for codebase understanding
- **Memory**: Use `memory-plus` to record progress and decisions

## Success Metrics

### Functional Requirements
- [ ] Single `pulumi up` deploys complete infrastructure
- [ ] All VMs boot successfully from Talos templates
- [ ] Kubernetes cluster is fully functional
- [ ] Network connectivity works end-to-end
- [ ] All tests pass (unit, integration, e2e)

### Quality Requirements
- [ ] 80%+ code coverage across all components
- [ ] Zero ESLint errors or warnings
- [ ] All TypeScript compilation without errors
- [ ] Performance within acceptable limits (< 30 min deployment)
- [ ] Comprehensive error handling with actionable messages

### Documentation Requirements
- [ ] All public APIs documented
- [ ] Installation and setup guide complete
- [ ] Troubleshooting guide covers common issues
- [ ] Architecture documentation up to date
- [ ] Examples work without modification

## Risk Mitigation

### Technical Risks
1. **Proxmox API Changes**: Pin provider version, test with multiple Proxmox versions
2. **Talos Image Factory Issues**: Implement caching, fallback to local images
3. **Network Configuration Complexity**: Start simple, add complexity incrementally
4. **Resource Constraints**: Implement proper validation and error handling

### Schedule Risks
1. **Underestimated Complexity**: Break tasks into smaller units, track progress closely
2. **Integration Issues**: Test components early and often
3. **Documentation Lag**: Write docs alongside implementation
4. **Testing Gaps**: Implement tests before features, not after

---

**Total Estimated Time**: 15-21 hours  
**Critical Path**: T3.1.1 → T3.1.2 → T3.1.3 → T3.1.4 → T3.3.1 → T3.3.2 → T3.4.1  
**Parallel Tracks**: Network and VM components can be developed in parallel after T3.1.1  
**Review Points**: After each phase, before moving to next phase  

This task breakdown provides the granular detail requested while maintaining clear dependencies and measurable acceptance criteria for each subtask.