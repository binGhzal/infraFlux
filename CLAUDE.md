# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

## Project Overview

InfraFlux v2.0 is a modern infrastructure automation project that uses Pulumi with TypeScript to
provision and manage a homelab on Proxmox virtual machines. The project provides a unified
Infrastructure as Code solution that manages the entire lifecycle from VM template creation to Talos
Kubernetes cluster deployment and GitOps-ready application orchestration.

The whole project is designed to be deployable with a single command to create a reproducible
homelab environment. It emphasizes type safety, developer experience, and maintainability through
modern TypeScript development patterns. The repository uses a component-based architecture with
comprehensive testing and integrated secret management via Pulumi ESC.

## Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/infraflux.git
cd infraflux

# 2. Install dependencies
npm install

# 3. Configure your stack
pulumi stack init homelab-dev
pulumi config set proxmox:endpoint https://proxmox.example.com:8006
pulumi config set --secret proxmox:api_token_secret <your-api-token>

# 4. Deploy your infrastructure
pulumi up
```

## Prerequisites and Dependencies

### Required Software

- Node.js >= 18.0.0
- npm >= 9.0.0
- Pulumi >= 3.178.0
- TypeScript >= 4.9.0
- talosctl >= 1.10.0 (for Talos cluster management)
- kubectl >= 1.28.0 (for Kubernetes management)
- Docker >= 24.0.0 (for container operations)

### Proxmox Requirements

- Proxmox VE >= 7.4
- API access enabled
- Sufficient resources for VM deployment
- Network bridge configured (typically vmbr0)

### Network Requirements

- IP range allocated for VMs
- VLAN support (optional)
- DNS server accessible
- Internet connectivity for package downloads
- Auto discovery of lan IPs via DHCP or static IP configuration

## Main Guidelines

### Deployment Principles

- **One-Command Deployment**: The entire infrastructure must be deployable with `pulumi up`
- **Declarative Approach**: Users define desired state; the system applies necessary changes
- **No Hardcoded Values**: All configurations use variables and templates
- **Reproducible Environments**: Every deployment produces identical results
- **Talos-First**: Use Talos Linux for immutable, secure Kubernetes clusters

### Code Quality Standards

- **Modular Components**: TypeScript components with clear interfaces and separation of concerns
- **Type Safety**: Comprehensive TypeScript types for all infrastructure resources
- **Testing First**: Unit, integration, and end-to-end tests for all components
- **Error Handling**: Type-safe error handling with detailed validation
- **Best Practices**: Follow TypeScript, Pulumi, and Kubernetes community standards

### Architectural Decisions

- **Component-Based Design**: Reusable Pulumi components with composition patterns
- **Stack-Driven**: Pulumi stacks define environment-specific configurations
- **GitOps Ready**: Native FluxCD integration via Pulumi Automation API
- **Integrated Secrets**: Pulumi ESC for unified secret and configuration management
- **Multi-Tenancy**: Resource isolation through namespaces and RBAC

### Extension Guidelines

- **Module Pattern**: New features as separate modules
- **Documentation First**: Document before implementing
- **Backward Compatibility**: Extensions must not break existing deployments
- **Test Coverage**: All new features require tests

## Claude Code Integration & Capabilities

### MCP Server Configuration

InfraFlux v2.0 leverages multiple MCP (Model Context Protocol) servers to enhance development workflows. The configuration is stored in `.claude/.mcp.json`:

#### Available MCP Servers

**Context7** (`@context7/mcp-server`)
- **Purpose**: Library documentation and API reference lookup
- **Usage**: Get up-to-date documentation for Pulumi, Proxmox, TypeScript, Jest, etc.
- **Commands**:
  - `mcp__context7__resolve-library-id`: Find library ID for documentation
  - `mcp__context7__get-library-docs`: Fetch comprehensive library docs
- **When to use**: Before implementing new features, when troubleshooting API issues

**Consult7** (`@consult7/mcp-server`)
- **Purpose**: Code analysis and consultation across file patterns
- **Usage**: Analyze code patterns, find implementations, understand codebase structure
- **Commands**:
  - `mcp__consult7__consultation`: Analyze files matching regex patterns
- **When to use**: Refactoring, code reviews, understanding existing implementations

**Vibe Check** (`vibe-check-mcp-server`)
- **Purpose**: Metacognitive questioning and plan validation
- **Usage**: Prevent tunnel vision, validate complex plans, learn from mistakes
- **Commands**:
  - `mcp__vibe-check-mcp-server__vibe_check`: Validate plans and identify assumptions
  - `mcp__vibe-check-mcp-server__vibe_distill`: Simplify overly complex plans
  - `mcp__vibe-check-mcp-server__vibe_learn`: Record patterns and lessons learned
- **When to use**: Before major decisions, when plans become complex, after encountering issues

**Memory Plus** (`@memory-plus/mcp-server`)
- **Purpose**: Persistent memory management for conversation context
- **Usage**: Store project state, retrieve context, maintain conversation continuity
- **Commands**:
  - `mcp__memory-plus__record`: Store important information and decisions
  - `mcp__memory-plus__retrieve`: Get relevant context based on semantic search
  - `mcp__memory-plus__recent`: Get most recent memories for temporal context
  - `mcp__memory-plus__update`: Update existing memories with new information
  - `mcp__memory-plus__export`: Export memories for external analysis
- **When to use**: Always for major decisions, at start of new conversations, for progress tracking

**DeepWiki** (`@deepwiki/mcp-server`)
- **Purpose**: GitHub repository documentation and wiki access
- **Usage**: Research GitHub projects, read documentation, understand implementations
- **Commands**:
  - `mcp__deepwiki__read_wiki_structure`: Get documentation structure
  - `mcp__deepwiki__read_wiki_contents`: Read repository documentation
  - `mcp__deepwiki__ask_question`: Query specific information about repositories
- **When to use**: Researching similar projects, understanding dependencies

**Octagon Deep Research** (`@octagon/deep-research-mcp`)
- **Purpose**: Comprehensive research and analysis across topics
- **Usage**: Technology research, competitive analysis, architectural decisions
- **Commands**:
  - `mcp__octagon-deep-research__octagon-deep-research-agent`: Comprehensive research
- **When to use**: Major technology decisions, architectural choices, market research

**MCP Mermaid** (`@mcp/mermaid`)
- **Purpose**: Generate Mermaid diagrams for documentation
- **Usage**: Create architectural diagrams, flowcharts, sequence diagrams
- **Commands**:
  - `mcp__mcp-mermaid__generate_mermaid_diagram`: Generate visual diagrams
- **When to use**: Creating documentation, explaining architecture, planning workflows

### Claude Code Workflow Commands

The `.claude/settings.json` file defines comprehensive workflow commands:

#### Primary Commands

**project-status**
```bash
# Get comprehensive project status
# - TodoRead for current tasks
# - memory-plus recent for latest context  
# - Read CLAUDE.md overview
# - Summarize current state and next steps
```

**deep-research**
```bash
# Conduct comprehensive research on topics
# - octagon-deep-research for initial analysis
# - context7 for technical documentation
# - deepwiki for GitHub insights
# - memory-plus to record findings
```

**validate-plan**
```bash
# Validate plans using metacognitive analysis
# - vibe-check with current plan
# - vibe-distill if too complex
# - Update plan based on feedback
# - Record validated plan
```

**setup-development**
```bash
# Complete development environment setup
# - Run dev-setup.sh script
# - Install dependencies and build
# - Run tests and linting
# - Record setup completion
```

**commit-with-memory**
```bash
# Commit changes and record progress
# - Review changes with git status/diff
# - Stage and commit with detailed message
# - Record progress to memory
# - Update todo status
```

#### Workflow Patterns

**Daily Standup**: project-status → plan-next-phase
**Feature Development**: validate-plan → test-component → analyze-codebase → commit-with-memory
**Research & Decide**: deep-research → validate-plan → create-documentation
**Troubleshooting**: troubleshoot-issue → test-component → commit-with-memory

### Development Workflow Integration

#### Quality Gates
- **Before Commit**: lint, typecheck, unit tests
- **Before Major Change**: validate-plan, backup current state
- **Complex Plans**: Automatic vibe-check validation

#### Auto Actions
- **New Chat**: Read context-prime.md, get recent memory, read todos
- **Complex Plan**: Automatic vibe-check triggering
- **Research Needed**: Automatic deep-research workflow

#### Memory Management Pattern
```typescript
// Standard workflow for any major work:
1. mcp__memory-plus__retrieve("relevant context")
2. [Do the work]
3. mcp__memory-plus__record("what was accomplished")
4. TodoWrite to update task status
```

### Testing Strategy Integration

The testing strategy leverages Claude Code capabilities for comprehensive validation:

#### Test Development Workflow
1. **Component Analysis**: Use consult7 to understand existing patterns
2. **Test Creation**: Write unit, integration, property-based tests
3. **Validation**: Use vibe-check to validate test coverage
4. **Documentation**: Record testing patterns in memory-plus

#### Test Categories
- **Unit Tests**: Component logic validation with Jest
- **Integration Tests**: Multi-component interaction testing
- **Property Tests**: Property-based testing with fast-check
- **E2E Tests**: Full deployment validation
- **Contract Tests**: Provider API contract validation

### Documentation Standards

#### Auto-Documentation
- All major decisions recorded in memory-plus
- Architectural changes documented in ADR format
- Complex workflows visualized with mcp-mermaid
- API documentation generated from TypeScript types

#### Documentation Workflow
1. **Research**: Use context7 for current best practices
2. **Structure**: Create outline and gather information
3. **Visual**: Generate diagrams with mcp-mermaid
4. **Review**: Use vibe-check to validate completeness
5. **Record**: Store in memory-plus for future reference

### Error Handling and Troubleshooting

#### Systematic Troubleshooting
1. **Context Retrieval**: memory-plus retrieve similar issues
2. **Research**: context7 for library documentation
3. **Analysis**: consult7 to understand code patterns
4. **Solution**: Test and validate fixes
5. **Learning**: vibe-learn to record solution patterns

#### Common Issue Patterns
- **Proxmox API**: Authentication, SSL, network connectivity
- **Pulumi State**: State consistency, provider issues
- **TypeScript**: Type errors, dependency conflicts
- **Testing**: Mock setup, async testing, environment issues

## Configuration Structure

### Stack Configuration (`Pulumi.<stack>.yaml`)

```yaml
config:
  # Proxmox settings
  proxmox:endpoint: https://proxmox.example.com:8006
  proxmox:node: proxmox-node1
  proxmox:datastore: local-lvm
  proxmox:network_bridge: vmbr0

  # Cluster settings
  infraflux:cluster_name: homelab-dev
  infraflux:cluster_version: v1.6.0
  infraflux:node_count: 3
  infraflux:vm_template: talos-v1.6.0

  # Network settings
  infraflux:domain: homelab.local
  infraflux:pod_subnet: 10.244.0.0/16
  infraflux:service_subnet: 10.96.0.0/12

  # Secret references (managed by Pulumi ESC)
  infraflux:environment: infraflux-dev
