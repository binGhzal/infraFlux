/**
 * VM Component for InfraFlux v2.0
 * 
 * Manages individual virtual machine provisioning from templates
 * with full support for resource configuration, networking, and cloud-init
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { NodeConfig, VMOutput, ComponentProps } from '../../types';
import { VMTemplateComponent, TemplateInfo, TemplateStatus } from '../storage/vm-template';
import { NetworkComponent } from '../network/network-component';
import { logger } from '../../utils/logger';

/**
 * VM component properties
 */
export interface VMComponentProps extends ComponentProps {
  /** Node configuration from cluster definition */
  nodeConfig: NodeConfig;
  
  /** Proxmox provider instance */
  proxmoxProvider: proxmoxve.Provider;
  
  /** Target Proxmox node for VM placement */
  proxmoxNode: string;
  
  /** VM template to clone from */
  template: VMTemplateComponent | string;
  
  /** Network component for IP allocation */
  networkComponent?: NetworkComponent;
  
  /** Cloud-init configuration */
  cloudInit?: CloudInitConfig;
  
  /** VM lifecycle options */
  lifecycle?: VMLifecycleOptions;
  
  /** Clone options */
  cloneOptions?: CloneOptions;
  
  /** Resource optimization settings */
  optimization?: VMOptimizationConfig;
  
  /** Monitoring configuration */
  monitoring?: VMMonitoringConfig;
  
  /** Manual VM ID specification (optional, will auto-generate if not provided) */
  vmId?: number;
}

/**
 * Cloud-init configuration for VM initialization
 */
export interface CloudInitConfig {
  /** User data (cloud-config format) */
  userData?: string;
  
  /** Network configuration */
  networkConfig?: string;
  
  /** SSH public keys for default user */
  sshKeys?: string[];
  
  /** Default user configuration */
  user?: {
    name: string;
    password?: string;
    sudo?: boolean;
  };
  
  /** Packages to install on first boot */
  packages?: string[];
  
  /** Commands to run on first boot */
  runCmd?: string[];
  
  /** Files to write on first boot */
  writeFiles?: Array<{
    path: string;
    content: string;
    permissions?: string;
    owner?: string;
  }>;
}

/**
 * VM lifecycle management options
 */
export interface VMLifecycleOptions {
  /** Start VM on Proxmox node boot */
  onBoot?: boolean;
  
  /** Start VM after creation */
  startAfterCreate?: boolean;
  
  /** Protection from accidental deletion */
  protection?: boolean;
  
  /** VM startup order and delays */
  startup?: {
    order?: number;
    up?: number;
    down?: number;
  };
  
  /** Automatic restart on failure */
  autoRestart?: boolean;
  
  /** VM shutdown timeout in seconds */
  shutdownTimeout?: number;
}

/**
 * Clone configuration options
 */
export interface CloneOptions {
  /** Full clone (true) or linked clone (false) */
  full?: boolean;
  
  /** Target storage for clone */
  targetStorage?: string;
  
  /** Clone description */
  description?: string;
}

/**
 * VM resource optimization configuration
 */
export interface VMOptimizationConfig {
  /** CPU topology optimization */
  cpuTopology?: {
    /** Enable NUMA topology */
    numa?: boolean;
    /** CPU units for proportional scheduling (default: 1024) */
    cpuUnits?: number;
    /** CPU usage limit (0-n cores) */
    cpuLimit?: number;
  };
  
  /** Memory optimization */
  memory?: {
    /** Enable memory ballooning for dynamic allocation */
    ballooning?: boolean;
    /** Use hugepages for better memory performance */
    hugepages?: boolean;
    /** Swappiness parameter (0-100) */
    swappiness?: number;
  };
  
  /** Disk optimization */
  disk?: {
    /** Disk cache mode for performance tuning */
    cache?: 'none' | 'writethrough' | 'writeback';
    /** Enable I/O threads for better performance */
    ioThread?: boolean;
    /** Include in backup operations */
    backup?: boolean;
    /** Enable discard for thin provisioning */
    discard?: boolean;
  };
  
  /** Network optimization */
  network?: {
    /** Enable multiqueue for high throughput */
    multiqueue?: boolean;
    /** Network packet buffer size */
    packetBuffer?: number;
    /** Network rate limiting */
    rateLimiting?: {
      /** Maximum bandwidth in Mbps */
      mbps?: number;
    };
  };
}

/**
 * VM monitoring configuration
 */
export interface VMMonitoringConfig {
  /** Enable VM status monitoring */
  enabled?: boolean;
  
