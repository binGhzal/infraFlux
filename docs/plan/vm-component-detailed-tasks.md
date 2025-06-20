# VM Component Ultra-Granular Task Breakdown
**InfraFlux v2.0 - Task T3.1.4 Detailed Implementation Plan**

## Document Overview

**Version**: 1.0  
**Date**: 2025-06-20  
**Component**: VM Component (T3.1.4)  
**Total Estimated Duration**: 2.5 hours  
**Dependencies**: VM Template Component (T3.1.3 ✅), Network Component (T3.1.2 ✅), Proxmox Provider (T3.1.1 ✅)  

## Task Organization

### Priority Levels
- **P0**: Critical path items, must be completed first
- **P1**: High priority, blocks subsequent tasks
- **P2**: Medium priority, can be done in parallel
- **P3**: Low priority, enhancement features

### Task States
- **Pending**: Not started ⏸️
- **In Progress**: Currently working 🔄
- **Review**: Ready for testing/validation ✅
- **Completed**: Fully implemented and tested ✅
- **Blocked**: Waiting for dependency 🚫

## Phase T3.1.4: VM Component Implementation (2.5 hours)

### T3.1.4.1: VM Configuration Schema Enhancement (P0) - 20 minutes
**Dependencies**: None  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.1.1: Update VMComponentProps interface (5 min) ⏸️
- **Acceptance Criteria**:
  - Template parameter supports both VMTemplateComponent and string
  - NetworkComponent parameter added as optional
  - CloudInit, lifecycle, cloneOptions parameters included
  - Optimization and monitoring configurations defined
- **Implementation**:
  ```typescript
  export interface VMComponentProps extends ComponentProps {
    nodeConfig: NodeConfig;
    proxmoxProvider: proxmoxve.Provider;
    proxmoxNode: string;
    template: VMTemplateComponent | string;
    networkComponent?: NetworkComponent;
    cloudInit?: CloudInitConfig;
    lifecycle?: VMLifecycleOptions;
    cloneOptions?: CloneOptions;
    optimization?: VMOptimizationConfig;
    monitoring?: VMMonitoringConfig;
  }
  ```
- **Testing**: Type validation, interface completeness check

##### T3.1.4.1.2: Create CloudInitConfig interface (5 min) ⏸️
- **Acceptance Criteria**:
  - Supports user data in cloud-config YAML format
  - Network configuration for static IPs
  - SSH key management for secure access
  - User account creation and configuration
  - Package installation and command execution
  - File writing with permissions and ownership
- **Implementation**:
  ```typescript
  export interface CloudInitConfig {
    userData?: string;
    networkConfig?: string;
    sshKeys?: string[];
    user?: {
      name: string;
      password?: string;
      sudo?: boolean;
    };
    packages?: string[];
    runCmd?: string[];
    writeFiles?: Array<{
      path: string;
      content: string;
      permissions?: string;
      owner?: string;
    }>;
  }
  ```
- **Testing**: Schema validation, YAML generation test

##### T3.1.4.1.3: Create VMLifecycleOptions interface (5 min) ⏸️
- **Acceptance Criteria**:
  - Boot configuration (onBoot, startAfterCreate)
  - Protection from accidental deletion
  - Startup order and timing delays
  - Automatic restart on failure
  - Shutdown timeout configuration
- **Implementation**:
  ```typescript
  export interface VMLifecycleOptions {
    onBoot?: boolean;
    startAfterCreate?: boolean;
    protection?: boolean;
    startup?: {
      order?: number;
      up?: number;
      down?: number;
    };
    autoRestart?: boolean;
    shutdownTimeout?: number;
  }
  ```
- **Testing**: Default value validation, lifecycle scenario testing

##### T3.1.4.1.4: Create VMOptimizationConfig interface (5 min) ⏸️
- **Acceptance Criteria**:
  - CPU topology and NUMA configuration
  - Memory ballooning and hugepages support
  - Disk cache and I/O thread optimization
  - Network multiqueue and rate limiting
