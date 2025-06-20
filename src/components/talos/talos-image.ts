/**
 * Simplified Talos Image Management using Native Provider
 * 
 * Replaces the complex VMTemplateComponent with native Talos provider
 */

import * as pulumi from '@pulumi/pulumi';
import * as talos from '@pulumiverse/talos';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import { logger } from '../../utils/logger';

/**
 * Simplified Talos image configuration
 */
export interface TalosImageConfig {
  /** Talos version */
  version: string;
  
  /** System extensions to include */
  extensions?: string[];
  
  /** Target architecture */
  architecture?: 'amd64' | 'arm64';
}

/**
 * Talos image output information
 */
export interface TalosImageOutput {
  /** Schematic ID for the image */
  schematicId: pulumi.Output<string>;
  
  /** Download URL for the image */
  downloadUrl: pulumi.Output<string>;
  
  /** Image version */
  version: string;
  
  /** Image architecture */
  architecture: string;
}

/**
 * Simplified Talos Image Component using native provider
 */
export class TalosImageComponent extends pulumi.ComponentResource {
  public readonly schematicId: pulumi.Output<string>;
  public readonly downloadUrl: pulumi.Output<string>;
  public readonly version: string;
  public readonly architecture: string;

  constructor(
    name: string,
    config: TalosImageConfig,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:talos:Image', name, {}, opts);

    this.version = config.version;
    this.architecture = config.architecture || 'amd64';

    logger.info(`Creating Talos image schematic`, {
      version: this.version,
      architecture: this.architecture,
      extensions: config.extensions?.length || 0,
    });

    // Create Talos image schematic using native provider
    // Note: This might need to be adjusted based on the actual Talos provider API
    const schematic = new talos.imagefactory.Schematic(
      `${name}-schematic`,
      {
        // Use the actual API structure - this may be different
        schematic: `
customization:
  systemExtensions:
    officialExtensions:
${config.extensions?.map(ext => `      - ${ext}`).join('\n') || '      - siderolabs/qemu-guest-agent\n      - siderolabs/intel-ucode'}
`,
      },
      { parent: this }
    );

    this.schematicId = schematic.id;

    // Generate download URL using Talos image factory
    this.downloadUrl = schematic.id.apply(id => 
      `https://factory.talos.dev/image/${id}/${this.version}/nocloud-${this.architecture}.raw.gz`
    );

    logger.debug(`Talos image configuration completed`, {
      schematicId: this.schematicId,
      downloadUrl: this.downloadUrl,
    });

    this.registerOutputs({
      schematicId: this.schematicId,
      downloadUrl: this.downloadUrl,
      version: this.version,
      architecture: this.architecture,
    });
  }

  /**
   * Get image output information
   */
  getImageInfo(): TalosImageOutput {
    return {
      schematicId: this.schematicId,
      downloadUrl: this.downloadUrl,
      version: this.version,
      architecture: this.architecture,
    };
  }
}

/**
 * Download Talos image to Proxmox datastore using native provider
 */
export class TalosImageDownload extends pulumi.ComponentResource {
  public readonly downloadFile: proxmoxve.download.File;
  public readonly filename: string;

  constructor(
    name: string,
    args: {
      talosImage: TalosImageComponent;
      proxmoxProvider: proxmoxve.Provider;
      nodeName: string;
      datastore: string;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:talos:Download', name, {}, opts);

    this.filename = `talos-${args.talosImage.version}-${args.talosImage.architecture}.img`;

    logger.info(`Downloading Talos image to Proxmox`, {
      node: args.nodeName,
      datastore: args.datastore,
    });

    // Use native Proxmox provider to download the image
    this.downloadFile = new proxmoxve.download.File(
      `${name}-download`,
      {
        nodeName: args.nodeName,
        contentType: 'iso',
        datastoreId: args.datastore,
        fileName: this.filename,
        url: args.talosImage.downloadUrl,
        decompressionAlgorithm: 'gz',
        overwrite: false,
      },
      {
        parent: this,
        provider: args.proxmoxProvider,
      }
    );

    logger.debug(`Talos image download configured`, {
      filename: this.filename,
      url: args.talosImage.downloadUrl,
    });

    this.registerOutputs({
      downloadFile: this.downloadFile,
      filename: this.filename,
    });
  }
}

/**
 * Create VM template from downloaded Talos image
 */
export class TalosVMTemplate extends pulumi.ComponentResource {
  public readonly vm: proxmoxve.vm.VirtualMachine;
  public readonly templateId: pulumi.Output<number>;

