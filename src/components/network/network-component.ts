/**
 * Network Infrastructure Component for InfraFlux v2.0
 * 
 * Manages network configuration, IP allocation, and network policies.
 * Note: Proxmox bridge/VLAN creation is typically done through the Proxmox interface,
 * so this component focuses on configuration management and IP tracking.
 */

import * as pulumi from "@pulumi/pulumi";
import * as proxmoxve from "@muhlba91/pulumi-proxmoxve";
import { NetworkConfig, BridgeConfig, VLANConfig, FirewallConfig, ComponentProps } from '../../types';
import { logger } from '../../utils/logger';

/**
 * Network component properties
 */
export interface NetworkComponentProps extends ComponentProps {
  /** Network configuration */
  network: NetworkConfig;
  
  /** Proxmox provider instance */
  proxmoxProvider: proxmoxve.Provider;
  
  /** Target Proxmox node */
  nodeName: string;
}

/**
 * Bridge information for tracking
 */
export interface BridgeInfo {
  /** Bridge name (e.g., vmbr0, vmbr1) */
  name: string;
  
  /** Physical interface attached to bridge */
  interface?: string;
  
  /** MTU setting */
  mtu: number;
  
  /** Whether VLAN aware */
  vlanAware: boolean;
  
  /** Bridge status */
  status: 'active' | 'inactive' | 'unknown';
  
  /** Associated VLANs */
  vlans: number[];
}

/**
 * VLAN information for tracking
 */
export interface VLANInfo {
  /** VLAN ID */
  id: number;
  
  /** VLAN name */
  name: string;
  
  /** Associated bridge */
  bridge: string;
  
  /** IP range for this VLAN */
  ipRange?: string;
  
  /** Gateway IP */
  gateway?: string;
  
  /** Allocated IPs in this VLAN */
  allocatedIPs: string[];
}

/**
 * Firewall rule information
 */
export interface FirewallRuleInfo {
  /** Rule ID */
  id: string;
  
  /** Rule action */
  action: 'accept' | 'drop' | 'reject';
  
  /** Traffic direction */
  direction: 'in' | 'out';
  
  /** Protocol */
  protocol?: string;
  
  /** Source IP/CIDR */
  source?: string;
  
  /** Destination IP/CIDR */
  destination?: string;
  
  /** Port specification */
  port?: string;
  
  /** Rule comment */
  comment?: string;
  
  /** Whether rule is enabled */
  enabled: boolean;
}

/**
 * IP range information for allocation tracking
 */
export interface IPRangeInfo {
  /** Network CIDR */
  cidr: string;
  
  /** Network start IP */
  startIP: string;
  
  /** Network end IP */
  endIP: string;
  
  /** Gateway IP */
  gateway?: string;
  
  /** Available IPs */
  availableIPs: string[];
  
  /** Allocated IPs */
  allocatedIPs: string[];
  
  /** Associated VLAN */
  vlan?: number;
}

/**
 * Network component outputs
 */
export interface NetworkOutput {
  /** Bridge information */
  bridges: pulumi.Output<BridgeInfo[]>;
  
  /** VLAN information */
  vlans: pulumi.Output<VLANInfo[]>;
  
  /** Firewall rules */
  firewallRules: pulumi.Output<FirewallRuleInfo[]>;
  
  /** IP ranges and allocation */
  ipRanges: pulumi.Output<IPRangeInfo[]>;
  
  /** Network domain */
  domain: pulumi.Output<string>;
  
  /** DNS servers */
  dnsServers: pulumi.Output<string[]>;
}

/**
 * Network Infrastructure Component
 * 
 * Manages network configuration and provides IP allocation services.
 * Physical network infrastructure (bridges, VLANs) should be configured
 * in Proxmox before using this component.
 */
export class NetworkComponent extends pulumi.ComponentResource {
  /** Bridge information */
  public readonly bridges: pulumi.Output<BridgeInfo[]>;
  
  /** VLAN information */
  public readonly vlans: pulumi.Output<VLANInfo[]>;
  
  /** Firewall rules */
  public readonly firewallRules: pulumi.Output<FirewallRuleInfo[]>;
  
  /** IP ranges and allocation tracking */
  public readonly ipRanges: pulumi.Output<IPRangeInfo[]>;
  
  /** Network domain */
  public readonly domain: pulumi.Output<string>;
  
  /** DNS servers */
  public readonly dnsServers: pulumi.Output<string[]>;
  
  /** IP allocation state */
  private ipAllocationState: Map<string, Set<string>> = new Map();
  
