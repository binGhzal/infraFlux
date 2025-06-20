# Infrastructure Schema for InfraFlux v2.0

## Overview

This document defines the data schemas and resource definitions for InfraFlux v2.0 infrastructure components.

## Configuration Schema

### Global Configuration

```typescript
interface GlobalConfig {
	project: ProjectConfig;
	proxmox: ProxmoxConfig;
	cluster: ClusterConfig;
	network: NetworkConfig;
	storage: StorageConfig;
	security: SecurityConfig;
}

interface ProjectConfig {
	name: string;
	version: string;
	description: string;
	environment: "dev" | "staging" | "prod";
	region: string;
	tags: Record<string, string>;
}

interface ProxmoxConfig {
	endpoint: string;
	node: string;
	datastore: string;
	networkBridge: string;
	apiToken: {
		id: string;
		secret: string; // ESC-managed secret
	};
	ssl: {
		verify: boolean;
		caPath?: string;
	};
}
```

### Cluster Configuration

```typescript
interface ClusterConfig {
	name: string;
	version: string; // Kubernetes version
	distribution: "talos" | "k3s";
	networking: ClusterNetworking;
	nodes: NodeConfig[];
	features: ClusterFeatures;
}

interface ClusterNetworking {
	podSubnet: string;
	serviceSubnet: string;
	clusterDomain: string;
	cni: "cilium" | "calico" | "flannel";
	networkPolicies: boolean;
	serviceMesh?: "istio" | "linkerd";
}

interface NodeConfig {
	name: string;
	role: "control-plane" | "worker";
	template: string;
	specs: NodeSpecs;
	taints?: NodeTaint[];
	labels?: Record<string, string>;
}

interface NodeSpecs {
	cores: number;
	memory: number; // MB
	disk: DiskConfig[];
	network: NetworkInterface[];
}
```

## Resource Schemas

### Virtual Machine Schema

```typescript
interface VMResource {
	name: string;
	template: VMTemplate;
	node: string; // Proxmox node
	specs: VMSpecs;
	initialization: CloudInitConfig;
	tags: Record<string, string>;
}

interface VMTemplate {
	name: string;
	source: TemplateSource;
	customization: TemplateCustomization;
	versioning: TemplateVersioning;
}

interface TemplateSource {
	type: "iso" | "image" | "clone";
	url?: string; // For Talos factory images
	vmId?: number; // For cloning existing VM
	checksum?: string;
}

interface VMSpecs {
	cores: number;
	sockets: number;
	memory: number;
	bios: "seabios" | "ovmf";
	agent: {
		enabled: boolean;
		type: "virtio";
		trim: boolean;
	};
	onBoot: boolean;
	protection: boolean;
}
```

### Network Schema

```typescript
interface NetworkConfig {
	domain: string;
	dns: DNSConfig;
	vlans: VLANConfig[];
	bridges: BridgeConfig[];
	firewall: FirewallConfig;
}

interface VLANConfig {
	id: number;
	name: string;
	description: string;
	subnet: string;
	gateway: string;
	dhcp: DHCPConfig;
}

interface BridgeConfig {
	name: string;
	ports: string[];
	vlanAware: boolean;
	stp: boolean;
	fastForward: boolean;
}

interface DHCPConfig {
	enabled: boolean;
	range: {
		start: string;
		end: string;
	};
	reservations: DHCPReservation[];
}

interface DHCPReservation {
	mac: string;
	ip: string;
	hostname: string;
}
```

### Storage Schema

```typescript
interface StorageConfig {
	datastores: DatastoreConfig[];
	volumes: VolumeConfig[];
	backups: BackupConfig;
}

interface DatastoreConfig {
	name: string;
	type: "dir" | "lvm" | "zfs" | "ceph";
	path: string;
	maxFiles?: number;
	shared: boolean;
	content: ContentType[];
}

type ContentType = "images" | "iso" | "backup" | "vztmpl" | "snippets";

interface VolumeConfig {
	name: string;
	size: string; // e.g., "100G"
	format: "qcow2" | "raw" | "vmdk";
	cache: "none" | "writethrough" | "writeback";
	backup: boolean;
	replicate: boolean;
}

interface BackupConfig {
	enabled: boolean;
	schedule: string; // Cron expression
	retention: {
		daily: number;
		weekly: number;
		monthly: number;
	};
	storage: string; // Backup datastore
	compression: "none" | "lzo" | "gzip" | "zstd";
}
```

## Kubernetes Resource Schemas

### Talos Configuration

```typescript
interface TalosConfig {
	version: string;
	machine: MachineConfig;
	cluster: TalosClusterConfig;
	patches: ConfigPatch[];
}

interface MachineConfig {
	type: "controlplane" | "worker";
	install: {
		disk: string;
		image: string;
		wipe: boolean;
	};
	kubelet: KubeletConfig;
	network: TalosNetworkConfig;
	sysctls: Record<string, string>;
	registries?: RegistryConfig;
}

interface TalosClusterConfig {
	name: string;
	controlPlane: {
		endpoint: string;
	};
	network: {
		dnsDomain: string;
		podSubnet: string[];
		serviceSubnet: string[];
		cni: CNIConfig;
	};
	proxy: ProxyConfig;
	discovery: DiscoveryConfig;
}

interface CNIConfig {
	name: string;
	urls?: string[];
}
```

