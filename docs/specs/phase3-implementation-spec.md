# InfraFlux v2.0 - Phase 3 Implementation Specification

## Document Overview

**Version**: 1.0  
**Date**: 2025-06-20  
**Status**: Active Development Specification  
**Phase**: Phase 3 - Core Pulumi Implementation  

This document provides the detailed technical specification for implementing the core Pulumi components in InfraFlux v2.0, transitioning from architectural planning to concrete implementation.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Implementation Specifications](#component-implementation-specifications)
3. [API Interface Definitions](#api-interface-definitions)
4. [Configuration Schema Updates](#configuration-schema-updates)
5. [Error Handling Specifications](#error-handling-specifications)
6. [Testing Requirements](#testing-requirements)
7. [Implementation Sequence](#implementation-sequence)

## Architecture Overview

### Core Design Principles

1. **Provider-First Approach**: Utilize `@muhlba91/pulumi-proxmoxve` provider for all Proxmox interactions
2. **Component Resource Pattern**: All infrastructure components extend `pulumi.ComponentResource`
3. **Configuration-Driven**: All behavior controlled through type-safe configuration objects
4. **Template-Based VM Creation**: VM Templates created first, then VMs provisioned from templates
5. **Network-First Architecture**: Network infrastructure provisioned before compute resources

### Component Dependency Graph

```
NetworkComponent (bridges, VLANs, firewall)
    ↓
VMTemplateComponent (Talos image → template)
    ↓
VMComponent (template → VM instances)
    ↓
TalosClusterComponent (VM cluster → K8s cluster)
    ↓
HomeLabStack (orchestration)
```

### Provider Configuration

```typescript
// src/components/core/proxmox-provider.ts
export interface ProxmoxProviderConfig {
  endpoint: string;
  username: string;
  password?: string;
  apiToken?: string;
  insecure?: boolean;
  timeout?: number;
  parallelism?: number;
}

export class ProxmoxProviderComponent extends pulumi.ComponentResource {
  public readonly provider: proxmoxve.Provider;
  
  constructor(name: string, config: ProxmoxProviderConfig, opts?: pulumi.ComponentResourceOptions) {
    super("infraflux:core:ProxmoxProvider", name, {}, opts);
    
    this.provider = new proxmoxve.Provider(`${name}-provider`, {
      endpoint: config.endpoint,
      username: config.username,
      password: config.password,
      apiToken: config.apiToken,
      insecure: config.insecure ?? false,
      timeout: config.timeout ?? 300,
    }, { parent: this });
  }
}
```

## Component Implementation Specifications

### 1. NetworkComponent Implementation

**File**: `src/components/network/network-component.ts`

#### Core Responsibilities
- Create and manage network bridges
- Configure VLAN infrastructure
- Implement firewall rules
- Manage IP address allocation

#### Implementation Details

```typescript
export interface NetworkComponentProps extends ComponentProps {
  network: NetworkConfig;
  proxmoxProvider: proxmoxve.Provider;
}

export interface NetworkOutput {
  bridges: pulumi.Output<BridgeInfo[]>;
  vlans: pulumi.Output<VLANInfo[]>;
  firewallRules: pulumi.Output<FirewallRuleInfo[]>;
  ipRanges: pulumi.Output<IPRangeInfo[]>;
}

export class NetworkComponent extends pulumi.ComponentResource {
  public readonly bridges: pulumi.Output<BridgeInfo[]>;
  public readonly vlans: pulumi.Output<VLANInfo[]>;
  public readonly firewallRules: pulumi.Output<FirewallRuleInfo[]>;
  
  constructor(name: string, props: NetworkComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super("infraflux:network:Network", name, {}, opts);
    
    // 1. Create network bridges
    const bridges = this.createBridges(props.network.bridges, props.proxmoxProvider);
    
    // 2. Configure VLANs
    const vlans = this.createVLANs(props.network.vlans, bridges, props.proxmoxProvider);
    
    // 3. Implement firewall rules
    const firewallRules = this.createFirewallRules(props.network.firewall, props.proxmoxProvider);
    
    this.bridges = pulumi.output(bridges);
    this.vlans = pulumi.output(vlans);
    this.firewallRules = pulumi.output(firewallRules);
    
    this.registerOutputs({
      bridges: this.bridges,
      vlans: this.vlans,
      firewallRules: this.firewallRules
    });
  }
  
  private createBridges(bridgeConfigs: BridgeConfig[], provider: proxmoxve.Provider): BridgeInfo[] {
    // Implementation: Create Proxmox network bridges
    // Use proxmoxve network resources
  }
  
  private createVLANs(vlanConfigs: VLANConfig[], bridges: BridgeInfo[], provider: proxmoxve.Provider): VLANInfo[] {
    // Implementation: Configure VLAN tags on bridges
  }
  
  private createFirewallRules(firewallConfig: FirewallConfig, provider: proxmoxve.Provider): FirewallRuleInfo[] {
    // Implementation: Apply firewall rules at datacenter/node level
  }
}
```

### 2. VMTemplateComponent Implementation

**File**: `src/components/storage/vm-template.ts`

#### Core Responsibilities
- Download Talos images from Image Factory
- Create base VMs from images
- Apply customizations and hardening
- Convert VMs to templates
- Manage template lifecycle

#### Talos Image Factory Integration

```typescript
export interface TalosImageConfig {
  version: string;                    // e.g., "v1.10.1"
  schematic: TalosSchematicConfig;   // Custom extensions and configs
  platform: "nocloud" | "proxmox";  // Platform-specific optimizations
  architecture: "amd64" | "arm64";   // Target architecture
}

export interface TalosSchematicConfig {
  customization: {
    systemExtensions: {
      officialExtensions: string[];   // e.g., ["siderolabs/qemu-guest-agent"]
    };
  };
}

export class VMTemplateComponent extends pulumi.ComponentResource {
  public readonly templateId: pulumi.Output<number>;
  public readonly templateName: pulumi.Output<string>;
  public readonly imageUrl: pulumi.Output<string>;
  
  constructor(name: string, props: VMTemplateProps, opts?: pulumi.ComponentResourceOptions) {
    super("infraflux:storage:VMTemplate", name, {}, opts);
    
    // 1. Generate Talos image URL from factory
    const imageUrl = this.generateTalosImageUrl(props.talosConfig);
    
    // 2. Download image to Proxmox datastore
    const downloadedImage = this.downloadImage(imageUrl, props.datastore, props.proxmoxProvider);
    
    // 3. Create base VM from image
    const baseVM = this.createBaseVM(downloadedImage, props.vmConfig, props.proxmoxProvider);
    
    // 4. Apply customizations
    const customizedVM = this.applyCustomizations(baseVM, props.customizations);
    
    // 5. Convert to template
    const template = this.convertToTemplate(customizedVM, props.proxmoxProvider);
    
    this.templateId = template.vmId;
    this.templateName = template.name;
    this.imageUrl = imageUrl;
    
    this.registerOutputs({
      templateId: this.templateId,
      templateName: this.templateName,
      imageUrl: this.imageUrl
    });
  }
  
  private generateTalosImageUrl(config: TalosImageConfig): pulumi.Output<string> {
    // 1. POST schematic to factory.talos.dev/schematics
    // 2. Get schematic ID from response
    // 3. Construct image URL: https://factory.talos.dev/image/{id}/{version}/{platform}-{arch}.raw.gz
    
    const schematicId = this.createSchematic(config.schematic);
    return pulumi.interpolate`https://factory.talos.dev/image/${schematicId}/${config.version}/${config.platform}-${config.architecture}.raw.gz`;
  }
  
  private downloadImage(imageUrl: pulumi.Output<string>, datastore: string, provider: proxmoxve.Provider): proxmoxve.DownloadFile {
    return new proxmoxve.DownloadFile(`${this.getResourceName()}-image`, {
      contentType: "iso",
      datastoreId: datastore,
      fileName: pulumi.interpolate`talos-${Date.now()}.img`,
      url: imageUrl,
      decompressionAlgorithm: "gz",
      overwrite: true,
    }, { provider, parent: this });
  }
}
```

### 3. VMComponent Implementation

**File**: `src/components/compute/vm-component.ts`

#### Core Responsibilities
- Provision VMs from templates
- Configure VM specifications (CPU, memory, disk, network)
- Apply cloud-init configuration
- Manage VM lifecycle (start, stop, restart)
- Monitor VM health and status

#### Implementation Details

```typescript
export interface VMComponentProps extends ComponentProps {
  nodeConfig: NodeConfig;
  templateId: pulumi.Input<number>;
  networkConfig: NetworkOutput;
  proxmoxProvider: proxmoxve.Provider;
}

export class VMComponent extends pulumi.ComponentResource {
  public readonly vm: pulumi.Output<proxmoxve.VirtualMachine>;
  public readonly ipAddress: pulumi.Output<string>;
  public readonly status: pulumi.Output<string>;
  
  constructor(name: string, props: VMComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super("infraflux:compute:VM", name, {}, opts);
    
    // 1. Create VM from template
    const vm = new proxmoxve.VirtualMachine(`${name}-vm`, {
      // Basic configuration
      nodeName: props.nodeConfig.proxmoxNode,
      name: props.nodeConfig.hostname,
      
      // Clone from template
      clone: {
        vmId: props.templateId,
        full: true,
      },
      
      // Resource specifications
      cpu: {
        cores: props.nodeConfig.specs.cores,
        sockets: props.nodeConfig.specs.sockets ?? 1,
        type: "x86-64-v2-AES", // Modern CPU with AES support
      },
      
      memory: {
        dedicated: props.nodeConfig.specs.memory,
      },
      
      // Disk configuration
      disks: this.configureDIsks(props.nodeConfig.specs.disks),
      
      // Network configuration
      networkDevices: this.configureNetworkInterfaces(props.nodeConfig.network, props.networkConfig),
      
      // Cloud-init configuration
      initialization: this.configureCloudInit(props.nodeConfig),
      
      // Boot and agent settings
      onBoot: true,
      agent: {
        enabled: true,
        trim: true,
        type: "virtio",
      },
      
      // OS configuration
      operatingSystem: {
        type: "l26", // Linux 2.6+ kernel
      },
      
    }, { provider: props.proxmoxProvider, parent: this });
    
    this.vm = pulumi.output(vm);
    this.ipAddress = this.extractIPAddress(vm);
    this.status = vm.status;
    
    this.registerOutputs({
      vm: this.vm,
      ipAddress: this.ipAddress,
      status: this.status
    });
  }
  
  private configureDIsks(diskConfigs: DiskConfig[]): proxmoxve.VirtualMachineDisk[] {
    return diskConfigs.map((disk, index) => ({
      interface: `scsi${index}`,
      datastoreId: disk.datastore,
      size: disk.size,
      fileFormat: disk.format,
      cache: disk.cache ?? "writeback",
      ioThread: disk.iothread ?? false,
      ssd: disk.ssd ?? false,
    }));
  }
  
  private configureNetworkInterfaces(networkConfigs: NetworkInterface[], networkOutput: NetworkOutput): proxmoxve.VirtualMachineNetworkDevice[] {
    return networkConfigs.map((netConfig, index) => ({
      bridge: netConfig.bridge,
      model: "virtio",
      vlanId: netConfig.vlan,
      macAddress: netConfig.mac,
      enabled: true,
    }));
  }
  
  private configureCloudInit(nodeConfig: NodeConfig): proxmoxve.VirtualMachineInitialization {
    return {
      type: "nocloud",
      datastoreId: "local-lvm", // TODO: Make configurable
      dns: {
        domain: nodeConfig.network.domain ?? "homelab.local",
        servers: nodeConfig.network.dns?.join(" ") ?? "1.1.1.1 8.8.8.8",
      },
      ipConfigs: this.configureIPConfigs(nodeConfig.network),
      userAccount: {
        username: "talos",
        keys: nodeConfig.sshKeys ?? [],
      },
    };
  }
  
  private configureIPConfigs(networkConfig: NetworkInterface[]): proxmoxve.VirtualMachineInitializationIpConfig[] {
    return networkConfig.map(netConfig => ({
      ipv4: netConfig.dhcp ? undefined : {
        address: `${netConfig.ip}/${netConfig.subnet ?? 24}`,
        gateway: netConfig.gateway,
      },
    }));
  }
  
  private extractIPAddress(vm: proxmoxve.VirtualMachine): pulumi.Output<string> {
    // For DHCP: Query QEMU guest agent for IP
    // For static: Return configured IP
    return vm.ipv4Addresses.apply(addresses => 
      addresses?.[0] ?? "pending"
    );
  }
}
```

### 4. TalosClusterComponent Implementation

**File**: `src/components/kubernetes/talos-cluster.ts`

#### Core Responsibilities
- Generate Talos machine configurations
- Bootstrap control plane nodes
- Join worker nodes to cluster
- Configure cluster networking (CNI)
- Generate and distribute kubeconfig
- Manage cluster certificates and secrets

#### Implementation Details

```typescript
export interface TalosClusterProps extends ComponentProps {
  cluster: ClusterConfig;
  controlPlaneVMs: pulumi.Output<VMOutput[]>;
  workerVMs: pulumi.Output<VMOutput[]>;
  networkConfig: NetworkOutput;
}

export class TalosClusterComponent extends pulumi.ComponentResource {
  public readonly cluster: pulumi.Output<any>; // TODO: Define cluster type
  public readonly kubeconfig: pulumi.Output<string>;
  public readonly talosconfig: pulumi.Output<string>;
  
  constructor(name: string, props: TalosClusterProps, opts?: pulumi.ComponentResourceOptions) {
    super("infraflux:kubernetes:TalosCluster", name, {}, opts);
    
    // 1. Generate cluster secrets
    const secrets = this.generateClusterSecrets(props.cluster);
    
    // 2. Generate machine configurations
    const machineConfigs = this.generateMachineConfigs(props, secrets);
    
    // 3. Bootstrap control plane
    const controlPlane = this.bootstrapControlPlane(props.controlPlaneVMs, machineConfigs.controlPlane);
    
    // 4. Join workers
    const workers = this.joinWorkers(props.workerVMs, machineConfigs.worker, controlPlane);
    
    // 5. Configure CNI (Cilium)
    const cni = this.configureCNI(controlPlane, props.cluster.networking);
    
    // 6. Generate kubeconfig
    const kubeconfig = this.generateKubeconfig(controlPlane);
    
    this.cluster = pulumi.output({ controlPlane, workers, cni });
    this.kubeconfig = kubeconfig;
    this.talosconfig = this.generateTalosconfig(secrets, props.controlPlaneVMs);
    
    this.registerOutputs({
      cluster: this.cluster,
      kubeconfig: this.kubeconfig,
      talosconfig: this.talosconfig
    });
  }
  
  private generateClusterSecrets(clusterConfig: ClusterConfig): TalosSecrets {
    // Generate:
    // - Cluster CA certificate and key
    // - Bootstrap token
    // - Service account key
    // - Admin kubeconfig certificate
    // - Encryption key for etcd
  }
  
  private generateMachineConfigs(props: TalosClusterProps, secrets: TalosSecrets): MachineConfigs {
    // Generate machine configs for:
    // - Control plane nodes (with etcd, API server, scheduler, controller manager)
    // - Worker nodes (with kubelet, kube-proxy)
    // Include networking, disk, and security configurations
  }
  
  private bootstrapControlPlane(controlPlaneVMs: pulumi.Output<VMOutput[]>, machineConfig: string): pulumi.Output<ControlPlane> {
    // 1. Apply machine config to first control plane node
    // 2. Bootstrap cluster
    // 3. Apply machine configs to remaining control plane nodes
    // 4. Wait for all nodes to be ready
  }
}
```

## API Interface Definitions

### Core Resource Outputs

```typescript
// VM Component Output
export interface VMOutput {
  id: pulumi.Output<number>;
  name: pulumi.Output<string>;
  ipAddress: pulumi.Output<string>;
  macAddress: pulumi.Output<string>;
  status: pulumi.Output<string>;
  node: pulumi.Output<string>;
  specs: {
    cores: number;
    memory: number;
    disks: DiskInfo[];
  };
}

// Network Component Output
export interface NetworkOutput {
  bridges: pulumi.Output<BridgeInfo[]>;
  vlans: pulumi.Output<VLANInfo[]>;
  firewallRules: pulumi.Output<FirewallRuleInfo[]>;
  ipRanges: pulumi.Output<IPRangeInfo[]>;
}

// Template Component Output
export interface TemplateOutput {
  id: pulumi.Output<number>;
  name: pulumi.Output<string>;
  imageUrl: pulumi.Output<string>;
  created: pulumi.Output<string>;
  size: pulumi.Output<number>;
}

// Cluster Component Output
export interface ClusterOutput {
  name: pulumi.Output<string>;
  version: pulumi.Output<string>;
  endpoint: pulumi.Output<string>;
  kubeconfig: pulumi.Output<string>;
  talosconfig: pulumi.Output<string>;
  nodes: pulumi.Output<NodeOutput[]>;
  status: pulumi.Output<string>;
}
```

## Configuration Schema Updates

### Enhanced Network Configuration

```typescript
export interface NetworkConfig {
  domain: string;
  bridges: BridgeConfig[];
  vlans: VLANConfig[];
  firewall: FirewallConfig;
  dns: string[];
  ntp: string[];
}

export interface BridgeConfig {
  name: string;
  interface?: string;    // Physical interface to bridge
  mtu?: number;         // Maximum Transmission Unit
  stp?: boolean;        // Spanning Tree Protocol
  vlanAware?: boolean;  // VLAN awareness
}

export interface VLANConfig {
  id: number;
  name: string;
  bridge: string;
  ipRange?: string;     // CIDR block for this VLAN
  gateway?: string;     // Gateway IP for this VLAN
}

export interface FirewallConfig {
  enabled: boolean;
  defaultPolicy: "accept" | "drop" | "reject";
  rules: FirewallRule[];
}

export interface FirewallRule {
  action: "accept" | "drop" | "reject";
  direction: "in" | "out";
  protocol?: "tcp" | "udp" | "icmp" | "all";
  source?: string;      // IP/CIDR
  destination?: string; // IP/CIDR
  port?: number | string;
  comment?: string;
}
```

### Enhanced Talos Configuration

```typescript
export interface TalosConfig {
  version: string;
  image: TalosImageConfig;
  machineConfig: TalosMachineConfig;
  clusterConfig: TalosClusterConfig;
}

export interface TalosMachineConfig {
  installDisk: string;           // e.g., "/dev/sda"
  networkInterfaces: TalosNetworkInterface[];
  sysctls: Record<string, string>;
  kubelet: TalosKubeletConfig;
  features: TalosFeaturesConfig;
}

export interface TalosNetworkInterface {
  interface: string;
  dhcp?: boolean;
  addresses?: string[];
  routes?: TalosRoute[];
  mtu?: number;
  vlans?: TalosVLAN[];
}

export interface TalosClusterConfig {
  name: string;
  controlPlane: {
    endpoint: string;
    localAPIServerPort?: number;
  };
  network: {
    dnsDomain: string;
    podSubnets: string[];
    serviceSubnets: string[];
    cni: {
      name: "cilium" | "flannel" | "calico";
      configuration?: Record<string, any>;
    };
  };
  etcd: {
    ca: TalosCertificate;
    advertisedSubnets?: string[];
  };
}
```

## Error Handling Specifications

### Error Categories

1. **Configuration Errors**: Invalid configuration values, missing required fields
2. **Infrastructure Errors**: Proxmox API failures, network connectivity issues
3. **Resource Errors**: VM creation failures, template building errors
4. **Cluster Errors**: Kubernetes bootstrap failures, node join failures
5. **Timeout Errors**: Operations exceeding configured timeouts

### Error Handling Patterns

```typescript
export class InfraFluxError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly component: string,
    public readonly retryable: boolean = false,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = "InfraFluxError";
  }
}

export enum ErrorCategory {
  Configuration = "configuration",
  Infrastructure = "infrastructure", 
  Resource = "resource",
  Cluster = "cluster",
  Timeout = "timeout",
  Network = "network",
  Authentication = "authentication"
}

// Error handling utility
export class ErrorHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof InfraFluxError && !error.retryable) {
          throw error;
        }
        
        if (attempt === maxRetries) {
          break;
        }
        
        const delay = backoffMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
}
```

## Testing Requirements

### Unit Testing Specifications

Each component must include comprehensive unit tests covering:

1. **Configuration Validation**: Test all configuration validation logic
2. **Resource Creation**: Mock Proxmox provider calls and verify resource creation
3. **Error Handling**: Test error scenarios and retry logic
4. **Output Generation**: Verify correct output values and types

### Integration Testing Specifications

Integration tests must cover:

1. **Component Interaction**: Test interactions between components
2. **End-to-End Workflows**: Test complete deployment scenarios
3. **Network Connectivity**: Verify network configuration and connectivity
4. **Cluster Bootstrap**: Test complete cluster creation and node joining

### Property-Based Testing

Use `fast-check` for property-based testing of:

1. **Configuration Generation**: Generate random valid configurations
2. **IP Address Allocation**: Test IP allocation algorithms
3. **Resource Naming**: Test resource naming conventions
4. **Network Validation**: Test network configuration validation

## Implementation Sequence

### Phase 3.1: Core Infrastructure (Week 1)
1. ProxmoxProviderComponent
2. NetworkComponent (basic bridges and VLANs)
3. VMTemplateComponent (Talos image integration)
4. Basic VMComponent (template-based VM creation)

### Phase 3.2: Advanced VM Management (Week 2)
1. Enhanced VMComponent (cloud-init, networking)
2. VM lifecycle management (start, stop, restart)
3. VM monitoring and health checks
4. Resource optimization

### Phase 3.3: Kubernetes Integration (Week 3)
1. TalosClusterComponent (basic cluster creation)
2. Control plane bootstrap
3. Worker node joining
4. Basic cluster networking

### Phase 3.4: Integration and Testing (Week 4)
1. HomeLabStack integration
2. End-to-end testing
3. Error handling implementation
4. Performance optimization

---

**Document Status**: Living document, updated with implementation progress
**Next Review**: After Phase 3.1 completion
**Approval Required**: Architecture review before Phase 3.3 (Kubernetes integration)