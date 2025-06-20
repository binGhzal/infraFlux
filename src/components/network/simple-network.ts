/**
 * Simplified Network Management using Native Proxmox Provider
 * 
 * Replaces complex NetworkComponent with direct provider usage
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { logger } from '../../utils/logger';

/**
 * Simplified network configuration
 */
export interface SimpleNetworkConfig {
  /** Bridge name (e.g., vmbr0) */
  bridge: string;
  
  /** Optional VLAN ID */
  vlan?: number;
  
  /** IP configuration type */
  ipConfig: 'dhcp' | { ip: string; gateway?: string; netmask?: string };
}

/**
 * Network device configuration for VMs
 */
export interface NetworkDeviceConfig {
  bridge: string;
  model: string;
  enabled?: boolean;
  vlanId?: number;
  macAddress?: string;
  firewall?: boolean;
}

/**
 * Create network bridge using native provider
 */
export function createNetworkBridge(
  name: string,
  args: {
    nodeName: string;
    comment?: string;
    ports?: string[];
    vlanAware?: boolean;
  },
  provider: proxmoxve.Provider,
  opts?: pulumi.ResourceOptions
): proxmoxve.network.NetworkBridge {
  logger.debug(`Creating network bridge: ${name}`, args);

  return new proxmoxve.network.NetworkBridge(
    name,
    {
      nodeName: args.nodeName,
      comment: args.comment || `Bridge ${name}`,
      ports: args.ports || [],
      vlanAware: args.vlanAware || false,
    },
    {
      ...opts,
      provider,
    }
  );
}

/**
 * Create VLAN using native provider
 */
export function createNetworkVlan(
  name: string,
  args: {
    nodeName: string;
    vlanId: number;
    interface: string;
    comment?: string;
  },
  provider: proxmoxve.Provider,
  opts?: pulumi.ResourceOptions
): proxmoxve.network.NetworkVlan {
  logger.debug(`Creating VLAN: ${name} (ID: ${args.vlanId})`, args);

  return new proxmoxve.network.NetworkVlan(
    name,
    {
      nodeName: args.nodeName,
      vlan: args.vlanId,
      interface: args.interface,
      comment: args.comment || `VLAN ${args.vlanId}`,
    },
    {
      ...opts,
      provider,
    }
  );
}

/**
 * Create network device configuration for VM
 */
export function createNetworkDevice(
  bridge: string,
  options: {
    vlan?: number | undefined;
    model?: string;
    firewall?: boolean;
    macAddress?: string | undefined;
  } = {}
): NetworkDeviceConfig {
  return {
    bridge,
    model: options.model || 'virtio',
    enabled: true,
    ...(options.vlan !== undefined && { vlanId: options.vlan }),
    ...(options.macAddress && { macAddress: options.macAddress }),
    firewall: options.firewall ?? true,
  };
}

/**
 * Generate MAC address (simple implementation)
 */
export function generateMacAddress(): string {
  // Generate locally administered MAC (02:xx:xx:xx:xx:xx)
  const prefix = '02';
  const suffix = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join(':');
  
  return `${prefix}:${suffix}`;
}

/**
 * Simple network configuration utilities
 */
export const NetworkUtils = {
  createBridge: createNetworkBridge,
  createVlan: createNetworkVlan,
  createDevice: createNetworkDevice,
  generateMac: generateMacAddress,
};