- **Implementation**:
  ```typescript
  export interface VMOptimizationConfig {
    cpuTopology?: {
      numa?: boolean;
      cpuUnits?: number;
      cpuLimit?: number;
    };
    memory?: {
      ballooning?: boolean;
      hugepages?: boolean;
      swappiness?: number;
    };
    disk?: {
      cache?: 'none' | 'writethrough' | 'writeback';
      ioThread?: boolean;
      backup?: boolean;
      discard?: boolean;
    };
    network?: {
      multiqueue?: boolean;
      packetBuffer?: number;
      rateLimiting?: {
        mbps?: number;
      };
    };
  }
  ```
- **Testing**: Performance setting validation, compatibility checks

### T3.1.4.2: Template Resolution and VM Cloning (P0) - 45 minutes
**Dependencies**: T3.1.4.1  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.2.1: Template reference resolution (15 min) ⏸️
- **Acceptance Criteria**:
  - Resolves VMTemplateComponent object references
  - Supports string template names with lookup
  - Validates template exists and is ready
  - Extracts template ID and metadata
- **Sub-sub-tasks**:
  1. **T3.1.4.2.1.1**: Create template resolution method (8 min)
     - Implement `resolveTemplate()` method
     - Handle both component and string inputs
     - Return consistent TemplateInfo output
  2. **T3.1.4.2.1.2**: Template validation logic (4 min)
     - Check template ready status
     - Validate template compatibility
     - Ensure template accessibility on target node
  3. **T3.1.4.2.1.3**: Error handling for template issues (3 min)
     - Handle template not found errors
     - Deal with template not ready scenarios
     - Provide clear error messages
- **Implementation Pattern**:
  ```typescript
  private resolveTemplate(template: VMTemplateComponent | string): pulumi.Output<TemplateInfo> {
    if (typeof template === 'string') {
      return this.lookupTemplateByName(template);
    } else {
      return template.getTemplateInfo().apply(info => {
        this.validateTemplateReadiness(info);
        return info;
      });
    }
  }
  ```
- **Testing**: Template resolution with both input types, error scenarios

##### T3.1.4.2.2: VM ID generation and uniqueness (10 min) ⏸️
- **Acceptance Criteria**:
  - Generates unique VM ID for new VMs
  - Checks ID conflicts across Proxmox cluster
  - Supports manual ID specification
  - Implements retry logic for ID conflicts
- **Sub-sub-tasks**:
  1. **T3.1.4.2.2.1**: ID generation algorithm (4 min)
     - Implement deterministic ID generation
     - Use node name and role for consistent IDs
     - Ensure IDs are within valid range (100-999999)
  2. **T3.1.4.2.2.2**: Conflict detection and resolution (4 min)
     - Check existing VM IDs via Proxmox API
     - Implement retry with incremental IDs
     - Handle race conditions between concurrent deployments
  3. **T3.1.4.2.2.3**: Manual ID override support (2 min)
     - Accept manual ID specification in props
     - Validate manual IDs for conflicts
     - Prefer manual IDs over generated ones
- **Implementation Pattern**:
  ```typescript
  private async generateUniqueVMId(nodeName: string, manualId?: number): Promise<number> {
    if (manualId) {
      await this.validateVMIdAvailable(manualId);
      return manualId;
    }
    
    let id = this.generateBaseId(nodeName);
    while (await this.isVMIdInUse(id)) {
      id++;
    }
    return id;
  }
  ```
- **Testing**: ID uniqueness across multiple VMs, conflict resolution, manual override

##### T3.1.4.2.3: VM cloning implementation (20 min) ⏸️
- **Acceptance Criteria**:
  - Uses proxmoxve.vm.VirtualMachine with clone parameter
  - Supports full and linked clones
  - Handles cross-node cloning
  - Applies target storage configuration
- **Sub-sub-tasks**:
  1. **T3.1.4.2.3.1**: Clone configuration setup (8 min)
     - Configure clone parameter with template VMID
     - Set full vs linked clone based on CloneOptions
     - Specify target node and storage
     - Handle cross-node clone scenarios
  2. **T3.1.4.2.3.2**: VM resource creation (8 min)
     - Create proxmoxve.vm.VirtualMachine resource
     - Apply clone configuration
     - Set proper resource dependencies
     - Configure resource naming
  3. **T3.1.4.2.3.3**: Clone verification and status (4 min)
     - Verify clone operation success
     - Monitor clone progress
     - Handle clone failures gracefully
     - Update VM status tracking
