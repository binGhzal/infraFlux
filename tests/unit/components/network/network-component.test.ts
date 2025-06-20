/**
 * Unit tests for NetworkComponent
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import * as pulumi from '@pulumi/pulumi';
import {
  NetworkComponent,
  NetworkComponentProps,
  BridgeInfo,
  VLANInfo,
  FirewallRuleInfo,
  IPRangeInfo,
  createNetworkComponent,
} from '../../../../src/components/network/network-component';
import { NetworkConfig } from '../../../../src/types';

// Mock the Pulumi Proxmox provider
jest.mock('@muhlba91/pulumi-proxmoxve', () => ({
  Provider: jest.fn().mockImplementation((name, config, opts) => ({
    id: `provider-${name}`,
    ...config,
    ...opts,
  })),
}));

// Mock Pulumi
jest.mock('@pulumi/pulumi', () => ({
  ComponentResource: class MockComponentResource {
    constructor(type: string, name: string, args: any, opts?: any) {
      Object.assign(this, { type, name, args, opts });
    }
    registerOutputs(outputs: any) {
      Object.assign(this, { outputs });
    }
  },
  output: jest.fn((value) => ({
    apply: jest.fn((fn) => fn(value)),
  })),
  all: jest.fn((values) => ({
    apply: jest.fn((fn) => fn(values)),
  })),
}));

// Mock logger
jest.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('NetworkComponent', () => {
  let mockProvider: any;
  let basicNetworkConfig: NetworkConfig;
  let basicProps: NetworkComponentProps;
  
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock provider
    mockProvider = {
      id: 'test-provider',
      endpoint: 'https://test-proxmox:8006',
    };
    
    // Basic network configuration
    basicNetworkConfig = {
      domain: 'test.local',
      dns: ['1.1.1.1', '8.8.8.8'],
      bridges: [
        {
          name: 'vmbr0',
          interface: 'eth0',
          mtu: 1500,
          vlanAware: true,
        },
        {
          name: 'vmbr1',
          vlanAware: false,
        },
      ],
      vlans: [
        {
          id: 10,
          name: 'management',
          bridge: 'vmbr0',
          ipRange: '192.168.10.0/24',
          gateway: '192.168.10.1',
        },
        {
          id: 20,
          name: 'cluster',
          bridge: 'vmbr0',
          ipRange: '192.168.20.0/24',
          gateway: '192.168.20.1',
        },
      ],
      firewall: {
        enabled: true,
        defaultPolicy: 'drop',
        rules: [
          {
            action: 'accept',
            direction: 'in',
            protocol: 'tcp',
            port: 22,
            comment: 'Allow SSH',
          },
          {
            action: 'accept',
            direction: 'in',
            protocol: 'tcp',
            source: '192.168.10.0/24',
            destination: '192.168.20.0/24',
            comment: 'Allow management to cluster',
          },
        ],
      },
    };
    
    // Basic component props
    basicProps = {
      network: basicNetworkConfig,
      proxmoxProvider: mockProvider,
      nodeName: 'test-node',
    };
  });
  
  describe('Constructor', () => {
    it('should create network component with valid configuration', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      expect(component).toBeInstanceOf(NetworkComponent);
      expect(component.bridges).toBeDefined();
      expect(component.vlans).toBeDefined();
      expect(component.firewallRules).toBeDefined();
      expect(component.ipRanges).toBeDefined();
      expect(component.domain).toBeDefined();
      expect(component.dnsServers).toBeDefined();
    });
    
    it('should handle empty network configuration', () => {
      const emptyProps: NetworkComponentProps = {
        network: { domain: 'empty.local' },
        proxmoxProvider: mockProvider,
        nodeName: 'test-node',
      };
      
      const component = new NetworkComponent('empty-network', emptyProps);
      expect(component).toBeInstanceOf(NetworkComponent);
    });
    
    it('should use default values for missing configuration', () => {
      const minimalProps: NetworkComponentProps = {
        network: {},
        proxmoxProvider: mockProvider,
        nodeName: 'test-node',
      };
      
      const component = new NetworkComponent('minimal-network', minimalProps);
      expect(component).toBeInstanceOf(NetworkComponent);
    });
  });
  
  describe('Bridge Initialization', () => {
    it('should initialize bridges with correct properties', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      // Verify bridge initialization through the apply mock
      const bridgesApplyFn = (component.bridges as any).apply;
      expect(bridgesApplyFn).toHaveBeenCalled();
      
      // Test bridge configuration logic
      const bridges = component['initializeBridges'](basicNetworkConfig.bridges!);
      
      expect(bridges).toHaveLength(2);
      expect(bridges[0]).toMatchObject({
        name: 'vmbr0',
        interface: 'eth0',
        mtu: 1500,
        vlanAware: true,
        status: 'active',
        vlans: expect.any(Array),
      });
      
      expect(bridges[1]).toMatchObject({
        name: 'vmbr1',
        mtu: 1500, // Default value
        vlanAware: false,
        status: 'active',
      });
    });
    
    it('should apply default MTU when not specified', () => {
      const bridgeConfig = [{
        name: 'vmbr-test',
      }];
      
      const component = new NetworkComponent('test-network', basicProps);
      const bridges = component['initializeBridges'](bridgeConfig);
      
      expect(bridges[0].mtu).toBe(1500);
    });
  });
  
  describe('VLAN Initialization', () => {
    it('should initialize VLANs and associate with bridges', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      const bridges = component['initializeBridges'](basicNetworkConfig.bridges!);
      const vlans = component['initializeVLANs'](basicNetworkConfig.vlans!, bridges);
      
      expect(vlans).toHaveLength(2);
      expect(vlans[0]).toMatchObject({
        id: 10,
        name: 'management',
        bridge: 'vmbr0',
        ipRange: '192.168.10.0/24',
        gateway: '192.168.10.1',
        allocatedIPs: [],
      });
      
      expect(vlans[1]).toMatchObject({
        id: 20,
        name: 'cluster',
        bridge: 'vmbr0',
        ipRange: '192.168.20.0/24',
        gateway: '192.168.20.1',
      });
      
      // Verify VLANs are associated with bridges
      const vmbr0 = bridges.find(b => b.name === 'vmbr0');
      expect(vmbr0?.vlans).toContain(10);
      expect(vmbr0?.vlans).toContain(20);
    });
    
    it('should handle VLANs without IP ranges', () => {
      const vlanConfig = [{
        id: 100,
        name: 'test-vlan',
        bridge: 'vmbr0',
      }];
      
      const component = new NetworkComponent('test-network', basicProps);
      const bridges = component['initializeBridges'](basicNetworkConfig.bridges!);
      const vlans = component['initializeVLANs'](vlanConfig, bridges);
      
      expect(vlans[0]).toMatchObject({
        id: 100,
        name: 'test-vlan',
        bridge: 'vmbr0',
        ipRange: undefined,
        gateway: undefined,
      });
    });
  });
  
  describe('Firewall Rules Initialization', () => {
    it('should initialize firewall rules when enabled', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const rules = component['initializeFirewallRules'](basicNetworkConfig.firewall);
      
      expect(rules).toHaveLength(2);
      expect(rules[0]).toMatchObject({
        id: 'rule-1',
        action: 'accept',
        direction: 'in',
        protocol: 'tcp',
        port: '22',
        comment: 'Allow SSH',
        enabled: true,
      });
      
      expect(rules[1]).toMatchObject({
        id: 'rule-2',
        action: 'accept',
        direction: 'in',
        protocol: 'tcp',
        source: '192.168.10.0/24',
        destination: '192.168.20.0/24',
        comment: 'Allow management to cluster',
        enabled: true,
      });
    });
    
    it('should return empty array when firewall is disabled', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const disabledFirewall = { enabled: false, defaultPolicy: 'accept' as const, rules: [] };
      const rules = component['initializeFirewallRules'](disabledFirewall);
      
      expect(rules).toHaveLength(0);
    });
    
    it('should handle undefined firewall configuration', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const rules = component['initializeFirewallRules'](undefined);
      
      expect(rules).toHaveLength(0);
    });
  });
  
  describe('IP Range Initialization and Parsing', () => {
    it('should parse CIDR notation correctly', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const result = component['parseIPRange']('192.168.1.0/24');
      
      expect(result.startIP).toBe('192.168.1.1');
      expect(result.endIP).toBe('192.168.1.254');
      expect(result.availableIPs).toHaveLength(254);
      expect(result.availableIPs[0]).toBe('192.168.1.1');
      expect(result.availableIPs[253]).toBe('192.168.1.254');
    });
    
    it('should handle different subnet sizes', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      // Test /30 network (4 addresses, 2 usable)
      const small = component['parseIPRange']('192.168.1.0/30');
      expect(small.availableIPs).toHaveLength(2);
      expect(small.startIP).toBe('192.168.1.1');
      expect(small.endIP).toBe('192.168.1.2');
      
      // Test /16 network
      const large = component['parseIPRange']('10.0.0.0/16');
      expect(large.availableIPs).toHaveLength(65534);
      expect(large.startIP).toBe('10.0.0.1');
      expect(large.endIP).toBe('10.0.255.254');
    });
    
    it('should calculate IP addresses correctly', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      expect(component['calculateIPAddress']([192, 168, 1, 0], 1)).toBe('192.168.1.1');
      expect(component['calculateIPAddress']([192, 168, 1, 0], 255)).toBe('192.168.1.255');
      expect(component['calculateIPAddress']([10, 0, 0, 0], 256)).toBe('10.0.1.0');
      expect(component['calculateIPAddress']([10, 0, 0, 0], 65536)).toBe('10.1.0.0');
    });
  });
  
  describe('IP Allocation Methods', () => {
    it('should allocate IP from VLAN', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      // Mock the vlans output
      (component.vlans as any).apply = jest.fn((fn) => fn([
        { id: 10, name: 'test', ipRange: '192.168.1.0/24' }
      ]));
      
      const ip = component.allocateIP(10, '192.168.1.100');
      expect(ip).toBe('192.168.1.100');
    });
    
    it('should return null for non-existent VLAN', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      // Mock empty vlans
      (component.vlans as any).apply = jest.fn((fn) => fn([]));
      
      const ip = component.allocateIP(999);
      expect(ip).toBeNull();
    });
    
    it('should release IP address', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      const result = component.releaseIP('192.168.1.100', 10);
      expect(result).toBe(true);
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate CIDR notation', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      expect(component['isValidCIDR']('192.168.1.0/24')).toBe(true);
      expect(component['isValidCIDR']('10.0.0.0/8')).toBe(true);
      expect(component['isValidCIDR']('172.16.0.0/12')).toBe(true);
      
      expect(component['isValidCIDR']('192.168.1.0/33')).toBe(false); // Invalid prefix
      expect(component['isValidCIDR']('256.1.1.0/24')).toBe(false); // Invalid IP
      expect(component['isValidCIDR']('192.168.1')).toBe(false); // Missing prefix
      expect(component['isValidCIDR']('not-an-ip/24')).toBe(false); // Invalid format
    });
    
    it('should validate network configuration', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      // Mock the validation method dependencies
      const mockBridges = [{ name: 'vmbr0' }, { name: 'vmbr1' }];
      const mockVlans = [
        { name: 'valid-vlan', bridge: 'vmbr0', ipRange: '192.168.1.0/24' },
        { name: 'invalid-bridge', bridge: 'nonexistent', ipRange: '192.168.2.0/24' },
        { name: 'invalid-ip', bridge: 'vmbr1', ipRange: 'invalid-cidr' }
      ];
      
      (pulumi.all as jest.Mock).mockReturnValue({
        apply: jest.fn((fn) => fn([mockBridges, mockVlans]))
      });
      
      const result = component.validateConfiguration();
      
      // Verify the validation logic
      expect(pulumi.all).toHaveBeenCalledWith([component.bridges, component.vlans]);
    });
  });
  
  describe('Helper Methods', () => {
    it('should get VLAN info by ID', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      const mockVlans = [
        { id: 10, name: 'test-vlan' },
        { id: 20, name: 'other-vlan' }
      ];
      
      (component.vlans as any).apply = jest.fn((fn) => fn(mockVlans));
      
      const result = component.getVLANInfo(10);
      expect(result).toBeDefined();
    });
    
    it('should get bridge info by name', () => {
      const component = new NetworkComponent('test-network', basicProps);
      
      const mockBridges = [
        { name: 'vmbr0', mtu: 1500 },
        { name: 'vmbr1', mtu: 9000 }
      ];
      
      (component.bridges as any).apply = jest.fn((fn) => fn(mockBridges));
      
      const result = component.getBridgeInfo('vmbr0');
      expect(result).toBeDefined();
    });
  });
  
  describe('Utility Functions', () => {
    it('should create network component with createNetworkComponent', () => {
      const component = createNetworkComponent('test', basicProps);
      expect(component).toBeInstanceOf(NetworkComponent);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle very small subnet (/31)', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const result = component['parseIPRange']('192.168.1.0/31');
      
      // /31 has 2 addresses, 0 usable (network and broadcast)
      expect(result.availableIPs).toHaveLength(0);
    });
    
    it('should handle /32 subnet (single host)', () => {
      const component = new NetworkComponent('test-network', basicProps);
      const result = component['parseIPRange']('192.168.1.1/32');
      
      expect(result.availableIPs).toHaveLength(0);
    });
    
    it('should handle zero VLAN ID', () => {
      const vlanConfig = [{
        id: 0,
        name: 'native-vlan',
        bridge: 'vmbr0',
      }];
      
      const component = new NetworkComponent('test-network', basicProps);
      const bridges = component['initializeBridges'](basicNetworkConfig.bridges!);
      const vlans = component['initializeVLANs'](vlanConfig, bridges);
      
      expect(vlans[0].id).toBe(0);
      expect(vlans[0].name).toBe('native-vlan');
    });
  });
});