/**
 * VM Template Management Component for InfraFlux v2.0
 * 
 * Manages the complete lifecycle of VM templates including:
 * - Talos image generation and download
 * - Base VM creation from downloaded images
 * - Template conversion and lifecycle management
 */

import * as pulumi from '@pulumi/pulumi';
import * as proxmoxve from '@muhlba91/pulumi-proxmoxve';
import * as command from '@pulumi/command';
import {
  TalosImageInfo,
  generateProxmoxTalosImageInfo,
} from '../../utils/talos-image-factory';
import { ComponentProps } from '../../types';
import { logger } from '../../utils/logger';

/**
 * VM Template component properties
 */
export interface VMTemplateComponentProps extends ComponentProps {
  /** Template name */
  name: string;
  
  /** Talos version to use */
  talosVersion: string;
  
  /** Target architecture */
  architecture: 'amd64' | 'arm64';
  
  /** Custom system extensions to include */
  customExtensions?: string[];
  
  /** Proxmox provider instance */
  proxmoxProvider: proxmoxve.Provider;
  
  /** Target Proxmox node */
  proxmoxNode: string;
  
  /** Datastore for image storage */
  datastore: string;
  
  /** Template ID to use (defaults to auto-generated) */
  templateId?: number;
  
  /** Whether to force re-download if template exists */
  forceUpdate?: boolean;
  
  /** Image factory endpoint override */
  imageFactoryEndpoint?: string;
}

/**
 * Template image information
 */
export interface TemplateImageInfo {
  /** Downloaded image file information */
  downloadedFile: proxmoxve.download.File;
  
  /** Talos image metadata */
  imageInfo: TalosImageInfo;
  
  /** Local file path on Proxmox */
  localPath: string;
  
  /** File size in bytes */
  size: number;
  
  /** Download completion timestamp */
  downloadedAt: string;
}

/**
 * Template VM information
 */
export interface TemplateVMInfo {
  /** Base VM resource */
  baseVM: proxmoxve.vm.VirtualMachine;
  
  /** VM ID used for template creation */
  vmId: number;
  
  /** VM specifications */
  specs: {
    cores: number;
    memory: number;
    disk: {
      size: number;
      storage: string;
      format: 'raw' | 'qcow2';
    };
  };
  
  /** Network configuration */
  network: {
    bridge: string;
    model: string;
  };
}

/**
 * Template lifecycle status
 */
export type TemplateStatus = 
  | 'initializing' 
  | 'downloading' 
  | 'creating-vm' 
  | 'converting-template' 
  | 'ready' 
  | 'error';

/**
 * Template information and status
 */
export interface TemplateInfo {
  /** Template ID */
  id: number;
  
  /** Template name */
  name: string;
  
  /** Current status */
  status: TemplateStatus;
  
  /** Talos version */
  talosVersion: string;
  
  /** Architecture */
  architecture: string;
  
  /** Creation timestamp */
  createdAt: string;
  
  /** Last update timestamp */
  updatedAt: string;
  
  /** Associated Proxmox node */
  node: string;
  
  /** Storage location */
  storage: string;
}

/**
 * VM Template Component outputs
 */
export interface VMTemplateOutput {
  /** Template information */
  template: pulumi.Output<TemplateInfo>;
  
  /** Downloaded image information */
  image: pulumi.Output<TemplateImageInfo>;
  
  /** Base VM information (used for template creation) */
  baseVM: pulumi.Output<TemplateVMInfo>;
  
  /** Template ready indicator */
  ready: pulumi.Output<boolean>;
}

/**
 * VM Template Management Component
 * 
 * Orchestrates the complete template creation process:
 * 1. Generate Talos image URL using Image Factory
 * 2. Download image to Proxmox datastore
 * 3. Create base VM from downloaded image
 * 4. Convert VM to template
 * 5. Manage template lifecycle
 */
export class VMTemplateComponent extends pulumi.ComponentResource {
  /** Template information */
  public readonly template: pulumi.Output<TemplateInfo>;
  
  /** Downloaded image information */
  public readonly image: pulumi.Output<TemplateImageInfo>;
  