- **Implementation Pattern**:
  ```typescript
  private createVMFromTemplate(
    vmId: number,
    templateInfo: TemplateInfo,
    cloneOptions: CloneOptions
  ): proxmoxve.vm.VirtualMachine {
    return new proxmoxve.vm.VirtualMachine(
      `${this.props.nodeConfig.name}-vm`,
      {
        nodeName: this.props.proxmoxNode,
        vmId: vmId,
        name: this.props.nodeConfig.name,
        clone: {
          vmId: templateInfo.id,
          full: cloneOptions.full ?? true,
          target: this.props.proxmoxNode,
        },
        // Additional configuration will be applied in subsequent tasks
      },
      {
        provider: this.props.proxmoxProvider,
        parent: this,
      }
    );
  }
  ```
- **Testing**: Clone creation, full vs linked clones, cross-node scenarios

### T3.1.4.3: Resource Specification Application (P0) - 35 minutes
**Dependencies**: T3.1.4.2  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.3.1: CPU configuration (10 min) ⏸️
- **Acceptance Criteria**:
  - Applies cores and sockets from NodeConfig
  - Configures CPU type and features
  - Sets CPU units and limits
  - Applies NUMA topology if enabled
- **Sub-sub-tasks**:
  1. **T3.1.4.3.1.1**: Basic CPU configuration (4 min)
     - Set cores from NodeConfig.specs.cores
     - Configure sockets (default to 1)
     - Set CPU type (host for best performance)
  2. **T3.1.4.3.1.2**: Advanced CPU features (4 min)
     - Apply CPU units for proportional scheduling
     - Set CPU limits if specified
     - Configure CPU flags and features
  3. **T3.1.4.3.1.3**: NUMA topology optimization (2 min)
     - Enable NUMA if optimization configured
     - Configure NUMA nodes based on cores
     - Apply CPU affinity settings
- **Implementation Pattern**:
  ```typescript
  private applyCPUConfig(nodeSpecs: NodeSpecs, optimization?: VMOptimizationConfig) {
    return {
      cores: nodeSpecs.cores,
      sockets: 1,
      type: 'host',
      units: optimization?.cpuTopology?.cpuUnits || 1024,
      numa: optimization?.cpuTopology?.numa || false,
      limit: optimization?.cpuTopology?.cpuLimit,
    };
  }
  ```
- **Testing**: CPU configuration validation, NUMA settings, performance limits

##### T3.1.4.3.2: Memory configuration (10 min) ⏸️
- **Acceptance Criteria**:
  - Sets dedicated memory from NodeConfig
  - Configures memory ballooning if enabled
  - Applies hugepages configuration
  - Sets memory limits and reservations
- **Sub-sub-tasks**:
  1. **T3.1.4.3.2.1**: Basic memory allocation (4 min)
     - Set dedicated memory from NodeConfig.specs.memory
     - Configure memory in MB format
     - Apply memory reservations
  2. **T3.1.4.3.2.2**: Memory optimization features (4 min)
     - Enable memory ballooning for dynamic allocation
     - Configure hugepages for performance
     - Set memory limits and shares
  3. **T3.1.4.3.2.3**: Memory validation (2 min)
     - Validate memory doesn't exceed node capacity
     - Check memory alignment requirements
     - Ensure minimum memory requirements met
- **Implementation Pattern**:
  ```typescript
  private applyMemoryConfig(nodeSpecs: NodeSpecs, optimization?: VMOptimizationConfig) {
    return {
      dedicated: nodeSpecs.memory,
      balloon: optimization?.memory?.ballooning ? 
        Math.floor(nodeSpecs.memory * 0.8) : undefined,
      hugepages: optimization?.memory?.hugepages ? 'any' : undefined,
    };
  }
  ```
- **Testing**: Memory allocation, ballooning behavior, hugepages configuration

##### T3.1.4.3.3: Disk configuration (15 min) ⏸️
- **Acceptance Criteria**:
  - Creates disks based on NodeConfig.specs.disk
  - Applies disk format, cache, and I/O settings
  - Configures backup and replication settings
  - Sets disk size and storage location
