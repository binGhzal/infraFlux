# Technology Decisions for InfraFlux v2.0

## Core Technology Stack

### Infrastructure as Code: Pulumi

**Decision**: Adopt Pulumi with TypeScript **Rationale**:

- Unified toolchain replaces Ansible + Terraform + Packer
- Native programming language (TypeScript) vs DSLs
- Built-in testing capabilities with Jest
- Integrated secret management via Pulumi ESC
- Superior developer experience and maintainability

### Programming Language: TypeScript

**Decision**: Use TypeScript for all infrastructure code **Rationale**:

- Type safety for infrastructure definitions
- Rich IDE support and IntelliSense
- Extensive ecosystem and tooling
- Familiar to developers
- Strong async/await support for infrastructure operations

### Proxmox Integration: @muhlba91/pulumi-proxmoxve

**Decision**: Use community Proxmox provider **Rationale**:

- Mature provider with comprehensive VM management
- Active maintenance and community support
- Native cloud-init integration
- Template and cloning support
- Strong documentation and examples

### Kubernetes Distribution: Talos Linux

**Decision**: Continue with Talos for Kubernetes clusters **Rationale**:

- Immutable and secure by design
- API-driven configuration
- Excellent for automation
- Minimal attack surface
- Cloud-native architecture

### Secret Management: Pulumi ESC

**Decision**: Replace Ansible Vault with Pulumi ESC **Rationale**:

- Native integration with Pulumi infrastructure code
- Kubernetes-native secret injection
- Automated secret rotation capabilities
- Environment-based secret organization
- GitOps compatible

### Testing Framework: Jest

**Decision**: Use Jest for unit and integration testing **Rationale**:

- Mature TypeScript testing framework
- Excellent mocking capabilities
- Built-in assertion library
- Async testing support
- Rich ecosystem of plugins

### GitOps: FluxCD

**Decision**: Integrate with FluxCD for continuous deployment **Rationale**:

- Native Kubernetes GitOps controller
- Excellent Pulumi integration via Automation API
- Declarative configuration management
- Automated drift detection and correction
- Strong RBAC and security model

## Replaced Technologies

### Ansible → Pulumi Components

- Configuration management becomes TypeScript modules
- Playbooks become Pulumi programs
- Inventory becomes stack configurations
- Vault becomes Pulumi ESC

### Terraform → Pulumi Core

- HCL becomes TypeScript
- Terraform modules become Pulumi components
- State management unified under Pulumi
- Provider ecosystem leverage

### Packer → Pulumi VM Templates

- Template creation becomes Pulumi VM resources
- Build automation becomes TypeScript functions
- Image management becomes Pulumi state tracking

## Development Tools

### Package Management: npm/yarn

- Standard Node.js ecosystem
- Dependency management
- Script automation
- Development workflows

### Code Quality: ESLint + Prettier

- Consistent code formatting
- Best practice enforcement
- Automated linting
- IDE integration

### CI/CD: GitHub Actions

- Automated testing on pull requests
- Pulumi preview and deployment
- Security scanning
- Documentation generation

## Infrastructure Components

### Networking

- VLAN management via Pulumi
- Bridge configuration
- IP allocation and DHCP
- Network policies

### Storage

- Proxmox datastore management
- Volume provisioning
- Backup automation
- Storage classes for Kubernetes

### Compute

- VM template management
- Resource allocation
- Load balancing
- Auto-scaling capabilities

### Security

- Network segmentation
- RBAC implementation
- Certificate management
- Security scanning integration