  /**
   * Create a new Network Component
   * 
   * @param name Resource name
   * @param props Network component properties
   * @param opts Pulumi component resource options
   */
  constructor(
    name: string,
    props: NetworkComponentProps,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("infraflux:network:Network", name, {}, opts);
    
    logger.info(`Initializing network infrastructure for node: ${props.nodeName}`, {
      bridges: props.network.bridges?.length || 0,
      vlans: props.network.vlans?.length || 0,
      domain: props.network.domain,
    });
    
    // Initialize bridge information
    const bridges = this.initializeBridges(props.network.bridges || []);
    
    // Initialize VLAN information
    const vlans = this.initializeVLANs(props.network.vlans || [], bridges);
    
    // Initialize firewall rules (configuration tracking)
    const firewallRules = this.initializeFirewallRules(props.network.firewall);
    
    // Initialize IP ranges and allocation tracking
    const ipRanges = this.initializeIPRanges(vlans);
    
    // Set outputs
    this.bridges = pulumi.output(bridges);
    this.vlans = pulumi.output(vlans);
    this.firewallRules = pulumi.output(firewallRules);
    this.ipRanges = pulumi.output(ipRanges);
    this.domain = pulumi.output(props.network.domain || 'homelab.local');
    this.dnsServers = pulumi.output(props.network.dns || ['1.1.1.1', '8.8.8.8']);
    
    // Register outputs
    this.registerOutputs({
      bridges: this.bridges,
      vlans: this.vlans,
      firewallRules: this.firewallRules,
      ipRanges: this.ipRanges,
      domain: this.domain,
      dnsServers: this.dnsServers,
    });
    
    logger.info(`Network component initialized successfully`, {
      bridgeCount: bridges.length,
      vlanCount: vlans.length,
      firewallRuleCount: firewallRules.length,
    });
  }
  
  /**
   * Initialize bridge information
   * Note: This assumes bridges are pre-configured in Proxmox
   */
  private initializeBridges(bridgeConfigs: BridgeConfig[]): BridgeInfo[] {
    return bridgeConfigs.map(config => {
      logger.debug(`Initializing bridge configuration: ${config.name}`, config);
      
      return {
        name: config.name,
        interface: config.interface,
        mtu: config.mtu || 1500,
        vlanAware: config.vlanAware || false,
        status: 'active', // Assume active, would need Proxmox API call to verify
        vlans: [], // Will be populated when VLANs are initialized
      };
    });
  }
  
  /**
   * Initialize VLAN information and associate with bridges
   */
  private initializeVLANs(vlanConfigs: VLANConfig[], bridges: BridgeInfo[]): VLANInfo[] {
    const vlans = vlanConfigs.map(config => {
      logger.debug(`Initializing VLAN configuration: ${config.name} (ID: ${config.id})`, config);
      
      // Find the associated bridge
      const bridge = bridges.find(b => b.name === config.bridge);
      if (bridge) {
        bridge.vlans.push(config.id);
      }
      
      return {
        id: config.id,
        name: config.name,
        bridge: config.bridge,
        ipRange: config.ipRange,
        gateway: config.gateway,
        allocatedIPs: [], // Track allocated IPs
      };
    });
    
    return vlans;
  }
  
  /**
   * Initialize firewall rules configuration
   * Note: This tracks intended firewall configuration
   */
  private initializeFirewallRules(firewallConfig?: FirewallConfig): FirewallRuleInfo[] {
    if (!firewallConfig || !firewallConfig.enabled) {
      logger.info('Firewall configuration disabled or not provided');
      return [];
    }
    
    logger.info(`Initializing firewall configuration with ${firewallConfig.rules?.length || 0} rules`);
    
    return (firewallConfig.rules || []).map((rule, index) => ({
      id: `rule-${index + 1}`,
      action: rule.action,
      direction: rule.direction,
      protocol: rule.protocol,
      source: rule.source,
      destination: rule.destination,
      port: rule.port?.toString(),
      comment: rule.comment,
      enabled: true, // All configured rules are enabled by default
    }));
  }
  
  /**
   * Initialize IP ranges for allocation tracking
   */
  private initializeIPRanges(vlans: VLANInfo[]): IPRangeInfo[] {
    return vlans
      .filter(vlan => vlan.ipRange)
      .map(vlan => {
        const ipRange = this.parseIPRange(vlan.ipRange!);
        
        // Initialize allocation tracking for this range
        this.ipAllocationState.set(vlan.ipRange!, new Set<string>());
        
        logger.debug(`Initialized IP range for VLAN ${vlan.name}`, {
          cidr: vlan.ipRange,
          availableIPs: ipRange.availableIPs.length,
        });
        
        return {
          cidr: vlan.ipRange!,
          startIP: ipRange.startIP,
          endIP: ipRange.endIP,
          gateway: vlan.gateway,
          availableIPs: ipRange.availableIPs,
          allocatedIPs: [],
          vlan: vlan.id,
        };
      });
  }
  