### Application Deployment Schema

```typescript
interface ApplicationConfig {
	name: string;
	namespace: string;
	source: ApplicationSource;
	destination: ApplicationDestination;
	syncPolicy: SyncPolicy;
	resources: ResourceRequirements;
}

interface ApplicationSource {
	type: "git" | "helm" | "kustomize";
	repository: string;
	path: string;
	targetRevision: string;
	helm?: HelmConfig;
}

interface HelmConfig {
	chart: string;
	version: string;
	repository: string;
	values: Record<string, any>;
	parameters: HelmParameter[];
}

interface ResourceRequirements {
	limits: {
		cpu: string;
		memory: string;
	};
	requests: {
		cpu: string;
		memory: string;
	};
}
```

## Security Schemas

### RBAC Configuration

```typescript
interface RBACConfig {
	roles: Role[];
	clusterRoles: ClusterRole[];
	bindings: RoleBinding[];
	clusterBindings: ClusterRoleBinding[];
}

interface Role {
	name: string;
	namespace: string;
	rules: PolicyRule[];
}

interface PolicyRule {
	apiGroups: string[];
	resources: string[];
	verbs: string[];
	resourceNames?: string[];
}

interface RoleBinding {
	name: string;
	namespace: string;
	roleRef: RoleRef;
	subjects: Subject[];
}

interface Subject {
	kind: "User" | "Group" | "ServiceAccount";
	name: string;
	namespace?: string;
}
```

### Network Policy Schema

```typescript
interface NetworkPolicyConfig {
	name: string;
	namespace: string;
	spec: NetworkPolicySpec;
}

interface NetworkPolicySpec {
	podSelector: LabelSelector;
	policyTypes: ("Ingress" | "Egress")[];
	ingress?: IngressRule[];
	egress?: EgressRule[];
}

interface IngressRule {
	from?: NetworkPolicyPeer[];
	ports?: NetworkPolicyPort[];
}

interface NetworkPolicyPeer {
	podSelector?: LabelSelector;
	namespaceSelector?: LabelSelector;
	ipBlock?: IPBlock;
}
```

## Validation Schemas

### Configuration Validation

```typescript
interface ValidationRule {
	field: string;
	type: "required" | "format" | "range" | "enum" | "custom";
	message: string;
	validator?: (value: any) => boolean;
}

interface ValidationSchema {
	component: string;
	version: string;
	rules: ValidationRule[];
	dependencies: string[];
}

// Example validation rules
const vmValidationRules: ValidationRule[] = [
	{
		field: "specs.cores",
		type: "range",
		message: "CPU cores must be between 1 and 64",
		validator: (value: number) => value >= 1 && value <= 64,
	},
	{
		field: "specs.memory",
		type: "range",
		message: "Memory must be at least 512MB",
		validator: (value: number) => value >= 512,
	},
	{
		field: "name",
		type: "format",
		message: "VM name must be valid hostname format",
		validator: (value: string) => /^[a-z][a-z0-9-]*[a-z0-9]$/.test(value),
	},
];
```

## Component Output Schemas

### Resource Outputs

```typescript
interface VMOutput {
	id: string;
	name: string;
	ipAddress?: string;
	macAddress: string;
	status: "running" | "stopped" | "paused";
	node: string;
	template: string;
	specs: VMSpecs;
	uptime?: number;
}

interface ClusterOutput {
	name: string;
	endpoint: string;
	version: string;
	nodes: NodeOutput[];
	kubeconfig: string; // Base64 encoded
	status: "ready" | "pending" | "error";
	components: ComponentStatus[];
}

interface NodeOutput {
	name: string;
	role: string;
	status: "ready" | "notready" | "unknown";
	addresses: NodeAddress[];
	capacity: ResourceList;
	allocatable: ResourceList;
	conditions: NodeCondition[];
}
```

## Default Configurations

### Development Environment Defaults

```typescript
const devDefaults: Partial<GlobalConfig> = {
	cluster: {
		nodes: [
			{
				name: "control-1",
				role: "control-plane",
				specs: { cores: 2, memory: 4096 },
			},
			{ name: "worker-1", role: "worker", specs: { cores: 4, memory: 8192 } },
			{ name: "worker-2", role: "worker", specs: { cores: 4, memory: 8192 } },
		],
	},
	network: {
		domain: "homelab.local",
		dns: { servers: ["1.1.1.1", "8.8.8.8"] },
	},
};
```

### Production Environment Defaults

```typescript
const prodDefaults: Partial<GlobalConfig> = {
	cluster: {
		nodes: [
			{
				name: "control-1",
				role: "control-plane",
				specs: { cores: 4, memory: 8192 },
			},
			{
				name: "control-2",
				role: "control-plane",
				specs: { cores: 4, memory: 8192 },
			},
			{
				name: "control-3",
				role: "control-plane",
				specs: { cores: 4, memory: 8192 },
			},
			{ name: "worker-1", role: "worker", specs: { cores: 8, memory: 16384 } },
			{ name: "worker-2", role: "worker", specs: { cores: 8, memory: 16384 } },
			{ name: "worker-3", role: "worker", specs: { cores: 8, memory: 16384 } },
		],
	},
};
```