  /** Monitoring interval in seconds */
  interval?: number;
  
  /** Enable resource usage monitoring */
  resourceUsage?: boolean;
  
  /** Enable QEMU guest agent monitoring */
  guestAgent?: boolean;
  
  /** Custom monitoring metrics */
  customMetrics?: string[];
}

/**
 * Enhanced VM output with additional details
 */
export interface VMOutputExtended extends VMOutput {
  /** Clone source information */
  cloneSource?: {
    templateId: number;
    templateName: string;
    cloneType: 'full' | 'linked';
  };
  
  /** Network configuration details */
  networkDetails?: {
    interfaces: Array<{
      name: string;
      mac: string;
      bridge: string;
      vlan?: number;
      ip?: string;
      gateway?: string;
    }>;
  };
  
  /** Cloud-init status */
  cloudInitStatus?: {
    ready: boolean;
    userData: boolean;
    networkConfig: boolean;
  };
  
  /** Resource utilization */
  resources?: {
    cpuUsage?: number;
    memoryUsage?: number;
    diskUsage?: number;
  };
}

export class VMComponent extends pulumi.ComponentResource {
  public readonly vm: pulumi.Output<VMOutputExtended>;
  public readonly ipAddress: pulumi.Output<string>;
  public readonly ready: pulumi.Output<boolean>;
  public readonly status: pulumi.Output<VMStatus>;

  private readonly props: VMComponentProps;

  constructor(name: string, props: VMComponentProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:compute:VM', name, {}, opts);

    this.props = props;
    const { nodeConfig, proxmoxNode, template } = props;
    
    logger.info(`Creating VM: ${nodeConfig.name}`, {
      role: nodeConfig.role,
      cores: nodeConfig.specs.cores,
      memory: nodeConfig.specs.memory,
    });

    // T3.1.4.2.1: Template reference resolution
    const resolvedTemplate = this.resolveTemplate(template);

    // T3.1.4.2.2: VM ID generation and uniqueness
    const vmId = this.generateUniqueVMId(nodeConfig.name, props.vmId);

    // T3.1.4.2.3: VM cloning implementation
    const clonedVM = this.createVMFromTemplate(resolvedTemplate, vmId, props.cloneOptions);

    // TODO: Continue with VM creation workflow
    // - T3.1.4.3: Resource specification application
    // - T3.1.4.4: Network interface configuration
    // - T3.1.4.5: Cloud-init integration

    // VM outputs using actual cloned VM
    this.vm = pulumi.all([resolvedTemplate, vmId, clonedVM]).apply(([templateInfo, vmIdValue]) => ({
      id: vmIdValue.toString(),
      name: nodeConfig.name,
      ipAddress: undefined, // Will be populated after network configuration
      macAddress: '00:00:00:00:00:00', // Will be generated by Proxmox
      status: 'running' as const, // Will be updated based on actual VM status
      node: proxmoxNode,
      template: typeof template === 'string' ? template : templateInfo.name,
      specs: nodeConfig.specs,
      uptime: undefined, // Will be populated by monitoring
      cloneSource: {
        templateId: templateInfo.id,
        templateName: templateInfo.name,
        cloneType: (props.cloneOptions?.full ?? true) ? 'full' as const : 'linked' as const,
      },
      networkDetails: {
        interfaces: [], // Will be populated in network configuration phase
      },
      cloudInitStatus: {
        ready: false, // Will be updated after cloud-init configuration
        userData: false,
        networkConfig: false,
      },
      resources: {
        cpuUsage: undefined as number | undefined, // Will be populated by monitoring
        memoryUsage: undefined as number | undefined,
        diskUsage: undefined as number | undefined,
      },
    } as unknown as VMOutputExtended));

    this.ipAddress = pulumi.output('192.168.1.100'); // Will be assigned by network component
    this.ready = clonedVM.apply(vm => vm.id !== undefined); // VM is ready when clone is complete
    this.status = pulumi.output('running' as VMStatus); // Will be updated based on actual VM status

    this.registerOutputs({
      vm: this.vm,
      ipAddress: this.ipAddress,
      ready: this.ready,
      status: this.status,
    });
  }

  /**
   * T3.1.4.2.1: Template reference resolution
   * Resolves template reference to TemplateInfo, supporting both component and string inputs
   */
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