```

### TypeScript Configuration (`src/types/config.ts`)

```typescript
export interface GlobalConfig {
  readonly project: ProjectConfig;
  readonly proxmox: ProxmoxConfig;
  readonly cluster: ClusterConfig;
  readonly network: NetworkConfig;
}

export interface ProxmoxConfig {
  readonly endpoint: string;
  readonly node: string;
  readonly datastore: string;
  readonly networkBridge: string;
}

export interface ClusterConfig {
  readonly name: string;
  readonly version: string;
  readonly nodeCount: number;
  readonly distribution: 'talos' | 'k3s';
}
```

### Talos Image Factory Integration

Talos Linux Image Factory enables us to create a Talos image with the configuration we want either
through point and click, or by POSTing a YAML/JSON schematic to https://factory.talos.dev/schematics
to get back a unique schematic ID.

In our example we want to install QEMU guest agent to report VM status to the Proxmox hypervisor,
including Intel microcode and iGPU drivers to be able to take full advantage of Quick Sync Video on
Kubernetes.

```yaml
# tofu/talos/image/schematic.yaml
customization:
  systemExtensions:
    officialExtensions:
      - siderolabs/i915-ucode
      - siderolabs/intel-ucode
      - siderolabs/qemu-guest-agent
```

which yields the schematic ID

```json
{
  "id": "dcac6b92c17d1d8947a0cee5e0e6b6904089aa878c70d66196bb1138dbd05d1a"
}
```

when POSTed to https://factory.talos.dev/schematics.

Combining our wanted schematic_id, version, platform, and architecture we can use

```URL
https://factory.talos.dev/image/<schematid_id>/<version>/<platform>-<architecture>.raw.gz
```

as a template to craft a URL to download the requested image.

A simplified Terraform recipe to automate the process of downloading the Talos image to a Proxmox
host looks like

```yaml
# terraform/talos/image.tf
locals {
  version = var.image.version
  schematic = var.image.schematic
  schematic_id = jsondecode(data.http.schematic_id.response_body)["id"]
  image_id = "${local.schematic_id}_${local.version}"

  update_version = coalesce(var.image.update_version, var.image.version)
  update_schematic = coalesce(var.image.update_schematic, var.image.schematic)
  update_schematic_id = jsondecode(data.http.updated_schematic_id.response_body)["id"]
  update_image_id = "${local.update_schematic_id}_${local.update_version}"
}