  /**
   * Parse IP range from CIDR notation
   */
  private parseIPRange(cidr: string): { startIP: string; endIP: string; availableIPs: string[] } {
    const [network, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);
    
    // Simple IP range calculation (IPv4 only)
    // This is a basic implementation - in production, use a proper IP library
    const networkParts = network.split('.').map(Number);
    const hostBits = 32 - prefix;
    const totalHosts = Math.pow(2, hostBits);
    
    // Reserve first and last IPs (network and broadcast)
    const availableIPs: string[] = [];
    for (let i = 1; i < totalHosts - 1; i++) {
      const ip = this.calculateIPAddress(networkParts, i);
      availableIPs.push(ip);
    }
    
    return {
      startIP: this.calculateIPAddress(networkParts, 1),
      endIP: this.calculateIPAddress(networkParts, totalHosts - 2),
      availableIPs,
    };
  }
  
  /**
   * Calculate IP address from network base and offset
   */
  private calculateIPAddress(networkParts: number[], offset: number): string {
    // Simple IPv4 calculation
    const ip = [...networkParts];
    let remaining = offset;
    
    for (let i = 3; i >= 0; i--) {
      const add = remaining % 256;
      ip[i] = (ip[i] + add) % 256;
      remaining = Math.floor(remaining / 256);
    }
    
    return ip.join('.');
  }
  
  /**
   * Allocate an IP address from the specified VLAN
   */
  public allocateIP(vlanId: number, preferredIP?: string): string | null {
    const vlan = this.vlans.apply(vlans => vlans.find(v => v.id === vlanId));
    if (!vlan) {
      logger.error(`VLAN ${vlanId} not found for IP allocation`);
      return null;
    }
    
    // This would be implemented with actual IP allocation logic
    // For now, return a placeholder
    logger.info(`IP allocation requested for VLAN ${vlanId}`, { preferredIP });
    return preferredIP || '192.168.1.100'; // Placeholder
  }
  
  /**
   * Release an allocated IP address
   */
  public releaseIP(ip: string, vlanId: number): boolean {
    logger.info(`Releasing IP ${ip} from VLAN ${vlanId}`);
    
    // This would be implemented with actual IP release logic
    return true; // Placeholder
  }
  
  /**
   * Get network information for a specific VLAN
   */
  public getVLANInfo(vlanId: number): pulumi.Output<VLANInfo | undefined> {
    return this.vlans.apply(vlans => vlans.find(v => v.id === vlanId));
  }
  
  /**
   * Get bridge information by name
   */
  public getBridgeInfo(bridgeName: string): pulumi.Output<BridgeInfo | undefined> {
    return this.bridges.apply(bridges => bridges.find(b => b.name === bridgeName));
  }
  
  /**
   * Validate network configuration
   */
  public validateConfiguration(): pulumi.Output<{ valid: boolean; errors: string[] }> {
    return pulumi.all([this.bridges, this.vlans]).apply(([bridges, vlans]) => {
      const errors: string[] = [];
      
      // Validate that all VLANs reference existing bridges
      vlans.forEach(vlan => {
        const bridge = bridges.find(b => b.name === vlan.bridge);
        if (!bridge) {
          errors.push(`VLAN ${vlan.name} references non-existent bridge ${vlan.bridge}`);
        }
      });
      
      // Validate IP ranges
      vlans.forEach(vlan => {
        if (vlan.ipRange && !this.isValidCIDR(vlan.ipRange)) {
          errors.push(`VLAN ${vlan.name} has invalid IP range: ${vlan.ipRange}`);
        }
      });
      
      return {
        valid: errors.length === 0,
        errors,
      };
    });
  }
  
  /**
   * Validate CIDR notation
   */
  private isValidCIDR(cidr: string): boolean {
    const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!cidrRegex.test(cidr)) {
      return false;
    }
    
    const [network, prefix] = cidr.split('/');
    const prefixNum = parseInt(prefix, 10);
    
    if (prefixNum < 0 || prefixNum > 32) {
      return false;
    }
    
    const parts = network.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }
}

/**
 * Utility function to create a network component
 */
export function createNetworkComponent(
  name: string,
  props: NetworkComponentProps,
  opts?: pulumi.ComponentResourceOptions
): NetworkComponent {
  return new NetworkComponent(name, props, opts);
}