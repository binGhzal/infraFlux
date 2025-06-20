/**
 * VM Template Component - manages VM template creation and lifecycle
 */

import * as pulumi from '@pulumi/pulumi';
import { logger } from '../../utils/logger';

export interface VMTemplateProps {
  name: string;
  sourceImage: string;
  proxmoxNode: string;
  datastore: string;
  customizations?: TemplateCustomization[];
}

export interface TemplateCustomization {
  type: 'package' | 'script' | 'file';
  content: string;
  target?: string;
}

export class VMTemplateComponent extends pulumi.ComponentResource {
  public readonly templateId: pulumi.Output<number>;
  public readonly templateName: string;

  constructor(name: string, props: VMTemplateProps, opts?: pulumi.ComponentResourceOptions) {
    super('infraflux:storage:VMTemplate', name, {}, opts);

    const { name: templateName, sourceImage, proxmoxNode, datastore, customizations } = props;
    
    logger.info(`Creating VM template: ${templateName}`, {
      sourceImage,
      node: proxmoxNode,
      datastore,
      customizations: customizations?.length || 0,
    });

    // TODO: Implement template creation
    // - Download source image if needed
    // - Create VM from image
    // - Apply customizations
    // - Convert to template
    // - Set appropriate permissions

    this.templateName = templateName;
    this.templateId = pulumi.output(9000); // Placeholder template ID

    this.registerOutputs({
      templateId: this.templateId,
      templateName: this.templateName,
    });
  }
}