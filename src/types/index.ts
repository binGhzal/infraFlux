/**
 * Core type definitions for InfraFlux v2.0
 */

import * as pulumi from '@pulumi/pulumi';

// Configuration Interfaces
export interface GlobalConfig {
  project: ProjectConfig;
  proxmox: ProxmoxConfig;
  cluster: ClusterConfig;
  network: NetworkConfig;
  storage: StorageConfig;
  security: SecurityConfig;
}

export interface ProjectConfig {
  name: string;
  version: string;
  description: string;
  environment: 'dev' | 'staging' | 'prod';
  region: string;
  tags: Record<string, string>;
}

export interface ProxmoxConfig {
  endpoint: string;
  node: string;
  datastore: string;
  networkBridge: string;
  apiToken: {
    id: string;
    secret: string;
  };
  ssl: {
    verify: boolean;
    caPath?: string;
  };
}

export interface ClusterConfig {
  name: string;
  version: string;
  distribution: 'talos' | 'k3s';
  networking: ClusterNetworking;
  nodes: NodeConfig[];
  features: ClusterFeatures;
}

export interface ClusterNetworking {
  podSubnet: string;
  serviceSubnet: string;
  clusterDomain: string;
  cni: 'cilium' | 'calico' | 'flannel';
  networkPolicies: boolean;
  serviceMesh?: 'istio' | 'linkerd';
}

export interface ClusterFeatures {
  monitoring: boolean;
  logging: boolean;
  backups: boolean;
  gitops: boolean;
  secretManagement: boolean;
  ingress: boolean;
  storageClass: boolean;
}

export interface NodeConfig {
  name: string;
  role: 'control-plane' | 'worker';
  template: string;
  specs: NodeSpecs;
  taints?: NodeTaint[];
  labels?: Record<string, string>;
}

export interface NodeSpecs {
  cores: number;
  memory: number; // MB
  disk: DiskConfig[];
  network: NetworkInterface[];
}

export interface DiskConfig {
  size: string; // e.g., "100G"
  format: 'qcow2' | 'raw' | 'vmdk';
  cache: 'none' | 'writethrough' | 'writeback';
  backup: boolean;
  replicate: boolean;
}

export interface NetworkInterface {
  bridge: string;
  vlan?: number;
  mac?: string;
  dhcp: boolean;
  ip?: string;
  gateway?: string;
}

export interface NodeTaint {
  key: string;
  value: string;
  effect: 'NoSchedule' | 'PreferNoSchedule' | 'NoExecute';
}

// Network Configuration
export interface NetworkConfig {
  domain: string;
  dns: DNSConfig;
  vlans: VLANConfig[];
  bridges: BridgeConfig[];
  firewall: FirewallConfig;
}

export interface DNSConfig {
  servers: string[];
  searchDomains: string[];
}

export interface VLANConfig {
  id: number;
  name: string;
  description: string;
  subnet: string;
  gateway: string;
  dhcp: DHCPConfig;
}

export interface BridgeConfig {
  name: string;
  ports: string[];
  vlanAware: boolean;
  stp: boolean;
  fastForward: boolean;
}

export interface DHCPConfig {
  enabled: boolean;
  range: {
    start: string;
    end: string;
  };
  reservations: DHCPReservation[];
}

export interface DHCPReservation {
  mac: string;
  ip: string;
  hostname: string;
}

export interface FirewallConfig {
  enabled: boolean;
  defaultPolicy: 'ACCEPT' | 'DROP';
  rules: FirewallRule[];
}

export interface FirewallRule {
  action: 'ACCEPT' | 'DROP' | 'REJECT';
  direction: 'IN' | 'OUT';
  protocol: 'tcp' | 'udp' | 'icmp' | 'all';
  source?: string;
  destination?: string;
  port?: number | string;
  comment?: string;
}

// Storage Configuration
export interface StorageConfig {
  datastores: DatastoreConfig[];
  volumes: VolumeConfig[];
  backups: BackupConfig;
}

export interface DatastoreConfig {
  name: string;
  type: 'dir' | 'lvm' | 'zfs' | 'ceph';
  path: string;
  maxFiles?: number;
  shared: boolean;
  content: ContentType[];
}

export type ContentType = 'images' | 'iso' | 'backup' | 'vztmpl' | 'snippets';

