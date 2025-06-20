import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import * as command from '@pulumi/command';
import { config } from '@/config';
import { logResource } from '@/utils/logger';

export interface VMTemplateArgs {
  provider: proxmox.Provider;
  isoUrl?: string;
  isoDatastore?: string;
  templateVmId?: number;
  cloudinitEnabled?: boolean;
}

export interface VMTemplateOutput {
  templateId: pulumi.Output<number>;
  name: pulumi.Output<string>;
  ready: pulumi.Output<boolean>;
}

/**
 * VMTemplate Component - Manages VM template creation and updates
 *
 * This component handles:
 * - Downloading OS ISOs if needed
 * - Creating base VM templates
 * - Configuring cloud-init support
 * - Template versioning and updates
 */
export class VMTemplate extends pulumi.ComponentResource {
  public readonly output: VMTemplateOutput;
  private readonly provider: proxmox.Provider;

  constructor(
    name: string,
    args: VMTemplateArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:vm:VMTemplate', name, {}, opts);

    this.provider = args.provider;
    const templateVmId = args.templateVmId ?? config.vm.templateId;
    const isoDatastore = args.isoDatastore ?? config.vm.defaults.isoStoragePool;

    logResource('VMTemplate', 'Creating', { name, templateVmId });

    // Check if template already exists
    const checkTemplate = new command.local.Command(
      `${name}-check-template`,
      {
        create: `ssh ${config.proxmox.username}@${this.getProxmoxHost()} "qm status ${templateVmId} 2>/dev/null || echo 'NOT_FOUND'"`,
      },
      { parent: this }
    );

    // Download ISO if URL provided
    let isoFile: pulumi.Output<string> | undefined;
    if (args.isoUrl) {
      new command.local.Command(
        `${name}-download-iso`,
        {
          create: pulumi.interpolate`
          ssh ${config.proxmox.username}@${this.getProxmoxHost()} "
            cd /var/lib/vz/template/iso/ &&
            wget -nc '${args.isoUrl}' -O ubuntu-22.04-server.iso || true
          "
        `,
        },
        {
          parent: this,
          deleteBeforeReplace: true,
        }
      );

      isoFile = pulumi.Output.create(
        `${isoDatastore}:iso/ubuntu-22.04-server.iso`
      );
    }

    // Create the template VM
    const templateVm = new proxmox.vm.VirtualMachine(
      `${name}-template`,
      {
        nodeName: config.proxmox.node,
        name: `${name}-template`,
        vmId: templateVmId,

        // Basic settings
        bios: 'ovmf', // UEFI for modern OS
        cpu: {
          cores: 2,
          sockets: 1,
          type: 'host',
        },
        memory: {
          dedicated: 2048,
        },

        // Boot from ISO if provided
        cdrom: isoFile
          ? {
              enabled: true,
              fileId: isoFile,
              interface: 'ide2',
            }
          : undefined,

        // EFI disk for UEFI boot
        efiDisk: {
          datastoreId: config.vm.defaults.storagePool,
          fileFormat: 'raw',
          type: '4m',
        },

        // OS disk
        disks: [
          {
            interface: 'scsi0',
            datastoreId: config.vm.defaults.storagePool,
            size: 20,
            fileFormat: config.vm.defaults.diskFormat,
            ssd: true,
          },
        ],

        // Network
        networkDevices: [
          {
            bridge: config.network.bridge,
            model: 'virtio',
          },
        ],

        // Enable QEMU agent
        agent: {
          enabled: true,
          trim: true,
          type: 'virtio',
        },

        // Cloud-init drive
        initialization:
          args.cloudinitEnabled !== false
            ? {
                type: 'nocloud',
                datastoreId: config.vm.defaults.storagePool,
              }
            : undefined,

        // Hardware
        serialDevices: [
          {
            device: 'socket',
          },
        ],
        vga: {
          type: 'qxl',
        },

        // Don't start the template
        started: false,
        template: false, // Will convert after setup
      },
      {
        provider: this.provider,
        parent: this,
        dependsOn: args.isoUrl ? [checkTemplate] : undefined,
      }
    );

    // Install cloud-init and prepare the template
    const prepareTemplate = new command.local.Command(
      `${name}-prepare-template`,
      {
        create: pulumi.interpolate`
        ssh ${config.proxmox.username}@${this.getProxmoxHost()} "
          # Wait for VM to be created
          while ! qm status ${templateVmId} &>/dev/null; do sleep 1; done

          # Start VM for initial setup if needed
          # qm start ${templateVmId}
          # sleep 30

          # For cloud-init templates, we typically need to:
          # 1. Install the OS manually or via automation
          # 2. Install cloud-init package
          # 3. Clean up and prepare for templating

          # Convert to template
          qm template ${templateVmId}

          echo 'Template created successfully'
        "
      `,
        delete: pulumi.interpolate`
        ssh ${config.proxmox.username}@${this.getProxmoxHost()} "
          qm destroy ${templateVmId} --purge || true
        "
      `,
      },
      {
        parent: this,
        dependsOn: [templateVm],
      }
    );

    // Set up outputs
    this.output = {
      templateId: pulumi.Output.create(templateVmId),
      name: templateVm.name,
      ready: prepareTemplate.stdout.apply((output) =>
        output.includes('Template created successfully')
      ),
    };

    this.registerOutputs({
      output: this.output,
    });
  }

  private getProxmoxHost(): string {
    // Extract hostname from endpoint URL
    const endpoint = config.proxmox.endpoint;
    const match = endpoint.match(/https?:\/\/([^:/]+)/);
    return match ? match[1] : 'localhost';
  }

  /**
   * Create an Ubuntu 22.04 template with cloud-init
   */
  static createUbuntuTemplate(
    name: string,
    provider: proxmox.Provider,
    opts?: pulumi.ComponentResourceOptions
  ): VMTemplate {
    return new VMTemplate(
      name,
      {
        provider,
        isoUrl:
          'https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso',
        cloudinitEnabled: true,
      },
      opts
    );
  }

  /**
   * Create a template from an existing cloud image
   */
  static createFromCloudImage(
    name: string,
    provider: proxmox.Provider,
    imageUrl: string,
    opts?: pulumi.ComponentResourceOptions
  ): VMTemplate {
    // Implementation for importing cloud images (qcow2, etc.)
    // This would download and convert the image to a template
    return new VMTemplate(
      name,
      {
        provider,
        // Additional logic for cloud images
      },
      opts
    );
  }
}