data "http" "schematic_id" {
  url          = "${var.image.factory_url}/schematics"
  method       = "POST"
  request_body = local.schematic
}

data "http" "updated_schematic_id" {
  url          = "${var.image.factory_url}/schematics"
  method       = "POST"
  request_body = local.update_schematic
}

resource "proxmox_virtual_environment_download_file" "this" {
  for_each = toset(distinct([for k, v in var.nodes : "${v.host_node}_${v.update == true ? local.update_image_id : local.image_id}"]))

  node_name    = split("_", each.key)[0]
  content_type = "iso"
  datastore_id = var.image.proxmox_datastore

  file_name               = "talos-${split("_",each.key)[1]}-${split("_", each.key)[2]}-${var.image.platform}-${var.image.arch}.img"
  url = "${var.image.factory_url}/image/${split("_", each.key)[1]}/${split("_", each.key)[2]}/${var.image.platform}-${var.image.arch}.raw.gz"
  decompression_algorithm = "gz"
  overwrite               = false
}
```

## Key Features

- **Dynamic Terraform Generation**: Uses Jinja2 templates to create Terraform configurations based
  on Ansible inventory
- **Dynamic Inventory-Driven Configuration**: Ansible inventory defines infrastructure topology for
  flexible resource management
- **VM Template Management**: Packer creates and manages reusable VM templates on Proxmox
- **Ansible Orchestration**: Manages entire infrastructure lifecycle from template creation to
  cluster deployment
- **Proxmox Integration**: Native integration with Proxmox API for VM management
- **Talos/K3s Cluster Deployment**: Automated deployment of lightweight, secure Kubernetes
  environments
- **GitOps Integration**: Native FluxCD/ArgoCD support for continuous deployment
- **Automated Scaling**: Dynamic infrastructure scaling based on resource requirements
- **Modular Design**: Component-based architecture for easy extension
- **Security First**: Ansible Vault, Sealed Secrets, and RBAC by default
- **Network Flexibility**: VLAN support, custom networking, and multi-homed configurations
- **CI/CD Ready**: GitHub Actions workflows for automated testing and deployment
- **High Availability**: Built-in HA support for control plane and critical services
- **Monitoring Stack**: Prometheus, Grafana, and Loki pre-configured
- **Multi-Tenancy**: Namespace isolation, resource quotas, and network policies

## Architecture and Design Patterns

### Deployment Flow

```diagram
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Ansible         │────▶│ Packer           │────▶│ Proxmox         │
│ Inventory       │     │ (VM Templates)    │     │ (VM Creation)   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                                  │
         ▼                                                  ▼