  /**
   * Lookup template by name (string reference)
   * This would typically query a template registry or Proxmox API
   */
  private lookupTemplateByName(templateName: string): pulumi.Output<TemplateInfo> {
    // TODO: Implement actual template lookup
    // For now, create a placeholder that would be replaced with real lookup logic
    logger.warn(`Template lookup by name not yet implemented: ${templateName}`);
    
    // This is a placeholder - in real implementation, this would:
    // 1. Query Proxmox API for existing templates
    // 2. Find template by name
    // 3. Validate template exists and is accessible
    // 4. Return TemplateInfo or throw error if not found
    
    return pulumi.output({
      id: 9000, // Placeholder ID
      name: templateName,
      status: 'ready' as TemplateStatus,
      talosVersion: 'unknown',
      architecture: 'amd64',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      node: this.props.proxmoxNode,
      storage: 'local-lvm',
    });
  }

  /**
   * Validate template readiness for VM creation
   */
  private validateTemplateReadiness(templateInfo: TemplateInfo): void {
    if (templateInfo.status !== 'ready') {
      throw new Error(
        `Template ${templateInfo.name} is not ready for VM creation. ` +
        `Current status: ${templateInfo.status}. ` +
        `Please wait for template creation to complete or check for errors.`
      );
    }

    logger.debug(`Template validation successful`, {
      templateId: templateInfo.id,
      templateName: templateInfo.name,
      status: templateInfo.status,
      talosVersion: templateInfo.talosVersion,
      architecture: templateInfo.architecture,
    });
  }

  /**
   * T3.1.4.2.2: VM ID generation and uniqueness
   * Generates unique VM ID with conflict resolution
   */
  private generateUniqueVMId(nodeName: string, manualId?: number): pulumi.Output<number> {
    if (manualId) {
      logger.debug(`Using manual VM ID: ${manualId}`);
      return this.validateVMIdAvailable(manualId).apply(() => manualId);
    }

    // Generate deterministic base ID from node name
    const baseId = this.generateBaseId(nodeName);
    logger.debug(`Generated base VM ID: ${baseId} for node: ${nodeName}`);

    // Check for conflicts and find available ID
    return this.findAvailableVMId(baseId);
  }

  /**
   * Generate deterministic base ID from node name
   */
  private generateBaseId(nodeName: string): number {
    // Create hash from node name for deterministic ID generation
    let hash = 0;
    for (let i = 0; i < nodeName.length; i++) {
      const char = nodeName.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Ensure positive number and within valid range (100-99999)
    const absHash = Math.abs(hash);
    const vmId = 100 + (absHash % 99900); // Range: 100-99999

    logger.debug(`Generated VM ID from hash`, {
      nodeName,
      hash,
      absHash,
      vmId,
    });

    return vmId;
  }

  /**
   * Validate that manual VM ID is available
   */
  private validateVMIdAvailable(vmId: number): pulumi.Output<boolean> {
    // Validate VM ID is in acceptable range
    if (vmId < 100 || vmId > 999999) {
      throw new Error(
        `VM ID ${vmId} is outside valid range (100-999999). ` +
        `Please specify a VM ID between 100 and 999999.`
      );
    }

    // TODO: Implement actual VM ID conflict check via Proxmox API
    // For now, assume manual IDs are valid (user responsibility)
    logger.debug(`Manual VM ID validated: ${vmId}`);
    return pulumi.output(true);
  }

  /**
   * Find available VM ID starting from base ID
   */
  private findAvailableVMId(baseId: number): pulumi.Output<number> {
    // TODO: Implement actual conflict detection via Proxmox API
    // This would query existing VMs and find the first available ID
    
    // For now, use the base ID with some collision avoidance
    // In production, this would:
    // 1. Query Proxmox API for existing VM IDs
    // 2. Check if baseId is available
    // 3. If not, increment and check again
    // 4. Continue until available ID is found
    
    const maxRetries = 100;
    let candidateId = baseId;
    
    logger.debug(`Finding available VM ID starting from: ${baseId}`);
    
    // Simulate conflict resolution (placeholder logic)
    // In real implementation, this would be async API calls
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      if (candidateId > 999999) {
        candidateId = 100; // Wrap around to start of range
      }
      
      // TODO: Replace with actual API check
      const isAvailable = this.isVMIdAvailable(candidateId);
      if (isAvailable) {
        logger.debug(`Found available VM ID: ${candidateId} (attempt ${attempt + 1})`);
        return pulumi.output(candidateId);
      }
      
      candidateId++;
    }
    
    throw new Error(
      `Unable to find available VM ID after ${maxRetries} attempts. ` +
      `Starting from ${baseId}. Proxmox cluster may be at capacity.`
    );
  }

