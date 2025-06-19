# InfraFlux Orchestrator

The master orchestration role for InfraFlux v2.0 infrastructure automation. This role coordinates all phases of deployment from prerequisites validation through infrastructure deployment to final validation and reporting.

## Overview

This role provides a complete end-to-end orchestration workflow for deploying Talos Kubernetes clusters on Proxmox infrastructure. It coordinates multiple specialized roles to handle image preparation, template creation, Terraform generation, infrastructure deployment, and validation.

## Role Architecture

The orchestrator follows a phased approach:

1. **Prerequisites Validation** - Verify Proxmox connectivity, resources, and configuration
2. **Image Preparation** - Download and distribute Talos images via Image Factory
3. **Template Creation** - Create VM templates using Packer
4. **Infrastructure Generation** - Generate Terraform configurations dynamically
5. **Infrastructure Deployment** - Apply Terraform to provision VMs
6. **Deployment Validation** - Verify deployment success and VM health
7. **Reporting** - Generate comprehensive deployment reports

## Dependencies

This role orchestrates the following roles:
- `talos_image` - Talos image management
- `packer_templates` - VM template creation
- `terraform_generator` - Dynamic Terraform generation

## Configuration

### Required Variables

The orchestrator requires access to the global configuration structure defined in your inventory. Key configuration sections:

- `project` - Project metadata
- `cluster` - Cluster configuration including Talos settings
- `proxmox` - Proxmox API and infrastructure settings
- `terraform_config` - Terraform workspace configuration

### Orchestration Flow Control

```yaml
orchestration_flow:
  validate_prerequisites: true
  prepare_images: true
  create_templates: true
  generate_terraform: true
  deploy_infrastructure: true
  validate_deployment: true
```

### Prerequisites Configuration

```yaml
prerequisites:
  check_connectivity: true
  validate_resources: true
  verify_storage: true
  check_network: true
  validate_permissions: true
```

### Deployment Settings

```yaml
infrastructure_deployment:
  plan_only: false
  auto_approve: false
  wait_timeout: 1800
  health_check_retries: 10
  health_check_delay: 30
```

## Usage

### Basic Usage

```yaml
- name: "Deploy InfraFlux infrastructure"
  include_role:
    name: infraflux_orchestrator
```

### Selective Phase Execution

```yaml
- name: "Run only validation and planning"
  include_role:
    name: infraflux_orchestrator
  vars:
    orchestration_flow:
      validate_prerequisites: true
      prepare_images: false
      create_templates: false
      generate_terraform: true
      deploy_infrastructure: false
      validate_deployment: false
    infrastructure_deployment:
      plan_only: true
```

### Custom Configuration

```yaml
- name: "Deploy with custom settings"
  include_role:
    name: infraflux_orchestrator
  vars:
    infrastructure_deployment:
      auto_approve: true
      wait_timeout: 2400
    validation:
      detailed_reporting: true
      fail_fast: false
```

## Tags

The role supports granular execution via tags:

- `orchestration` - All orchestration tasks
- `prerequisites` - Prerequisites validation only
- `images` - Image preparation only
- `templates` - Template creation only
- `terraform` - Terraform generation only
- `deploy` - Infrastructure deployment only
- `validate` - Deployment validation only
- `report` - Final reporting only

### Tag Usage Examples

```bash
# Run only prerequisites validation
ansible-playbook -i inventory site.yml --tags prerequisites

# Skip prerequisites and go straight to deployment
ansible-playbook -i inventory site.yml --skip-tags prerequisites

# Run only Terraform planning
ansible-playbook -i inventory site.yml --tags terraform \
  -e "infrastructure_deployment.plan_only=true"
```

## Generated Outputs

The orchestrator generates several important files in the Terraform workspace:

### Core Files
- `main.tf` - Generated Terraform configuration
- `variables.tf` - Terraform variable definitions
- `terraform.tfvars` - Variable values (contains secrets)
- `backend.tf` - Backend configuration

### Planning and Deployment
- `<environment>.tfplan` - Terraform execution plan
- `plan_summary.json` - Human-readable plan summary
- `deployment_summary.json` - Deployment results

### Validation and Reporting
- `validation_report.json` - Infrastructure validation results
- `final_deployment_report.json` - Comprehensive deployment report
- `DEPLOYMENT_SUMMARY.md` - Human-readable summary
- `next_steps.sh` - Post-deployment instructions

## Error Handling

The orchestrator includes comprehensive error handling:

- **Validation Failures** - Early detection of configuration issues
- **Resource Conflicts** - VM ID and resource availability checks
- **Deployment Failures** - Automatic rollback capabilities
- **Network Issues** - Connectivity validation and retry logic

### Rollback Configuration

```yaml
rollback:
  enabled: true
  preserve_state: true
  cleanup_resources: true
  restore_backup: false
```

## Monitoring and Logging

### Logging Configuration

```yaml
logging:
  level: "INFO"
  detailed_output: true
  preserve_logs: true
  log_retention_days: 7
```

### Progress Tracking

The orchestrator provides detailed progress information:
- Phase-by-phase status updates
- Resource allocation summaries
- Deployment timing metrics
- Validation results

## Security Considerations

- Secrets are handled via Ansible Vault
- Terraform state files contain sensitive information
- Generated files include API tokens and SSH keys
- Workspace permissions are set appropriately

## Best Practices

1. **Always validate first** - Run prerequisites validation before deployment
2. **Review plans** - Examine Terraform plans before applying
3. **Monitor resources** - Watch Proxmox resource utilization during deployment
4. **Backup state** - Preserve Terraform state files
5. **Document changes** - Maintain deployment logs and summaries

## Troubleshooting

### Common Issues

1. **Prerequisites failures** - Check Proxmox connectivity and permissions
2. **Resource constraints** - Verify available CPU, memory, and storage
3. **Network issues** - Validate bridge and VLAN configuration
4. **Template problems** - Check Packer logs and image availability
5. **Terraform errors** - Review generated configuration syntax

### Debug Mode

Enable detailed debugging:

```yaml
logging:
  level: "DEBUG"
  detailed_output: true
validation:
  detailed_reporting: true
```

## Integration

This role integrates seamlessly with:
- Proxmox VE clusters
- Ansible Vault for secrets management
- Terraform for infrastructure provisioning
- Talos Linux for Kubernetes
- Packer for image creation

## Contributing

When extending this role:
1. Maintain the phased approach
2. Add appropriate error handling
3. Update documentation
4. Include validation checks
5. Follow existing patterns