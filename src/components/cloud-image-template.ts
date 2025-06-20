import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { config } from '@/config';
import { logResource } from '@/utils/logger';

export interface TalosTemplateArgs {
  provider: proxmox.Provider;
  templateVmId?: number;
  talosVersion?: string;
  schematic?: string;
}

/**
 * TalosTemplate - Downloads custom Talos cloud image from Image Factory and creates a template
 */
export class TalosTemplate extends pulumi.ComponentResource {
  public readonly templateId: pulumi.Output<number>;
  public readonly ready: pulumi.Output<boolean>;
  public readonly schematic: string;
  public readonly installerImage: string;

  constructor(
    name: string,
    args: TalosTemplateArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:vm:TalosTemplate', name, {}, opts);

    const templateVmId = args.templateVmId ?? config.vm.templateId;
    const talosVersion = args.talosVersion ?? config.kubernetes.version;
    const vmStorage = config.vm.defaults.storagePool;
    const isoStorage = config.vm.defaults.isoStoragePool;

    // Custom Talos schematic with qemu-guest-agent and cloudflared
    // Generated from factory.talos.dev with extensions:
    // - siderolabs/qemu-guest-agent
    // - siderolabs/cloudflared
    this.schematic =
      args.schematic ??
      'ec83aa8b78f86413fceed33b6f16f598df0e3c4b1cbd514c5790364b49d4f8f6';

    // Installer image reference for machine configs
    this.installerImage = `factory.talos.dev/nocloud-installer/${this.schematic}:${talosVersion}`;

    logResource('TalosTemplate', 'Creating', {
      name,
      templateVmId,
      talosVersion,
      schematic: this.schematic,
      vmStorage,
      isoStorage,
    });

    // Download custom Talos cloud image from Image Factory
    const talosImageUrl = `https://factory.talos.dev/image/${this.schematic}/${talosVersion}/nocloud-amd64.iso`;

    const talosImage = new proxmox.download.File(
      `${name}-talos-image`,
      {
        contentType: 'iso',
        datastoreId: isoStorage,
        nodeName: config.proxmox.node,
        url: talosImageUrl,
        fileName: `talos-${talosVersion}-nocloud-amd64.iso`,
      },
      {
        provider: args.provider,
        parent: this,
      }
    );

    // Create VM template using the downloaded custom image
    const template = new proxmox.vm.VirtualMachine(
      `${name}-template`,
      {
        nodeName: config.proxmox.node,
        name: `talos-${talosVersion}-template`,
        vmId: templateVmId,

        // Operating System
        operatingSystem: {
          type: 'l26', // Linux 2.6+ (modern Linux)
        },

        // CPU Configuration
        cpu: {
          cores: 2,
          sockets: 1,
          type: 'host',
        },

        // Memory
        memory: {
          dedicated: 2048,
        },

        // SCSI Controller
        scsiHardware: 'virtio-scsi-pci',

        // Import the Talos disk image from the downloaded file
        disks: [
          {
            interface: 'scsi0',
            datastoreId: vmStorage,
            size: 20, // 20GB should be enough for Talos
            fileFormat: 'raw',
            fileId: talosImage.id, // Reference the downloaded image
          },
        ],

        // Network
        networkDevices: [
          {
            bridge: config.network.bridge,
            model: 'virtio',
          },
        ],

        // QEMU Guest Agent (enabled in custom image)
        agent: {
          enabled: true,
          trim: true,
          type: 'virtio',
        },

        // Template configuration
        template: true,
        started: false,

        // Tags for identification
        tags: ['talos', 'template', 'infraflux-managed', 'custom-factory'],

        // Description
        description: `InfraFlux Talos ${talosVersion} Template - Custom Factory Image with qemu-guest-agent + cloudflared`,
      },
      {
        provider: args.provider,
        parent: this,
        dependsOn: [talosImage],
      }
    );

    this.templateId = template.vmId;
    this.ready = pulumi.Output.create(true);

    this.registerOutputs({
      templateId: this.templateId,
      ready: this.ready,
      schematic: this.schematic,
      installerImage: this.installerImage,
    });
  }

  /**
   * Create Talos OS template - Simple factory method
   */
  static create(
    provider: proxmox.Provider,
    opts?: pulumi.ComponentResourceOptions
  ): TalosTemplate {
    return new TalosTemplate(
      'talos-os',
      {
        provider,
        templateVmId: 9010,
      },
      opts
    );
  }
}