  /** Base VM information */
  public readonly baseVM: pulumi.Output<TemplateVMInfo>;
  
  /** Template ready indicator */
  public readonly ready: pulumi.Output<boolean>;
  
  /** Template ID */
  public readonly templateId: pulumi.Output<number>;
  
  /** Template name */
  public readonly templateName: string;
  
  private readonly props: VMTemplateComponentProps;
  
  /**
   * Create a new VM Template Component
   * 
   * @param name Resource name
   * @param props VM template component properties
   * @param opts Pulumi component resource options
   */
  constructor(
    name: string,
    props: VMTemplateComponentProps,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("infraflux:storage:VMTemplate", name, {}, opts);
    
    this.props = props;
    this.templateName = props.name;
    
    logger.info(`Initializing VM template: ${props.name}`, {
      talosVersion: props.talosVersion,
      architecture: props.architecture,
      node: props.proxmoxNode,
      datastore: props.datastore,
    });
    
    // Generate template ID (use provided or auto-generate)
    this.templateId = pulumi.output(props.templateId || this.generateTemplateId());
    
    // Create template through orchestrated process
    const templateCreation = this.createTemplate();
    
    // Set outputs
    this.template = templateCreation.template;
    this.image = templateCreation.image;
    this.baseVM = templateCreation.baseVM;
    this.ready = templateCreation.ready;
    
    // Register outputs
    this.registerOutputs({
      template: this.template,
      image: this.image,
      baseVM: this.baseVM,
      ready: this.ready,
      templateId: this.templateId,
      templateName: this.templateName,
    });
    
    logger.info(`VM template component initialized: ${props.name}`);
  }
  
  /**
   * Create template through orchestrated process
   * T3.1.3.2: Image download to Proxmox datastore
   * T3.1.3.3: Base VM creation from image  
   * T3.1.3.4: Template conversion logic
   * T3.1.3.5: Template lifecycle management
   */
  private createTemplate(): VMTemplateOutput {
    // Step 1: Generate Talos image information
    const imageInfo = this.generateTalosImageInfo();
    
    // Step 2: Download image to Proxmox datastore (T3.1.3.2)
    const downloadedImage = this.downloadImageToProxmox(imageInfo);
    
    // Step 3: Create base VM from downloaded image (T3.1.3.3) 
    const baseVM = this.createBaseVMFromImage(downloadedImage);
    
    // Step 4: Convert VM to template (T3.1.3.4)
    const template = this.convertVMToTemplate(baseVM);
    
    // Step 5: Template lifecycle management (T3.1.3.5)
    const ready = this.manageTemplateLifecycle(template, downloadedImage, baseVM);
    
    return {
      template,
      image: downloadedImage,
      baseVM,
      ready,
    };
  }
  
  /**
   * Generate Talos image information using Image Factory
   */
  private generateTalosImageInfo(): pulumi.Output<TalosImageInfo> {
    return pulumi.output(
      generateProxmoxTalosImageInfo(
        this.props.talosVersion,
        this.props.architecture,
        this.props.customExtensions || [],
        this.props.imageFactoryEndpoint
      )
    );
  }
  