- **Sub-sub-tasks**:
  1. **T3.1.4.3.3.1**: Primary disk configuration (6 min)
     - Configure boot disk from template
     - Apply disk size from NodeConfig
     - Set storage location and format
  2. **T3.1.4.3.3.2**: Additional disk creation (6 min)
     - Create additional disks per NodeConfig
     - Apply different disk interfaces (scsi, virtio)
     - Configure disk-specific settings
  3. **T3.1.4.3.3.3**: Disk optimization and features (3 min)
     - Apply cache settings for performance
     - Enable I/O threads if optimized
     - Configure backup and replication
     - Enable discard for thin provisioning
- **Implementation Pattern**:
  ```typescript
  private applyDiskConfig(nodeSpecs: NodeSpecs, optimization?: VMOptimizationConfig) {
    return nodeSpecs.disk.map((diskConfig, index) => ({
      interface: `scsi${index}`,
      datastoreId: diskConfig.storage || this.props.datastore,
      size: parseInt(diskConfig.size),
      fileFormat: diskConfig.format,
      cache: optimization?.disk?.cache || diskConfig.cache,
      ioThread: optimization?.disk?.ioThread || false,
      backup: optimization?.disk?.backup ?? diskConfig.backup,
      discard: optimization?.disk?.discard || false,
    }));
  }
  ```
- **Testing**: Multiple disk configurations, optimization settings, storage validation

### T3.1.4.4: Network Interface Configuration (P1) - 40 minutes
**Dependencies**: T3.1.4.3, Network Component  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.4.1: Network interface creation (15 min) ⏸️
- **Acceptance Criteria**:
  - Creates network devices based on NodeConfig.specs.network
  - Applies bridge and VLAN configuration
  - Sets network adapter model (virtio)
  - Configures MAC address handling
- **Sub-sub-tasks**:
  1. **T3.1.4.4.1.1**: Basic interface configuration (6 min)
     - Create network devices from NetworkInterface specs
     - Set bridge names and models
     - Configure adapter type (virtio for performance)
  2. **T3.1.4.4.1.2**: VLAN and bridge association (5 min)
     - Apply VLAN tags from NetworkInterface config
     - Associate with correct bridges
     - Validate bridge exists and is accessible
  3. **T3.1.4.4.1.3**: MAC address management (4 min)
     - Generate or assign MAC addresses
     - Ensure MAC uniqueness across cluster
     - Support manual MAC specification
- **Implementation Pattern**:
  ```typescript
  private createNetworkDevices(networkSpecs: NetworkInterface[]): NetworkDevice[] {
    return networkSpecs.map((spec, index) => ({
      bridge: spec.bridge,
      model: 'virtio',
      tag: spec.vlan,
      macAddress: spec.mac || this.generateMACAddress(),
      firewall: true,
    }));
  }
  ```
- **Testing**: Network device creation, VLAN tagging, MAC address handling

##### T3.1.4.4.2: IP allocation integration (15 min) ⏸️
- **Acceptance Criteria**:
  - Integrates with NetworkComponent for IP allocation
  - Supports both DHCP and static IP assignment
  - Handles IP allocation failures gracefully
  - Updates network configuration in VM
- **Sub-sub-tasks**:
  1. **T3.1.4.4.2.1**: NetworkComponent integration (6 min)
     - Call NetworkComponent.allocateIP() for static IPs
     - Handle IP allocation per VLAN
     - Track allocated IPs for cleanup
  2. **T3.1.4.4.2.2**: DHCP vs static IP handling (5 min)
     - Configure DHCP for dynamic allocation
     - Set static IPs via cloud-init for fixed addresses
     - Support mixed DHCP/static configurations
  3. **T3.1.4.4.2.3**: IP allocation error handling (4 min)
     - Handle IP exhaustion gracefully
     - Retry allocation with backoff
     - Clean up partial allocations on failure
- **Implementation Pattern**:
  ```typescript
  private async allocateNetworkIPs(
    networkSpecs: NetworkInterface[],
    networkComponent?: NetworkComponent
  ): Promise<NetworkConfiguration[]> {
    const configs: NetworkConfiguration[] = [];
    
    for (const spec of networkSpecs) {
      if (spec.dhcp) {
        configs.push({ type: 'dhcp', bridge: spec.bridge, vlan: spec.vlan });
      } else {
        const ip = await networkComponent?.allocateIP(spec.vlan, spec.ip);
        if (!ip) throw new Error(`IP allocation failed for VLAN ${spec.vlan}`);
        configs.push({ 
          type: 'static', 
          bridge: spec.bridge, 
          vlan: spec.vlan, 
          ip: ip,
          gateway: spec.gateway 
        });
      }
    }
    
    return configs;
  }
  ```
