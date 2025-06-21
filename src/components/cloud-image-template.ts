import * as pulumi from '@pulumi/pulumi';
import * as proxmox from '@muhlba91/pulumi-proxmoxve';
import { config } from '@/config';
import { logResource, logger } from '@/utils/logger';

export interface TalosISOArgs {
  provider: proxmox.Provider;
  talosVersion?: string;
  schematic?: string;
  forceDownload?: boolean;
}

export interface TalosTemplateArgs {
  provider: proxmox.Provider;
  talosISO: TalosISO;
  templateVmId: number;
  templateType: 'master' | 'worker' | 'universal';
  talosVersion?: string;
}

/**
 * TalosISO - Manages Talos ISO download and availability
 * Step 1: Check for existing ISO, download if missing
 */
export class TalosISO extends pulumi.ComponentResource {
  public readonly isoFile: proxmox.download.File | undefined;
  public readonly isoId: pulumi.Output<string>;
  public readonly ready: pulumi.Output<boolean>;
  public readonly schematic: string;
  public readonly installerImage: string;
  public readonly fileName: string;

  constructor(
    name: string,
    args: TalosISOArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:iso:TalosISO', name, {}, opts);

    const talosVersion = args.talosVersion ?? config.kubernetes.version;
    const isoStorage = config.vm.defaults.isoStoragePool;

    // Custom Talos schematic with qemu-guest-agent and cloudflared
    this.schematic =
      args.schematic ??
      'ec83aa8b78f86413fceed33b6f16f598df0e3c4b1cbd514c5790364b49d4f8f6';

    this.fileName = `talos-${talosVersion}-nocloud-amd64.iso`;
    this.installerImage = `factory.talos.dev/nocloud-installer/${this.schematic}:${talosVersion}`;

    logResource('TalosISO', 'Checking/Downloading', {
      name,
      talosVersion,
      schematic: this.schematic,
      fileName: this.fileName,
      isoStorage,
      forceDownload: args.forceDownload ?? false,
    });

    // Only download if explicitly requested via forceDownload
    if (args.forceDownload === true) {
      const talosImageUrl = `https://factory.talos.dev/image/${this.schematic}/${talosVersion}/nocloud-amd64.iso`;

      logResource('TalosISO', 'Force Downloading', {
        url: talosImageUrl,
        fileName: this.fileName,
        reason: 'Force download explicitly requested',
      });

      this.isoFile = new proxmox.download.File(
        `${name}-download`,
        {
          contentType: 'iso',
          datastoreId: isoStorage,
          nodeName: config.proxmox.node,
          url: talosImageUrl,
          fileName: this.fileName,
          overwrite: true, // Force overwrite when forceDownload is true
        },
        {
          provider: args.provider,
          parent: this,
        }
      );

      this.isoId = this.isoFile.id;
      this.ready = pulumi.Output.create(true);
    } else {
      // ISO should already exist, reference it directly
      logResource('TalosISO', 'Using Existing', {
        fileName: this.fileName,
        reason: 'Assuming ISO exists (use forceDownload=true to re-download)',
      });

      // Reference the existing ISO file
      this.isoId = pulumi.Output.create(`${isoStorage}:iso/${this.fileName}`);
      this.ready = pulumi.Output.create(true);

      // Log warning if ISO might not exist
      logger.warn('Using existing ISO reference', {
        fileName: this.fileName,
        storage: isoStorage,
        hint: 'If ISO does not exist, set TALOS_FORCE_DOWNLOAD=true',
      });
    }

    this.registerOutputs({
      isoId: this.isoId,
      ready: this.ready,
      schematic: this.schematic,
      installerImage: this.installerImage,
      fileName: this.fileName,
    });
  }
}

/**
 * TalosTemplate - Creates VM template from downloaded ISO
 * Step 2: Create template only after ISO is ready
 */
export class TalosTemplate extends pulumi.ComponentResource {
  public readonly templateId: pulumi.Output<number>;
  public readonly template: proxmox.vm.VirtualMachine;
  public readonly ready: pulumi.Output<boolean>;
  public readonly templateType: string;