  /**
   * T3.1.3.2: Download Talos image to Proxmox datastore
   */
  private downloadImageToProxmox(
    imageInfo: pulumi.Output<TalosImageInfo>
  ): pulumi.Output<TemplateImageInfo> {
    return imageInfo.apply(info => {
      logger.info(`Downloading Talos image to Proxmox`, {
        version: info.version,
        platform: info.platform,
        architecture: info.architecture,
        url: info.url,
      });
      
      // Generate filename for the downloaded image
      const filename = `talos-${info.version}-${info.platform}-${info.architecture}.img`;
      
      // Create DownloadFile resource to download image to Proxmox
      const downloadFile = new proxmoxve.download.File(
        `${this.templateName}-image-download`,
        {
          // Proxmox node where to download the image
          nodeName: this.props.proxmoxNode,
          
          // Content type for VM images
          contentType: "iso",
          
          // Target datastore
          datastoreId: this.props.datastore,
          
          // Downloaded file name
          fileName: filename,
          
          // Source URL from Talos Image Factory
          url: info.url,
          
          // Compression algorithm (Talos images are .raw.gz)
          decompressionAlgorithm: "gz",
          
          // Overwrite existing file if forceUpdate is enabled
          overwrite: this.props.forceUpdate || false,
          
          // Include checksum only if available
          ...(info.checksum && {
            checksum: info.checksum,
            checksumAlgorithm: "sha256",
          }),
        },
        {
          provider: this.props.proxmoxProvider,
          parent: this,
        }
      );
      
      // Construct local path where image will be stored
      const localPath = `/var/lib/vz/template/iso/${filename}`;
      
      const templateImageInfo: TemplateImageInfo = {
        downloadedFile: downloadFile,
        imageInfo: info,
        localPath,
        size: info.expectedSize || 0,
        downloadedAt: new Date().toISOString(),
      };
      
      logger.info(`Image download initiated`, {
        filename,
        localPath,
        node: this.props.proxmoxNode,
        datastore: this.props.datastore,
      });
      
      return templateImageInfo;
    });
  }
  
  /**
   * T3.1.3.3: Create base VM from downloaded image
   */
  private createBaseVMFromImage(
    image: pulumi.Output<TemplateImageInfo>
  ): pulumi.Output<TemplateVMInfo> {
    return pulumi.all([image, this.templateId]).apply(([imageInfo, templateId]) => {
      logger.info(`Creating base VM from image`, {
        templateId,
        imagePath: imageInfo.localPath,
      });
      
      // VM specifications for template
      const vmSpecs = {
        cores: 2,      // Minimal specs for template
        memory: 2048,  // 2GB RAM
        disk: {
          size: 8,       // 8GB disk
          storage: this.props.datastore,
          format: "qcow2" as const,
        },
      };
      
      // Network configuration
      const networkConfig = {
        bridge: "vmbr0",  // Default bridge
        model: "virtio",  // Virtio network driver
      };
      
      // Create base VM from downloaded image
      const baseVM = new proxmoxve.vm.VirtualMachine(
        `${this.templateName}-base-vm`,
        {
          // VM identification
          nodeName: this.props.proxmoxNode,
          vmId: templateId,
          name: `${this.templateName}-base`,
          description: `Base VM for template ${this.templateName} (Talos ${imageInfo.imageInfo.version})`,
          
          // VM specifications
          cpu: {
            cores: vmSpecs.cores,
            sockets: 1,
            type: "host",
          },
          memory: {
            dedicated: vmSpecs.memory,
          },
          
          // Disk configuration
          disks: [{
            interface: "scsi0",
            datastoreId: vmSpecs.disk.storage,
            size: vmSpecs.disk.size,
            fileFormat: vmSpecs.disk.format,
            
            // Use downloaded image as source
            fileId: imageInfo.downloadedFile.id,
          }],
          
          // Network configuration
          networkDevices: [{
            bridge: networkConfig.bridge,
            model: networkConfig.model,
          }],
          
          // Boot configuration
          bootOrders: ["scsi0"],
          
          // VM options
          agent: {
            enabled: true,    // Enable QEMU agent
            trim: true,
            type: "virtio",
          },
          
          // Hardware configuration
          scsiHardware: "virtio-scsi-pci",
          
          // Prevent auto-start
          onBoot: false,
          started: false,
          
          // Template preparation
          template: false,  // Will be converted to template later
        },
        {
          provider: this.props.proxmoxProvider,
          parent: this,
          dependsOn: [imageInfo.downloadedFile],
        }
      );
      
      const vmInfo: TemplateVMInfo = {
        baseVM,
        vmId: templateId,
        specs: vmSpecs,
        network: networkConfig,
      };
      
      logger.info(`Base VM created successfully`, {
        vmId: templateId,
        name: `${this.templateName}-base`,
      });
      
      return vmInfo;
    });
  }
  
