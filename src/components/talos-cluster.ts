import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import * as talos from '@pulumiverse/talos';
import { ClusterOutput } from '@/types';
import { config } from '@/config';
import { VM } from './vm';
import { TalosTemplateManager } from './cloud-image-template';
import { logResource } from '@/utils/logger';

export interface TalosClusterArgs {
  provider: proxmox.Provider;
  templateManager: TalosTemplateManager;
  startingIP: number; // Starting IP in the last octet (e.g., 200 for 192.168.1.200)
}

export class TalosCluster extends pulumi.ComponentResource {
  public readonly output: ClusterOutput;
  public readonly talosConfig: pulumi.Output<string>;

  constructor(
    name: string,
    args: TalosClusterArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:k8s:TalosCluster', name, {}, opts);

    logResource('TalosCluster', 'Creating', { name });

    // Calculate base IP and endpoint
    const baseIP = config.network.gateway.split('.').slice(0, 3).join('.');
    const clusterEndpoint = `https://${baseIP}.${args.startingIP}:6443`;

    // Generate cluster secrets
    const secrets = new talos.machine.Secrets(
      `${name}-secrets`,
      {},
      { parent: this }
    );

    // Create control plane VMs with safe VM ID range (8000+)
    const masters: VM[] = [];
    const masterConfigs: talos.machine.ConfigurationApply[] = [];

    for (let i = 0; i < config.kubernetes.masterNodes; i++) {
      const masterIP = `${baseIP}.${args.startingIP + i}`;

      const master = new VM(
        `${name}-master-${i}`,
        {
          provider: args.provider,
          template: args.templateManager.masterTemplate, // Use master template
          spec: {
            name: `${name}-master-${i}`,
            vmId: 8000 + i, // Safe range to avoid conflicts
            cores: config.kubernetes.masterSpecs?.cores,
            memory: config.kubernetes.masterSpecs?.memory,
            diskSize: config.kubernetes.masterSpecs?.diskSize,
            ipAddress: masterIP,
            tags: ['talos', 'control-plane', name, 'infraflux-managed'],
            startOnBoot: true,
          },
        },
        {
          parent: this,
          dependsOn: [args.templateManager.masterTemplate], // Wait for template
        }
      );

      masters.push(master);

      // Generate machine configuration for this control plane node
      const machineConfig = talos.machine.getConfigurationOutput({
        clusterName: name,
        machineType: 'controlplane',
        clusterEndpoint,
        machineSecrets: secrets.machineSecrets,
      });

      // Apply configuration to the VM
      const configApply = new talos.machine.ConfigurationApply(
        `${name}-master-${i}-config`,
        {
          clientConfiguration: secrets.clientConfiguration,
          machineConfigurationInput: machineConfig.machineConfiguration,
          node: masterIP,
          configPatches: [
            // Apply patches for hostname, network, and custom installer
            pulumi.jsonStringify({
              machine: {
                install: {
                  disk: '/dev/vda', // Talos disk device in Proxmox VM
                  image: args.templateManager.iso.installerImage, // Custom factory image
                  wipe: false,
                },
                network: {
                  hostname: `${name}-master-${i}`,
                  interfaces: [
                    {
                      interface: 'eth0',
                      addresses: [`${masterIP}/24`],
                      routes: [
                        {
                          network: '0.0.0.0/0',
                          gateway: config.network.gateway,
                        },
                      ],
                    },
                  ],
                  nameservers: config.network.dnsServers,
                },
                features: {
                  rbac: true,
                  stableHostname: true,
                  apidCheckExtKeyUsage: true,
                },
              },
            }),
          ],
        },
        {
          parent: this,
          dependsOn: [master],
        }
      );

      masterConfigs.push(configApply);
    }

    // Create worker VMs with safe VM ID range (8100+)
    const workers: VM[] = [];
    const workerConfigs: talos.machine.ConfigurationApply[] = [];

    for (let i = 0; i < config.kubernetes.workerNodes; i++) {
      const workerIP = `${baseIP}.${args.startingIP + config.kubernetes.masterNodes + i}`;

      const worker = new VM(
        `${name}-worker-${i}`,
        {
          provider: args.provider,
          template: args.templateManager.workerTemplate, // Use worker template
          spec: {
            name: `${name}-worker-${i}`,
            vmId: 8100 + i, // Safe range to avoid conflicts
            cores: config.kubernetes.workerSpecs?.cores,
            memory: config.kubernetes.workerSpecs?.memory,
            diskSize: config.kubernetes.workerSpecs?.diskSize,
            ipAddress: workerIP,
            tags: ['talos', 'worker', name, 'infraflux-managed'],
            startOnBoot: true,
          },
        },
        {
          parent: this,
          dependsOn: [args.templateManager.workerTemplate], // Wait for template
        }
      );

      workers.push(worker);

      // Generate machine configuration for this worker node
      const machineConfig = talos.machine.getConfigurationOutput({
        clusterName: name,
        machineType: 'worker',
        clusterEndpoint,
        machineSecrets: secrets.machineSecrets,
      });

      // Apply configuration to the VM
      const configApply = new talos.machine.ConfigurationApply(
        `${name}-worker-${i}-config`,
        {
          clientConfiguration: secrets.clientConfiguration,
          machineConfigurationInput: machineConfig.machineConfiguration,
          node: workerIP,
          configPatches: [
            // Apply patches for hostname, network, and custom installer
            pulumi.jsonStringify({
              machine: {
                install: {
                  disk: '/dev/vda', // Talos disk device in Proxmox VM
                  image: args.templateManager.iso.installerImage, // Custom factory image
                  wipe: false,
                },
                network: {
                  hostname: `${name}-worker-${i}`,
                  interfaces: [
                    {
                      interface: 'eth0',
                      addresses: [`${workerIP}/24`],
                      routes: [
                        {
                          network: '0.0.0.0/0',
                          gateway: config.network.gateway,
                        },
                      ],
                    },
                  ],
                  nameservers: config.network.dnsServers,
                },
                features: {
                  rbac: true,
                  stableHostname: true,
                  apidCheckExtKeyUsage: true,
                },
              },
            }),
          ],
        },
        {
          parent: this,
          dependsOn: [worker],
        }
      );

      workerConfigs.push(configApply);
    }

    // Wait for all configurations to be applied
    const allConfigs = [...masterConfigs, ...workerConfigs];

    // Bootstrap the cluster using the first control plane node
    const bootstrap = new talos.machine.Bootstrap(
      `${name}-bootstrap`,
      {
        node: masters[0].output.ipAddress,
        clientConfiguration: secrets.clientConfiguration,
      },
      {
        parent: this,
        dependsOn: allConfigs, // Wait for all configurations to be applied
      }
    );

    // Generate kubeconfig
    const kubeconfig = new talos.cluster.Kubeconfig(
      `${name}-kubeconfig`,
      {
        node: masters[0].output.ipAddress,
        clientConfiguration: secrets.clientConfiguration,
      },
      {
        parent: this,
        dependsOn: [bootstrap],
      }
    );

    // Store Talos client configuration as string
    this.talosConfig = secrets.clientConfiguration.apply((config) =>
      JSON.stringify(config)
    );

    this.output = {
      name: pulumi.Output.create(name),
      apiEndpoint: pulumi.Output.create(clusterEndpoint),
      kubeconfig: pulumi.secret(kubeconfig.kubeconfigRaw),
      masterNodes: masters.map((m) => m.output),
      workerNodes: workers.map((w) => w.output),
    };

    this.registerOutputs({
      output: this.output,
      talosConfig: this.talosConfig,
    });
  }
}