- **Testing**: IP allocation success/failure, DHCP/static scenarios, cleanup on error

##### T3.1.4.4.3: Advanced network features (10 min) ⏸️
- **Acceptance Criteria**:
  - Configures network firewall if enabled
  - Applies traffic shaping and rate limiting
  - Sets up multiqueue networking
  - Configures VLAN priorities
- **Sub-sub-tasks**:
  1. **T3.1.4.4.3.1**: Firewall configuration (4 min)
     - Enable/disable network firewall per interface
     - Apply basic security rules
     - Configure port restrictions
  2. **T3.1.4.4.3.2**: Performance optimization (4 min)
     - Enable multiqueue for high throughput
     - Configure packet buffer sizes
     - Apply rate limiting if specified
  3. **T3.1.4.4.3.3**: QoS and priorities (2 min)
     - Set VLAN priorities for traffic shaping
     - Configure bandwidth allocation
     - Apply QoS policies
- **Implementation Pattern**:
  ```typescript
  private applyNetworkOptimization(
    devices: NetworkDevice[],
    optimization?: VMOptimizationConfig
  ): NetworkDevice[] {
    return devices.map(device => ({
      ...device,
      queues: optimization?.network?.multiqueue ? 4 : 1,
      rateLimit: optimization?.network?.rateLimiting?.mbps,
    }));
  }
  ```
- **Testing**: Firewall rules, performance settings, QoS configuration

### T3.1.4.5: Cloud-Init Integration (P1) - 30 minutes
**Dependencies**: T3.1.4.4  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.5.1: User data generation (15 min) ⏸️
- **Acceptance Criteria**:
  - Generates cloud-config YAML
  - Includes SSH keys and user accounts
  - Adds package installation lists
  - Configures system settings and services
- **Sub-sub-tasks**:
  1. **T3.1.4.5.1.1**: Cloud-config structure generation (6 min)
     - Create base cloud-config structure
     - Include hostname and domain settings
     - Set locale and timezone
  2. **T3.1.4.5.1.2**: User account configuration (5 min)
     - Configure default user account
     - Add SSH authorized keys
     - Set sudo permissions and passwords
  3. **T3.1.4.5.1.3**: Package and command configuration (4 min)
     - Add package installation lists
     - Configure run commands for setup
     - Write configuration files
- **Implementation Pattern**:
  ```typescript
  private generateUserData(config: CloudInitConfig, hostname: string): string {
    const cloudConfig = {
      '#cloud-config': true,
      hostname: hostname,
      fqdn: `${hostname}.${this.props.domain}`,
      users: [
        {
          name: config.user?.name || 'proxmox',
          ssh_authorized_keys: config.sshKeys || [],
          sudo: config.user?.sudo ?? true,
          groups: ['sudo'],
          shell: '/bin/bash',
        },
      ],
      packages: config.packages || [],
      runcmd: config.runCmd || [],
      write_files: config.writeFiles || [],
    };
    
    return YAML.stringify(cloudConfig);
  }
  ```
- **Testing**: YAML generation, user account setup, package installation

##### T3.1.4.5.2: Network configuration generation (10 min) ⏸️
- **Acceptance Criteria**:
  - Generates network configuration for static IPs
  - Configures DNS settings and domain
  - Sets hostname and FQDN
  - Applies gateway and routing configuration
- **Sub-sub-tasks**:
  1. **T3.1.4.5.2.1**: Static IP configuration (5 min)
     - Generate network interface configuration
     - Set static IP addresses and netmasks
     - Configure gateways per interface
  2. **T3.1.4.5.2.2**: DNS and domain configuration (3 min)
     - Set DNS servers and search domains
     - Configure hostname resolution
     - Apply domain-specific settings
  3. **T3.1.4.5.2.3**: Routing configuration (2 min)
     - Set default routes and gateways
     - Configure multi-interface routing
     - Apply metric preferences