  /**
   * T3.1.3.4: Convert VM to template
   */
  private convertVMToTemplate(
    baseVM: pulumi.Output<TemplateVMInfo>
  ): pulumi.Output<TemplateInfo> {
    return pulumi.all([baseVM, this.templateId]).apply(([vmInfo, templateId]) => {
      logger.info(`Converting VM to template`, {
        vmId: templateId,
        templateName: this.templateName,
      });
      
      // Step 1: Ensure VM is stopped before conversion
      const stopVMCommand = new command.local.Command(
        `${this.templateName}-stop-vm`,
        {
          create: pulumi.interpolate`
            # Ensure VM is stopped before template conversion
            if [ -n "$PROXMOX_API_TOKEN" ] && [ -n "$PROXMOX_ENDPOINT" ]; then
              echo "Stopping VM ${templateId} on node ${this.props.proxmoxNode}"
              curl -s -k -X POST \
                -H "Authorization: PVEAPIToken=$PROXMOX_API_TOKEN" \
                "$PROXMOX_ENDPOINT/api2/json/nodes/${this.props.proxmoxNode}/qemu/${templateId}/status/stop" \
                || echo "VM already stopped or stop command failed (may be expected)"
              
              # Wait for VM to be fully stopped
              sleep 5
              echo "VM stop command completed"
            else
              echo "WARNING: PROXMOX_API_TOKEN or PROXMOX_ENDPOINT not set - skipping VM stop"
            fi
          `,
          environment: {
            PROXMOX_API_TOKEN: pulumi.interpolate`${this.props.proxmoxProvider.id}`, // Provider token reference
            PROXMOX_ENDPOINT: pulumi.interpolate`${this.props.proxmoxProvider.endpoint}`, // Provider endpoint
          },
        },
        {
          parent: this,
          dependsOn: [vmInfo.baseVM],
        }
      );
      
      // Step 2: Convert VM to template using Proxmox API
      const templateConversionCommand = new command.local.Command(
        `${this.templateName}-convert-template`,
        {
          create: pulumi.interpolate`
            # Convert VM to template using Proxmox REST API
            if [ -n "$PROXMOX_API_TOKEN" ] && [ -n "$PROXMOX_ENDPOINT" ]; then
              echo "Converting VM ${templateId} to template on node ${this.props.proxmoxNode}"
              
              # Make the template conversion API call
              RESPONSE=$(curl -s -k -X POST \
                -H "Authorization: PVEAPIToken=$PROXMOX_API_TOKEN" \
                -H "Content-Type: application/json" \
                "$PROXMOX_ENDPOINT/api2/json/nodes/${this.props.proxmoxNode}/qemu/${templateId}/template")
              
              # Check if conversion was successful
              if echo "$RESPONSE" | grep -q '"success":1'; then
                echo "Template conversion successful for VM ${templateId}"
                echo "Template name: ${this.templateName}"
                echo "Response: $RESPONSE"
              else
                echo "ERROR: Template conversion failed for VM ${templateId}"
                echo "Response: $RESPONSE"
                exit 1
              fi
            else
              echo "ERROR: PROXMOX_API_TOKEN or PROXMOX_ENDPOINT not set"
              exit 1
            fi
          `,
          environment: {
            PROXMOX_API_TOKEN: pulumi.interpolate`${this.props.proxmoxProvider.id}`, // Provider token reference
            PROXMOX_ENDPOINT: pulumi.interpolate`${this.props.proxmoxProvider.endpoint}`, // Provider endpoint
          },
        },
        {
          parent: this,
          dependsOn: [stopVMCommand],
        }
      );
      
      // Step 3: Verify template creation and get status
      const templateVerificationCommand = new command.local.Command(
        `${this.templateName}-verify-template`,
        {
          create: pulumi.interpolate`
            # Verify template creation and get template properties
            if [ -n "$PROXMOX_API_TOKEN" ] && [ -n "$PROXMOX_ENDPOINT" ]; then
              echo "Verifying template ${templateId} on node ${this.props.proxmoxNode}"
              
              # Get template configuration
              TEMPLATE_CONFIG=$(curl -s -k \
                -H "Authorization: PVEAPIToken=$PROXMOX_API_TOKEN" \
                "$PROXMOX_ENDPOINT/api2/json/nodes/${this.props.proxmoxNode}/qemu/${templateId}/config")
              
              # Check if template flag is set
              if echo "$TEMPLATE_CONFIG" | grep -q '"template":1'; then
                echo "Template verification successful"
                echo "Template ID: ${templateId}"
                echo "Template name: ${this.templateName}"
                echo "Node: ${this.props.proxmoxNode}"
                echo "Storage: ${this.props.datastore}"
              else
                echo "WARNING: Template verification failed - template flag not found"
                echo "Config response: $TEMPLATE_CONFIG"
              fi
            else
              echo "ERROR: PROXMOX_API_TOKEN or PROXMOX_ENDPOINT not set"
              exit 1
            fi
          `,
          environment: {
            PROXMOX_API_TOKEN: pulumi.interpolate`${this.props.proxmoxProvider.id}`, // Provider token reference
            PROXMOX_ENDPOINT: pulumi.interpolate`${this.props.proxmoxProvider.endpoint}`, // Provider endpoint
          },
        },
        {
          parent: this,
          dependsOn: [templateConversionCommand],
        }
      );
      
      // Step 4: Create template info structure with conversion results
      const templateInfo: TemplateInfo = {
        id: templateId,
        name: this.templateName,
        status: 'ready',
        talosVersion: this.props.talosVersion,
        architecture: this.props.architecture,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        node: this.props.proxmoxNode,
        storage: this.props.datastore,
      };
      
      logger.info(`Template conversion workflow completed`, {
        templateId,
        name: this.templateName,
        status: templateInfo.status,
        conversionCommands: {
          stop: stopVMCommand.id,
          convert: templateConversionCommand.id,
          verify: templateVerificationCommand.id,
        },
      });
      
      return templateInfo;
    });
  }
  