  constructor(
    name: string,
    args: TalosTemplateArgs,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:vm:TalosTemplate', name, {}, opts);

    const talosVersion = args.talosVersion ?? config.kubernetes.version;
    const vmStorage = config.vm.defaults.storagePool;
    this.templateType = args.templateType;

    logResource('TalosTemplate', 'Creating', {
      name,
      templateVmId: args.templateVmId,
      templateType: args.templateType,
      talosVersion,
      vmStorage,
      qemuAgent: 'enabled',
    });

    // Get template specs based on type
    const templateSpecs = this.getTemplateSpecs(args.templateType);

    // Create VM template using the downloaded ISO
    // This will only start after the ISO is ready
    this.template = new proxmox.vm.VirtualMachine(
      `${name}-vm`,
      {
        nodeName: config.proxmox.node,
        name: `talos-${args.templateType}-${talosVersion}`,
        vmId: args.templateVmId,

        // Operating System
        operatingSystem: {
          type: 'l26', // Linux 2.6+ (modern Linux)
        },

        // CPU Configuration
        cpu: {
          cores: templateSpecs.cores,
          sockets: 1,
          type: 'host',
        },

        // Memory
        memory: {
          dedicated: templateSpecs.memory,
        },

        // SCSI Controller
        scsiHardware: 'virtio-scsi-pci',

        // Attach the Talos ISO to CD-ROM - this is crucial for cloned VMs
        cdrom: {
          enabled: true,
          fileId: args.talosISO.isoId,
          interface: 'ide2',
        },

        // OS disk - empty disk that Talos will install to
        disks: [
          {
            interface: 'scsi0',
            datastoreId: vmStorage,
            size: templateSpecs.diskSize,
            fileFormat: 'raw',
          },
        ],

        // Network
        networkDevices: [
          {
            bridge: config.network.bridge,
            model: 'virtio',
          },
        ],

        // QEMU Guest Agent - properly enabled for Proxmox communication
        agent: {
          enabled: true,
          trim: true,
          type: 'virtio',
        },

        // Template configuration
        template: true,
        started: false,

        // Tags for identification
        tags: [
          'talos',
          'template',
          args.templateType,
          'infraflux-managed',
          'custom-factory',
        ],

        // Description
        description: `InfraFlux Talos ${args.templateType} Template - ${talosVersion} with custom extensions and ISO attached`,
      },
      {
        provider: args.provider,
        parent: this,
        dependsOn: [args.talosISO], // Wait for ISO to be ready
      }
    );

    this.templateId = this.template.vmId;
    this.ready = this.template.template.apply((isTemplate) => !!isTemplate);

    this.registerOutputs({
      templateId: this.templateId,
      template: this.template,
      ready: this.ready,
      templateType: this.templateType,
    });
  }

  private getTemplateSpecs(templateType: string) {
    switch (templateType) {
      case 'master':
        return {
          cores: config.kubernetes.masterSpecs?.cores ?? 2,
          memory: config.kubernetes.masterSpecs?.memory ?? 4096,
          diskSize: parseInt(
            (config.kubernetes.masterSpecs?.diskSize ?? '30G').replace(
              /[^0-9]/g,
              ''
            )
          ),
        };
      case 'worker':
        return {
          cores: config.kubernetes.workerSpecs?.cores ?? 2,
          memory: config.kubernetes.workerSpecs?.memory ?? 4096,
          diskSize: parseInt(
            (config.kubernetes.workerSpecs?.diskSize ?? '50G').replace(
              /[^0-9]/g,
              ''
            )
          ),
        };
      default:
        return {
          cores: 2,
          memory: 4096,
          diskSize: 30,
        };
    }
  }
}

/**
 * TalosTemplateManager - Manages the complete template creation flow
 * Step 1: Download ISO → Step 2: Create Templates → Step 3: Ready for VM cloning
 */
export class TalosTemplateManager extends pulumi.ComponentResource {
  public readonly iso: TalosISO;
  public readonly masterTemplate: TalosTemplate;
  public readonly workerTemplate: TalosTemplate;
  public readonly ready: pulumi.Output<boolean>;

  constructor(
    name: string,
    args: { provider: proxmox.Provider; forceDownload?: boolean },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:vm:TalosTemplateManager', name, {}, opts);

    logResource('TalosTemplateManager', 'Initializing', {
      name,
      masterTemplateId: 9010,
      workerTemplateId: 9011,
      forceDownload: args.forceDownload ?? false,
    });

    // Step 1: Download/check Talos ISO
    this.iso = new TalosISO(
      `${name}-iso`,
      {
        provider: args.provider,
        forceDownload: args.forceDownload ?? false, // Use parameter or default to false
      },
      { parent: this }
    );

    // Step 2: Create Master Template (after ISO is ready)
    this.masterTemplate = new TalosTemplate(
      `${name}-master-template`,
      {
        provider: args.provider,
        talosISO: this.iso,
        templateVmId: 9010,
        templateType: 'master',
      },
      {
        parent: this,
        dependsOn: [this.iso],
      }
    );

    // Step 2: Create Worker Template (after ISO is ready)
    this.workerTemplate = new TalosTemplate(
      `${name}-worker-template`,
      {
        provider: args.provider,
        talosISO: this.iso,
        templateVmId: 9011,
        templateType: 'worker',
      },
      {
        parent: this,
        dependsOn: [this.iso],
      }
    );

    // Step 3: Manager is ready when all templates are ready
    this.ready = pulumi
      .all([
        this.iso.ready,
        this.masterTemplate.ready,
        this.workerTemplate.ready,
      ])
      .apply(
        ([isoReady, masterReady, workerReady]) =>
          isoReady && masterReady && workerReady
      );

    this.registerOutputs({
      iso: this.iso,
      masterTemplate: this.masterTemplate,
      workerTemplate: this.workerTemplate,
      ready: this.ready,
    });
  }

  /**
   * Get the appropriate template for a node type
   */
  getTemplateForNodeType(nodeType: 'master' | 'worker'): TalosTemplate {
    return nodeType === 'master' ? this.masterTemplate : this.workerTemplate;
  }
}