- **Implementation Pattern**:
  ```typescript
  private generateNetworkConfig(networkConfigs: NetworkConfiguration[]): string {
    const netplan = {
      version: 2,
      ethernets: {},
    };
    
    networkConfigs.forEach((config, index) => {
      if (config.type === 'static') {
        netplan.ethernets[`eth${index}`] = {
          addresses: [`${config.ip}/${config.netmask}`],
          gateway4: config.gateway,
          nameservers: {
            addresses: this.props.dnsServers,
            search: [this.props.domain],
          },
        };
      } else {
        netplan.ethernets[`eth${index}`] = { dhcp4: true };
      }
    });
    
    return YAML.stringify(netplan);
  }
  ```
- **Testing**: Network config generation, static IP setup, DNS configuration

##### T3.1.4.5.3: Cloud-init integration with Proxmox (5 min) ⏸️
- **Acceptance Criteria**:
  - Configures initialization parameter in VM
  - Sets cloud-init drive and format
  - Applies user data and network config
  - Validates cloud-init execution
- **Sub-sub-tasks**:
  1. **T3.1.4.5.3.1**: Initialization parameter setup (3 min)
     - Configure VM initialization block
     - Set cloud-init type to 'nocloud'
     - Specify datastore for cloud-init drive
  2. **T3.1.4.5.3.2**: Data application and validation (2 min)
     - Apply generated user data and network config
     - Validate cloud-init syntax
     - Ensure proper encoding
- **Implementation Pattern**:
  ```typescript
  private configureCloudInit(
    userData: string,
    networkConfig: string
  ): VirtualMachineInitialization {
    return {
      type: 'nocloud',
      datastoreId: this.props.datastore,
      userData: userData,
      networkConfig: networkConfig,
      dns: {
        domain: this.props.domain,
        servers: this.props.dnsServers.join(' '),
      },
    };
  }
  ```
- **Testing**: Cloud-init configuration, data validation, execution verification

### T3.1.4.6: VM Lifecycle Management (P1) - 25 minutes
**Dependencies**: T3.1.4.5  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.6.1: VM startup and boot management (10 min) ⏸️
- **Acceptance Criteria**:
  - Configures VM boot order and settings
  - Implements startup delays and dependencies
  - Sets auto-start on node boot
  - Handles VM start failures gracefully
- **Sub-sub-tasks**:
  1. **T3.1.4.6.1.1**: Boot configuration (4 min)
     - Set boot order from disk
     - Configure BIOS/UEFI settings
     - Apply boot menu options
  2. **T3.1.4.6.1.2**: Startup timing and dependencies (4 min)
     - Configure startup order
     - Set startup delays between VMs
     - Handle dependency chains
  3. **T3.1.4.6.1.3**: Auto-start configuration (2 min)
     - Enable/disable auto-start on node boot
     - Configure auto-start priorities
     - Handle auto-start failures
- **Implementation Pattern**:
  ```typescript
  private configureVMLifecycle(lifecycle: VMLifecycleOptions): LifecycleConfig {
    return {
      onBoot: lifecycle.onBoot ?? false,
      started: lifecycle.startAfterCreate ?? true,
      startup: lifecycle.startup ? {
        order: lifecycle.startup.order,
        up: lifecycle.startup.up,
        down: lifecycle.startup.down,
      } : undefined,
      protection: lifecycle.protection ?? false,
    };
  }
  ```
- **Testing**: Boot configuration, startup timing, auto-start behavior

##### T3.1.4.6.2: VM status monitoring (10 min) ⏸️
- **Acceptance Criteria**:
  - Monitors VM status through Proxmox API
  - Tracks boot completion and readiness
  - Implements health checks via QEMU agent
  - Reports VM resource utilization
- **Sub-sub-tasks**:
  1. **T3.1.4.6.2.1**: Status monitoring setup (4 min)
     - Query VM status from Proxmox API
     - Track VM state changes
     - Monitor boot progress
  2. **T3.1.4.6.2.2**: QEMU agent integration (4 min)
     - Enable QEMU guest agent
     - Query agent for detailed status
     - Get network and resource information
  3. **T3.1.4.6.2.3**: Health check implementation (2 min)
     - Implement periodic health checks
     - Validate VM responsiveness
     - Monitor resource utilization
- **Implementation Pattern**:
  ```typescript
  private monitorVMStatus(): pulumi.Output<VMStatus> {
    return this.vm.apply(vm => {
      // Query VM status through Proxmox API
      return this.queryVMStatus(vm.vmId).apply(status => ({
        state: status.qmpstatus,
        uptime: status.uptime,
        cpuUsage: status.cpu,
        memoryUsage: status.mem,
      }));
    });
  }
  ```
