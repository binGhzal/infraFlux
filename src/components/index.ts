export * from './vm-template';
export * from './cloud-image-template';
export * from './vm';
export * from './talos-cluster';
export * from './gitops';
export * from './network-discovery';

// Main template management exports
export {
  TalosISO,
  TalosTemplate,
  TalosTemplateManager,
} from './cloud-image-template';

// Network discovery exports (native QEMU Guest Agent approach)
export {
  ProxmoxNetworkDiscovery,
  NativeNetworkDiscovery,
  NetworkDiscovery,
  GuestAgentMonitor,
} from './network-discovery';
