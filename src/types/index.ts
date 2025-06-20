/**
 * Core type definitions for InfraFlux v2.0 - Talos Edition
 */

import * as pulumi from '@pulumi/pulumi';

// Project Configuration
export interface InfraFluxConfig {
  environment: 'dev' | 'staging' | 'prod';
  project: ProjectConfig;
  proxmox: ProxmoxConfig;
  network: NetworkConfig;
  vm: VMConfig;
  kubernetes: KubernetesConfig;
}

export interface ProjectConfig {
  name: string;
  description: string;
  tags: Record<string, string>;
}

// Proxmox Configuration
export interface ProxmoxConfig {
  endpoint: string;
  username: string;
  password?: pulumi.Output<string>;
  node: string;
  insecure: boolean;
}

// Network Configuration
export interface NetworkConfig {
  bridge: string;
  domain: string;
  dnsServers: string[];
  gateway: string;
  subnet: string;
}

// VM Configuration (Talos only)
export interface VMConfig {
  templateId: number; // Talos template ID
  forceDownload: boolean; // Force ISO download
  defaults: VMDefaults;
}

export interface VMDefaults {
  cores: number;
  memory: number;
  diskSize: string;
  storagePool: string;
  isoStoragePool: string;
  diskFormat: 'raw' | 'qcow2';
}

export interface VMSpec {
  name: string;
  vmId?: number;
  cores?: number;
  memory?: number;
  diskSize?: string;
  ipAddress: string;
  userData?: string; // Talos machine configuration
  startOnBoot?: boolean;
  tags?: string[];
}

// Kubernetes Configuration (Talos only)
export interface KubernetesConfig {
  version: string;
  masterNodes: number;
  workerNodes: number;
  masterSpecs?: NodeSpec;
  workerSpecs?: NodeSpec;
  networking?: K8sNetworkingConfig;
  features?: K8sFeatures;
}

export interface NodeSpec {
  cores: number;
  memory: number;
  diskSize: string;
}

export interface K8sNetworkingConfig {
  podCIDR: string;
  serviceCIDR: string;
  clusterDNS: string[];
  cni: 'cilium'; // Talos uses Cilium
}

export interface K8sFeatures {
  serviceLB: boolean;
  metricsServer: boolean;
  localStorage: boolean;
}

// Network Configuration (can be auto-discovered from Proxmox)
export interface NetworkDiscoveryConfig {
  autoDiscover: boolean;
  fallbackConfig?: NetworkConfig;
}

// Component Output Types
export interface VMOutput {
  id: pulumi.Output<number>;
  name: pulumi.Output<string>;
  ipAddress: pulumi.Output<string>;
  macAddress: pulumi.Output<string>;
  status: pulumi.Output<string>;
}

export interface ClusterOutput {
  name: pulumi.Output<string>;
  apiEndpoint: pulumi.Output<string>;
  kubeconfig: pulumi.Output<string>;
  masterNodes: VMOutput[];
  workerNodes: VMOutput[];
}
