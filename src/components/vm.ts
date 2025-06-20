import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { VMSpec, VMOutput } from '@/types';
import { config } from '@/config';
import { logResource } from '@/utils/logger';

export interface VMArgs {
  spec: VMSpec;
  provider: proxmox.Provider;
}

export class VM extends pulumi.ComponentResource {
  public readonly vm: proxmox.vm.VirtualMachine;
  public readonly output: VMOutput;

  constructor(
    name: string,
    args: VMArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:vm:VM', name, {}, opts);

    const { spec, provider } = args;

    // Merge with defaults
    const cores = spec.cores ?? config.vm.defaults.cores;
    const memory = spec.memory ?? config.vm.defaults.memory;
    const diskSize = spec.diskSize ?? config.vm.defaults.diskSize;
    const templateId = config.vm.templateId; // Always use Talos template

    logResource('VM', 'Creating', { name, spec });

    // Create the VM by cloning from Talos template
    this.vm = new proxmox.vm.VirtualMachine(
      name,
      {
        nodeName: config.proxmox.node,
        name: spec.name,
        vmId: spec.vmId,

        // Clone from Talos template
        clone: {
          nodeName: config.proxmox.node,
          vmId: templateId,
          full: true,
        },

        // Hardware specs
        cpu: {
          cores,
          sockets: 1,
          type: 'host',
        },
        memory: {
          dedicated: memory,
        },

        // Disk configuration
        disks: [
          {
            interface: 'scsi0',
            datastoreId: config.vm.defaults.storagePool,
            size: parseInt(diskSize.replace(/[^0-9]/g, '')),
            fileFormat: config.vm.defaults.diskFormat,
          },
        ],

        // Network configuration
        networkDevices: [
          {
            bridge: config.network.bridge,
            model: 'virtio',
          },
        ],

        // Boot settings
        onBoot: spec.startOnBoot !== false,
        started: true,

        // Description
        description: `InfraFlux Talos node - ${config.environment} environment`,
      },
      {
        provider,
        parent: this,
      }
    );

    // Export outputs
    this.output = {
      id: this.vm.vmId,
      name: this.vm.name,
      ipAddress: pulumi.Output.create(spec.ipAddress),
      macAddress: this.vm.networkDevices.apply(
        (devices) => devices?.[0]?.macAddress ?? ''
      ),
      status: pulumi.Output.create('running'),
    };

    this.registerOutputs({
      vm: this.vm,
      output: this.output,
    });
  }
}
