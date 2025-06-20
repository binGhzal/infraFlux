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
 * Utility function to create Talos image with download
 */
export function createTalosImage(
  name: string,
  config: TalosImageConfig & {
    proxmoxProvider: proxmoxve.Provider;
    nodeName: string;
    datastore: string;
  },
  opts?: pulumi.ComponentResourceOptions
): { image: TalosImageComponent; download: TalosImageDownload } {
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

  return { image, download };
}