┌─────────────────┐                              ┌─────────────────┐
│ Jinja2          │                              │ Terraform       │
│ (TF Generation) │─────────────────────────────▶│ (Infrastructure)│
└─────────────────┘                              └─────────────────┘
         │                                                  │
         ▼                                                  ▼
┌─────────────────┐                              ┌─────────────────┐
│ Talos/K3s       │                              │ GitOps          │
│ (Bootstrapping) │◀─────────────────────────────│ (FluxCD/Argo)   │
└─────────────────┘                              └─────────────────┘
```

### Dynamic Terraform Generation

The project uses Jinja2 templates to dynamically generate Terraform configurations:

- Templates located in `terraform/templates/`
- Variables populated from Ansible inventory
- Supports conditional resource creation
- Maintains DRY principles across environments

### VM Template Management

Packer manages VM templates with:

- talos base images for Talos clusters
- Base OS configurations via cloud-init
- Pre-installed common packages
- Security hardening applied
- Network optimization configured
- Templates stored in Proxmox storage

### Ansible Orchestration

The main workflow in `ansible/roles/proxmox/tasks/controller.yaml`:

1. Validate prerequisites and connectivity
2. Prepare Terraform workspace (temporary directory)
3. Generate Terraform files for each inventory group
4. Create/update VM templates on Proxmox
5. Execute Terraform to provision infrastructure
6. Wait for VMs to become accessible
7. Bootstrap Kubernetes cluster
8. Deploy GitOps controller

### Declarative Configuration

Users define desired state through:

- Ansible inventory for infrastructure topology
- YAML configurations for cluster settings
- Kubernetes manifests for applications
- GitOps repositories for continuous reconciliation

### Multi-Tenancy Design

- **Resource Isolation**: Kubernetes namespaces with strict RBAC
- **Network Segregation**: Per-tenant VLANs and network policies
- **Storage Quotas**: PVC limits defined in user configurations
- **Access Control**: Integration with OIDC/LDAP providers
- **Audit Logging**: All actions logged and monitored

## Security and Secrets Management

### Security Architecture

```diagram
┌─────────────────────┐
│   Ansible Vault     │ ← Encrypts sensitive playbook variables
├─────────────────────┤
│  Sealed Secrets     │ ← Encrypts K8s secrets in Git
├─────────────────────┤
│      RBAC          │ ← Controls cluster access
├─────────────────────┤
│  Network Policies   │ ← Restricts pod communication
└─────────────────────┘
```

### Implementation Guidelines

- **Ansible Secrets**: Store in `group_vars/all/vault.yml` using Ansible Vault
- **Git Secrets**: Use Sealed Secrets for GitOps repositories
- **API Tokens**: Never commit; use environment variables or vault
- **SSH Keys**: Generate per-deployment; rotate regularly
- **Certificates**: Auto-generated with cert-manager

### Security Checklist

- [ ] Ansible Vault password configured in `ansible.cfg`
- [ ] Proxmox API token created with minimal permissions
- [ ] Network policies defined for all namespaces
- [ ] RBAC policies implemented with least privilege
- [ ] Sealed Secrets controller deployed
- [ ] Audit logging enabled and configured
- [ ] Regular security updates scheduled

## Day-2 Operations

### Adding Nodes

```bash
# 1. Update inventory
vim ansible/inventory/hosts.yml