- **Testing**: Status monitoring, agent communication, health checks

##### T3.1.4.6.3: VM lifecycle operations (5 min) ⏸️
- **Acceptance Criteria**:
  - Implements start/stop/restart operations
  - Configures protection settings
  - Handles graceful shutdowns
  - Supports force stop operations
- **Sub-sub-tasks**:
  1. **T3.1.4.6.3.1**: Basic lifecycle operations (3 min)
     - Implement start/stop/restart methods
     - Handle operation timeouts
     - Provide operation status feedback
  2. **T3.1.4.6.3.2**: Protection and safety features (2 min)
     - Configure deletion protection
     - Implement confirmation requirements
     - Handle forced operations safely
- **Implementation Pattern**:
  ```typescript
  public async startVM(): Promise<void> {
    return this.vm.apply(async vm => {
      await this.proxmoxAPI.startVM(vm.vmId);
      await this.waitForVMStatus('running');
    });
  }
  
  public async stopVM(force: boolean = false): Promise<void> {
    return this.vm.apply(async vm => {
      if (force) {
        await this.proxmoxAPI.stopVM(vm.vmId);
      } else {
        await this.proxmoxAPI.shutdownVM(vm.vmId);
      }
      await this.waitForVMStatus('stopped');
    });
  }
  ```
- **Testing**: Lifecycle operations, protection settings, error handling

### T3.1.4.7: Error Handling and Validation (P1) - 15 minutes
**Dependencies**: T3.1.4.6  
**File**: `src/components/compute/vm-component.ts`  

#### Subtasks:

##### T3.1.4.7.1: Input validation (5 min) ⏸️
- **Acceptance Criteria**:
  - Validates NodeConfig specifications
  - Checks resource availability on target node
  - Validates network configuration consistency
  - Ensures template compatibility
- **Sub-sub-tasks**:
  1. **T3.1.4.7.1.1**: Configuration validation (3 min)
     - Validate NodeConfig structure and values
     - Check resource requirements vs availability
     - Validate network interface specifications
  2. **T3.1.4.7.1.2**: Compatibility checking (2 min)
     - Ensure template is compatible with node
     - Validate storage and network availability
     - Check Proxmox version compatibility
- **Implementation Pattern**:
  ```typescript
  private validateConfiguration(): void {
    // Validate node configuration
    if (!this.props.nodeConfig.specs.cores || this.props.nodeConfig.specs.cores < 1) {
      throw new Error('Invalid CPU core count');
    }
    
    if (!this.props.nodeConfig.specs.memory || this.props.nodeConfig.specs.memory < 512) {
      throw new Error('Invalid memory specification');
    }
    
    // Validate network configuration
    this.props.nodeConfig.specs.network.forEach(net => {
      if (!net.bridge) {
        throw new Error('Network interface missing bridge specification');
      }
    });
  }
  ```
- **Testing**: Configuration validation, error conditions, compatibility checks

##### T3.1.4.7.2: Runtime error handling (5 min) ⏸️
- **Acceptance Criteria**:
  - Handles VM creation failures
  - Manages IP allocation conflicts
  - Deals with resource exhaustion errors
  - Implements retry logic for transient failures
- **Sub-sub-tasks**:
  1. **T3.1.4.7.2.1**: Creation failure handling (3 min)
     - Handle VM creation timeouts
     - Manage storage allocation failures
     - Deal with network configuration errors
  2. **T3.1.4.7.2.2**: Retry and recovery logic (2 min)
     - Implement exponential backoff retry
     - Clean up partial resources on failure
     - Provide clear error messaging