  constructor(
    name: string,
    args: {
      downloadFile: proxmoxve.download.File;
      proxmoxProvider: proxmoxve.Provider;
      nodeName: string;
      datastore: string;
      vmId?: number;
    },
    opts?: pulumi.ComponentResourceOptions
  ) {
    super('infraflux:talos:Template', name, {}, opts);

    const templateVmId = args.vmId || 9000;

    logger.info(`Creating Talos VM template from downloaded image`, {
      node: args.nodeName,
      templateId: templateVmId,
    });

    // Create VM template using downloaded image
    this.vm = new proxmoxve.vm.VirtualMachine(
      `${name}-template`,
      {
        // Basic VM configuration
        nodeName: args.nodeName,
        vmId: templateVmId,
        name: `talos-template-${templateVmId}`,
        description: 'Talos Linux VM Template',
        
        // Mark as template
        template: true,
        
        // Basic hardware configuration for template
        cpu: {
          cores: 2,
          sockets: 1,
          type: 'host',
        },
        
        memory: {
          dedicated: 2048, // 2GB for template
        },

        // Attach the downloaded image as primary disk
        disks: [
          {
            interface: 'scsi0',
            datastoreId: args.datastore,
            fileId: args.downloadFile.id, // Reference downloaded file
            fileFormat: 'raw',
            size: 8, // Initial size, will be expanded when cloned
          },
        ],

        // Network interface for template
        networkDevices: [
          {
            bridge: 'vmbr0',
            model: 'virtio',
          },
        ],

        // Template specific settings
        bios: 'ovmf', // UEFI for modern OS
        
        // EFI disk for UEFI boot
        efiDisk: {
          datastoreId: args.datastore,
          fileFormat: 'raw',
        },

        // Operating system type
        operatingSystem: {
          type: 'l26', // Linux 2.6+
        },

        // QEMU guest agent
        agent: {
          enabled: true,
          trim: true,
          type: 'virtio',
        },

        // Start the VM to finalize template creation
        started: false,
        onBoot: false,
        protection: true, // Protect template from accidental deletion
      },
      {
        provider: args.proxmoxProvider,
        parent: this,
        dependsOn: [args.downloadFile],
      }
    );

    this.templateId = pulumi.output(templateVmId);

    logger.debug(`Talos VM template creation configured`, {
      templateId: templateVmId,
      fileId: args.downloadFile.id,
    });

    this.registerOutputs({
      vm: this.vm,
      templateId: this.templateId,
    });
  }
}

/**
 * Utility function to create Talos image with download and template
 */
export function createTalosImage(
  name: string,
  config: TalosImageConfig & {
    proxmoxProvider: proxmoxve.Provider;
    nodeName: string;
    datastore: string;
    templateVmId?: number;
  },
  opts?: pulumi.ComponentResourceOptions
): { 
  image: TalosImageComponent; 
  download: TalosImageDownload; 
  template: TalosVMTemplate;
} {
  const image = new TalosImageComponent(
    `${name}-image`,
    {
      version: config.version,
      extensions: config.extensions || [],
      architecture: config.architecture || 'amd64',
    },
    opts
  );

  const download = new TalosImageDownload(
    `${name}-download`,
    {
      talosImage: image,
      proxmoxProvider: config.proxmoxProvider,
      nodeName: config.nodeName,
      datastore: config.datastore,
    },
    opts
  );

  const template = new TalosVMTemplate(
    `${name}-template`,
    {
      downloadFile: download.downloadFile,
      proxmoxProvider: config.proxmoxProvider,
      nodeName: config.nodeName,
      datastore: config.datastore,
      vmId: config.templateVmId || 9000,
    },
    opts
  );

  return { image, download, template };
}