# 2. Run node addition playbook
ansible-playbook ansible/add-node.yaml -e "node_name=k8s-worker-3"
```

### Scaling Resources

```bash
# Vertical scaling (resize VM)
ansible-playbook ansible/resize-vm.yaml -e "vm_name=k8s-worker-1 cores=16 memory=32768"

# Horizontal scaling (add replicas)
kubectl scale deployment myapp --replicas=5
```

### Upgrade Procedures

```bash
# Upgrade Kubernetes
ansible-playbook ansible/upgrade-cluster.yaml -e "target_version=1.28.0"

# Update VM templates
ansible-playbook ansible/update-templates.yaml
```

### Backup and Recovery

- **etcd Backups**: Automated daily via CronJob
- **PV Backups**: Velero integration for stateful workloads
- **Configuration Backups**: Git repository for all configs
- **Recovery RTO**: < 30 minutes for full cluster restoration

## GitOps Integration

### Repository Structure

```filesystem
homelab-apps/
├── clusters/
│   └── bootstrap/
│       ├── flux-system/
│       │   ├── kustomizations/
│       │   │       └── kustomization-podinfo.yaml
│       │   ├── helm-repos/
│       │   │       └── helmrepository-podinfo.yaml
│       │   └── namespaces/
│       │           └── namespace-podinfo.yaml
│       │
│       └── podinfo/
│           ├── configmap-podinfo-helm-chart-value-overrides.yaml
│           └── helmrelease-podinfo.yaml
└── README.md
```

### Infrastructure main services

- **authentik-oidc**: Identity provider for authentication
- **sealed-secrets**: Secure secret management
- **longhorn-pv**: Persistent storage solution
- **cert-manager**: Automated TLS certificate management
- **monitoring**: Prometheus and Grafana for observability with Loki for logs
- **Cilium**: CNI plugin for networking
- **lets-encrypt**: Automated TLS certificate issuance
- **flux2**: GitOps controller for continuous deployment
- **kustomize**: Configuration management tool for Kubernetes

### Deployment Strategy

1. **Base manifests** in `apps/base/`
2. **Environment overlays** in `apps/overlays/`
3. **Kustomize** for configuration management
4. **Automated sync** every 5 minutes
5. **Health checks** before promotion

### Secret Management with Sealed Secrets

```bash
# Encrypt secret
echo -n "mypassword" | kubectl create secret generic mysecret \
  --dry-run=client --from-file=password=/dev/stdin -o yaml | \
  kubeseal -o yaml > mysecret-sealed.yaml