export interface VolumeConfig {
  name: string;
  size: string;
  format: 'qcow2' | 'raw' | 'vmdk';
  cache: 'none' | 'writethrough' | 'writeback';
  backup: boolean;
  replicate: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // Cron expression
  retention: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  storage: string;
  compression: 'none' | 'lzo' | 'gzip' | 'zstd';
}

// Security Configuration
export interface SecurityConfig {
  rbac: RBACConfig;
  networkPolicies: NetworkPolicyConfig[];
  secretEncryption: SecretEncryptionConfig;
  certificateManagement: CertificateConfig;
}

export interface RBACConfig {
  enabled: boolean;
  adminUsers: string[];
  adminGroups: string[];
  readOnlyUsers: string[];
  readOnlyGroups: string[];
}

export interface NetworkPolicyConfig {
  name: string;
  namespace: string;
  spec: NetworkPolicySpec;
}

export interface NetworkPolicySpec {
  podSelector: LabelSelector;
  policyTypes: ('Ingress' | 'Egress')[];
  ingress?: IngressRule[];
  egress?: EgressRule[];
}

export interface LabelSelector {
  matchLabels?: Record<string, string>;
  matchExpressions?: LabelSelectorRequirement[];
}

export interface LabelSelectorRequirement {
  key: string;
  operator: 'In' | 'NotIn' | 'Exists' | 'DoesNotExist';
  values?: string[];
}

export interface IngressRule {
  from?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface EgressRule {
  to?: NetworkPolicyPeer[];
  ports?: NetworkPolicyPort[];
}

export interface NetworkPolicyPeer {
  podSelector?: LabelSelector;
  namespaceSelector?: LabelSelector;
  ipBlock?: IPBlock;
}

export interface IPBlock {
  cidr: string;
  except?: string[];
}

export interface NetworkPolicyPort {
  protocol?: 'TCP' | 'UDP' | 'SCTP';
  port?: number | string;
  endPort?: number;
}

export interface SecretEncryptionConfig {
  provider: 'esc' | 'vault' | 'sealed-secrets';
  keyRotation: boolean;
  rotationInterval: string;
}

export interface CertificateConfig {
  issuer: 'cert-manager' | 'manual';
  ca: {
    selfSigned: boolean;
    commonName: string;
    organization: string;
    country: string;
  };
  wildcardCerts: boolean;
}

// Resource Outputs
export interface VMOutput {
  id: string;
  name: string;
  ipAddress?: string;
  macAddress: string;
  status: 'running' | 'stopped' | 'paused';
  node: string;
  template: string;
  specs: VMSpecs;
  uptime?: number;
}

export interface ClusterOutput {
  name: string;
  endpoint: string;
  version: string;
  nodes: NodeOutput[];
  kubeconfig: string;
  status: 'ready' | 'pending' | 'error';
  components: ComponentStatus[];
}

export interface NodeOutput {
  name: string;
  role: string;
  status: 'ready' | 'notready' | 'unknown';
  addresses: NodeAddress[];
  capacity: ResourceList;
  allocatable: ResourceList;
  conditions: NodeCondition[];
}

export interface NodeAddress {
  type: 'InternalIP' | 'ExternalIP' | 'Hostname';
  address: string;
}

export interface ResourceList {
  cpu: string;
  memory: string;
  storage: string;
}

export interface NodeCondition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  lastHeartbeatTime: string;
  lastTransitionTime: string;
  reason: string;
  message: string;
}

export interface ComponentStatus {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message?: string;
}

// Pulumi Component Props
export interface ComponentProps {
  name: string;
  config: GlobalConfig;
  dependsOn?: pulumi.Resource[];
  protect?: boolean;
  provider?: pulumi.ProviderResource;
}

export interface VMComponentProps extends ComponentProps {
  specs: NodeSpecs;
  template: string;
  cloudInit?: CloudInitConfig;
}

export interface CloudInitConfig {
  userData: string;
  networkConfig?: string;
  metaData?: string;
}

// Validation Types
export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'enum' | 'custom';
  message: string;
  validator?: (value: any) => boolean;
}

export interface ValidationSchema {
  component: string;
  version: string;
  rules: ValidationRule[];
  dependencies: string[];
}

// Stack Configuration
export interface StackConfig {
  config: GlobalConfig;
  stack: string;
  region?: string;
  tags?: Record<string, string>;
}