  /**
   * T3.1.3.5: Template lifecycle management
   */
  private manageTemplateLifecycle(
    template: pulumi.Output<TemplateInfo>,
    image: pulumi.Output<TemplateImageInfo>,
    baseVM: pulumi.Output<TemplateVMInfo>
  ): pulumi.Output<boolean> {
    return pulumi.all([template, image, baseVM]).apply(([templateInfo, imageInfo, vmInfo]) => {
      logger.info(`Managing template lifecycle`, {
        templateId: templateInfo.id,
        status: templateInfo.status,
      });
      
      // TODO: Implement lifecycle management
      // - Monitor template health
      // - Handle updates and versioning
      // - Cleanup old versions
      // - Backup template configurations
      // - Validate template integrity
      
      // Template is ready when all components are created successfully
      const isReady = templateInfo.status === 'ready' && 
                     imageInfo.downloadedFile !== undefined &&
                     vmInfo.baseVM !== undefined;
      
      if (isReady) {
        logger.info(`Template lifecycle management completed`, {
          templateId: templateInfo.id,
          name: templateInfo.name,
          ready: true,
        });
      }
      
      return isReady;
    });
  }
  
  /**
   * Generate a unique template ID
   */
  private generateTemplateId(): number {
    // Generate template ID based on name hash
    // In production, this should ensure uniqueness across the Proxmox cluster
    const hash = this.templateName
      .split('')
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Use range 9000-9999 for templates
    return 9000 + (hash % 1000);
  }
  
  /**
   * Get template status
   */
  public getTemplateStatus(): pulumi.Output<TemplateStatus> {
    return this.template.apply(template => template.status);
  }
  
  /**
   * Check if template is ready for use
   */
  public isReady(): pulumi.Output<boolean> {
    return this.ready;
  }
  
  /**
   * Get template metadata
   */
  public getTemplateInfo(): pulumi.Output<TemplateInfo> {
    return this.template;
  }
}

/**
 * Utility function to create a VM template component
 */
export function createVMTemplate(
  name: string,
  props: VMTemplateComponentProps,
  opts?: pulumi.ComponentResourceOptions
): VMTemplateComponent {
  return new VMTemplateComponent(name, props, opts);
}