# Commit to Git
git add mysecret-sealed.yaml
git commit -m "Add encrypted secret"
```

## Troubleshooting Guide

### Common Issues and Solutions

#### VM Creation Fails

```bash
# Check Proxmox connectivity
ansible -m ping proxmox

# Validate API credentials
curl -k -H "Authorization: PVEAPIToken=..." https://proxmox:8006/api2/json/cluster/status

# Review Terraform logs
terraform plan -detailed-exitcode
```

#### Cluster Bootstrap Issues

```bash
# Check node status
talosctl -n 10.0.1.101 health

# Review bootstrap logs
talosctl -n 10.0.1.101 logs kubelet

# Validate network connectivity
talosctl -n 10.0.1.101 get addresses
```

#### GitOps Sync Failures

```bash
# Check Flux status
flux get all

# Review controller logs
kubectl logs -n flux-system deployment/source-controller

# Force reconciliation
flux reconcile source git flux-system
```

### Debug Mode

Enable verbose output:

```bash
# Ansible debug
ANSIBLE_DEBUG=1 ansible-playbook deploy.yaml -vvv

# Terraform debug
TF_LOG=DEBUG terraform apply

# Kubernetes debug
kubectl get events --all-namespaces --sort-by='.lastTimestamp'
```

## Testing and Validation

### Testing Strategy

- **Unit Tests**: Ansible role testing with Molecule
- **Integration Tests**: Terraform plan validation
- **End-to-End Tests**: Full deployment verification
- **Smoke Tests**: Post-deployment health checks

### Adding Custom Applications

1. Create base manifests in GitOps repo
2. Add Kustomization for the app
3. Configure HelmRelease if using Helm
4. Create namespace and RBAC policies
5. Add monitoring and alerting rules

## Performance Optimization

### Resource Allocation Guidelines

- **Control Plane**: 4 cores, 8GB RAM minimum
- **Workers**: 8 cores, 16GB RAM for general workloads
- **Storage Nodes**: 4 cores, 16GB RAM, dedicated disks
- **Monitoring Stack**: 4 cores, 8GB RAM reserved

### Network Optimization

- Enable jumbo frames (MTU 9000) where supported
- Use SR-IOV for high-performance workloads
- Configure CPU affinity for network-intensive pods
- Implement traffic shaping for multi-tenant isolation

## Development Notes

### Code Organization

- Maintain clean separation of concerns
- Use meaningful variable names and comprehensive comments
- Follow established patterns for new components
- Regular refactoring to improve maintainability

### Documentation Requirements

- Update README.md for user-facing changes
- Maintain CHANGELOG.md with all modifications
- Document architectural decisions in `docs/adr/`
- Keep example configurations current

### Project Planning

- Track progress in `docs/plan/` directory
- Use GitHub Issues for bug tracking
- Maintain project board for feature planning
- Regular architecture reviews

### Version Control Best Practices

- Feature branches for new development
- Signed commits required
- Comprehensive PR descriptions
- Automated testing before merge

### Quality Assurance

- Fix all deprecation warnings
- Resolve linting issues before commit
- Maintain backward compatibility
- Performance testing for major changes

### Testing Requirements

- Test all changes on Proxmox environment
- Validate multi-node deployments
- Check resource consumption
- Verify idempotency of playbooks

### Continuous Improvement

- Regular dependency updates
- Security vulnerability scanning
- Performance profiling and optimization
- Community feedback integration

## Support and Community

### Getting Help

- GitHub Issues: Bug reports and feature requests
- You can fetch help from the internet or community forums