- **Implementation Pattern**:
  ```typescript
  private async createVMWithRetry(maxRetries: number = 3): Promise<VMOutput> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.createVM();
      } catch (error) {
        lastError = error as Error;
        logger.warn(`VM creation attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
          await this.cleanupPartialResources();
        }
      }
    }
    
    throw new Error(`VM creation failed after ${maxRetries} attempts: ${lastError.message}`);
  }
  ```
- **Testing**: Error scenarios, retry logic, cleanup behavior

##### T3.1.4.7.3: State consistency validation (5 min) ⏸️
- **Acceptance Criteria**:
  - Verifies VM state after operations
  - Validates network connectivity
  - Checks cloud-init execution success
  - Ensures resource allocation matches specifications
- **Sub-sub-tasks**:
  1. **T3.1.4.7.3.1**: Post-creation validation (3 min)
     - Verify VM exists and is accessible
     - Validate resource allocation
     - Check network interface creation
  2. **T3.1.4.7.3.2**: Consistency monitoring (2 min)
     - Monitor VM state consistency
     - Validate cloud-init completion
     - Check network connectivity
- **Implementation Pattern**:
  ```typescript
  private async validateVMState(): Promise<boolean> {
    const vm = await this.vm.promise();
    
    // Validate VM exists
    const vmExists = await this.proxmoxAPI.getVM(vm.id);
    if (!vmExists) {
      throw new Error(`VM ${vm.id} does not exist after creation`);
    }
    
    // Validate resource allocation
    if (vmExists.cores !== this.props.nodeConfig.specs.cores) {
      throw new Error('CPU allocation mismatch');
    }
    
    // Validate network connectivity
    await this.validateNetworkConnectivity();
    
    return true;
  }
  ```
- **Testing**: State validation, consistency checks, connectivity verification

## Continuous Integration Requirements

### Code Quality Gates
- **Linting**: ESLint rules enforced for all code changes
- **Type Checking**: Strict TypeScript compilation without errors
- **Formatting**: Prettier formatting applied consistently
- **Testing**: Minimum 85% code coverage required

### Testing Strategy
- **Unit Tests**: Test each subtask in isolation with mocks
- **Integration Tests**: Test component integration with dependencies
- **Property-Based Tests**: Test with random valid configurations
- **End-to-End Tests**: Full VM creation and lifecycle testing

### Documentation Requirements
- **API Documentation**: JSDoc for all public methods and interfaces
- **Usage Examples**: Working examples for common configurations
- **Troubleshooting Guide**: Common issues and resolution steps
- **Performance Guidelines**: Best practices for optimization

## Success Metrics

### Functional Requirements
- [ ] VM creation success rate > 95%
- [ ] Network configuration accuracy 100%
- [ ] Cloud-init execution success > 90%
- [ ] Lifecycle operations (start/stop/restart) work reliably
- [ ] Error handling provides actionable feedback

### Performance Requirements
- [ ] VM creation time < 5 minutes
- [ ] Network setup time < 30 seconds
- [ ] Status monitoring response < 5 seconds
- [ ] Memory usage < 100MB per VM component
- [ ] CPU overhead < 5% during operations

### Quality Requirements
- [ ] Zero critical security vulnerabilities
- [ ] Test coverage > 85%
- [ ] All ESLint rules pass
- [ ] TypeScript strict mode compliance
- [ ] Comprehensive error handling

## Risk Mitigation

### Technical Risks
1. **Proxmox API Limitations**: Use provider capabilities effectively, implement fallbacks
2. **Network Configuration Complexity**: Start simple, add features incrementally
3. **Template Dependencies**: Validate template readiness, handle template updates
4. **Resource Conflicts**: Implement proper validation and conflict resolution

### Schedule Risks
1. **Underestimated Complexity**: Break tasks into smaller units, track progress
2. **Dependency Delays**: Ensure all dependencies (T3.1.1-T3.1.3) are complete
3. **Testing Overhead**: Implement tests alongside code, not after
4. **Integration Issues**: Test components early and often

## Implementation Order

### Phase 1: Foundation (T3.1.4.1-T3.1.4.2) - 65 minutes
- Schema definitions and interfaces
- Template resolution and cloning logic
- Basic VM creation infrastructure

### Phase 2: Configuration (T3.1.4.3-T3.1.4.4) - 75 minutes
- Resource specification application
- Network interface configuration
- Advanced optimization features

### Phase 3: Integration (T3.1.4.5-T3.1.4.7) - 70 minutes
- Cloud-init setup and configuration
- Lifecycle management and monitoring
- Error handling and validation

---

**Total Implementation Time**: 210 minutes (3.5 hours)  
**Buffer Time**: 1 hour for unexpected issues  
**Total Allocated Time**: 4.5 hours  

**Document Status**: Ready for Implementation  
**Approval Required**: Technical lead review  
**Next Steps**: Begin T3.1.4.1.1 after approval  