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
  security: SecurityConfig;
  monitoring?: MonitoringConfig;
  backup?: BackupConfig;
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

// Security Configuration
export interface SecurityConfig {
  firewall: FirewallConfig;
  automaticUpdates: boolean;
  auditLogging: boolean;
}

export interface FirewallConfig {
  enabled: boolean;
  defaultPolicy: 'allow' | 'deny';
  rules: FirewallRule[];
}

export interface FirewallRule {
  name: string;
  direction: 'in' | 'out';
  action: 'allow' | 'deny';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  port?: number | string;
  source?: string;
  destination?: string;
}

// Monitoring Configuration
export interface MonitoringConfig {
  enabled: boolean;
  prometheus: PrometheusConfig;
  grafana: GrafanaConfig;
}

export interface PrometheusConfig {
  retention: string;
  storageSize: string;
  scrapeInterval: string;
}

export interface GrafanaConfig {
  adminPassword: pulumi.Output<string>;
  persistence: boolean;
  storageSize: string;
}

// Backup Configuration
export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: number;
  storage: BackupStorageConfig;
  targets: BackupTarget[];
}

export interface BackupStorageConfig {
  type: 'local' | 'nfs' | 's3';
  path: string;
  credentials?: Record<string, pulumi.Output<string>>;
}

export interface BackupTarget {
  name: string;
  type: 'vm' | 'container' | 'volume';
  id: string | number;
  compress: boolean;
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