  /**
   * Check if VM ID is available (placeholder for Proxmox API call)
   */
  private isVMIdAvailable(_vmId: number): boolean {
    // TODO: Implement actual Proxmox API call to check VM existence
    // This would call: GET /api2/json/nodes/{node}/qemu/{vmid}/config
    // If 404, VM ID is available; if 200, VM ID is taken
    
    // For now, assume all generated IDs are available
    // In production, this would return false if VM exists
    return true;
  }

  /**
   * T3.1.4.2.3: VM cloning implementation
   * Creates VM from template using Proxmox VirtualMachine resource
   */
  private createVMFromTemplate(
    resolvedTemplate: pulumi.Output<TemplateInfo>,
    vmId: pulumi.Output<number>,
    cloneOptions?: CloneOptions
  ): pulumi.Output<proxmoxve.vm.VirtualMachine> {
    return pulumi.all([resolvedTemplate, vmId]).apply(([templateInfo, vmIdValue]) => {
      logger.info(`Creating VM from template`, {
        templateId: templateInfo.id,
        templateName: templateInfo.name,
        vmId: vmIdValue,
        vmName: this.props.nodeConfig.name,
        cloneType: cloneOptions?.full ? 'full' : 'linked',
      });

      // Configure clone options
      const cloneConfig = this.configureCloneOptions(templateInfo, cloneOptions);
      
      // Create VM resource from template
      const vm = new proxmoxve.vm.VirtualMachine(
        `${this.props.nodeConfig.name}-vm`,
        {
          // Basic VM identification
          nodeName: this.props.proxmoxNode,
          vmId: vmIdValue,
          name: this.props.nodeConfig.name,
          description: `VM ${this.props.nodeConfig.name} cloned from template ${templateInfo.name}`,

          // Clone configuration
          clone: cloneConfig,

          // TODO: The following will be implemented in subsequent tasks:
          // - T3.1.4.3: Resource specification application (CPU, memory, disk)
          // - T3.1.4.4: Network interface configuration
          // - T3.1.4.5: Cloud-init integration

          // Placeholder minimal configuration
          cpu: {
            cores: this.props.nodeConfig.specs.cores,
            sockets: 1,
            type: 'host',
          },
          memory: {
            dedicated: this.props.nodeConfig.specs.memory,
          },

          // VM lifecycle configuration
          onBoot: this.props.lifecycle?.onBoot ?? false,
          started: this.props.lifecycle?.startAfterCreate ?? true,
          protection: this.props.lifecycle?.protection ?? false,

          // Operating system type
          operatingSystem: {
            type: 'l26', // Linux 2.6+ kernel (suitable for Talos)
          },

          // QEMU guest agent
          agent: {
            enabled: true,
            trim: true,
            type: 'virtio',
          },
        },
        {
          provider: this.props.proxmoxProvider,
          parent: this,
          // Ensure VM creation waits for template to be ready
          dependsOn: [], // Template dependency will be handled by Pulumi automatically
        }
      );

      logger.debug(`VM resource created`, {
        vmId: vmIdValue,
        vmName: this.props.nodeConfig.name,
        resourceUrn: vm.urn,
      });

      return vm;
    });
  }

  /**
   * Configure clone options for VM creation
   */
  private configureCloneOptions(
    templateInfo: TemplateInfo,
    cloneOptions?: CloneOptions
  ): {
    vmId: number;
    full: boolean;
    target: string;
    datastore?: string;
  } {
    const config = {
      // Source template VM ID
      vmId: templateInfo.id,
      
      // Clone type: full clone (independent) or linked clone (thin-provisioned)
      full: cloneOptions?.full ?? true, // Default to full clone for better isolation
      
      // Target node (support cross-node cloning)
      target: this.props.proxmoxNode,
    };

    // Apply target storage if specified
    const result: {
      vmId: number;
      full: boolean;
      target: string;
      datastore?: string;
    } = { ...config };
    
    if (cloneOptions?.targetStorage) {
      result.datastore = cloneOptions.targetStorage;
    }
    
    return result;

    logger.debug(`Clone configuration`, {
      sourceTemplateId: templateInfo.id,
      sourceTemplateName: templateInfo.name,
      targetNode: this.props.proxmoxNode,
      cloneType: result.full ? 'full' : 'linked',
      targetStorage: result.datastore || 'default',
    });
  }
}

/**
 * VM status type
 */
export type VMStatus = 'pending' | 'running' | 'stopped' | 'paused' | 'error';