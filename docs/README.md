# InfraFlux v2.0 Documentation

This directory contains comprehensive documentation for the InfraFlux v2.0 project.

## Documentation Structure

### 📋 Specifications (`specs/`)
Technical specifications and requirements for all system components.

- [`architecture.md`](specs/architecture.md) - Overall system design and component interaction
- [`infrastructure.md`](specs/infrastructure.md) - Proxmox resource requirements and topology
- [`talos-cluster.md`](specs/talos-cluster.md) - Talos cluster configuration and standards
- [`gitops.md`](specs/gitops.md) - GitOps workflow and application deployment
- [`configuration-schema.md`](specs/configuration-schema.md) - Configuration file structure and validation
- [`interfaces.md`](specs/interfaces.md) - API integration patterns and error handling

### 🏗️ Architecture (`architecture/`)
System architecture documents and design decisions.

- Component diagrams and relationships
- Data flow and integration patterns
- Security boundaries and trust zones
- Scalability and performance considerations

### 📡 API Documentation (`api/`)
API and interface documentation for system integrations.

- Proxmox API integration patterns
- Talos API interaction specifications
- Kubernetes API access and RBAC
- External service integration points

### 📖 Guides (`guides/`)
User and developer guides for working with InfraFlux.

- Installation and setup procedures
- Configuration management guides
- Troubleshooting and debugging
- Best practices and conventions

### 💡 Examples (`examples/`)
Configuration examples and templates for various deployment scenarios.

- `minimal-deployment.yaml` - Smallest viable deployment
- `production-deployment.yaml` - Full-featured production setup
- `development-deployment.yaml` - Development environment
- `multi-tenant-deployment.yaml` - Multi-tenant configuration

### 📊 Planning (`plan/`)
Project planning, tracking, and decision records.

- [`implementation-plan.md`](plan/implementation-plan.md) - Detailed implementation roadmap
- [`milestones.md`](plan/milestones.md) - Milestone tracking and status
- [`decisions.md`](plan/decisions.md) - Architectural decision records (ADR)
- [`issues.md`](plan/issues.md) - Known issues and blockers tracking

## Documentation Standards

### Writing Guidelines
- Use clear, concise language with technical precision
- Include code examples and practical demonstrations
- Maintain consistent formatting and structure
- Update documentation alongside code changes

### File Organization
- Use kebab-case for file names (e.g., `talos-cluster.md`)
- Include proper front matter and metadata
- Cross-reference related documents
- Maintain table of contents for longer documents

### Review Process
- All specifications require review before implementation
- Documentation changes follow the same review process as code
- Keep documentation current with implementation changes
- Regular documentation audits and updates

## Getting Started

1. Read the [System Architecture Specification](specs/architecture.md) for overall understanding
2. Review [Infrastructure Specification](specs/infrastructure.md) for resource requirements
3. Check [Configuration Schema](specs/configuration-schema.md) for setup requirements
4. Follow examples in the [`examples/`](examples/) directory
5. Refer to guides for specific procedures and best practices

## Contributing to Documentation

- Follow the established documentation standards
- Update relevant sections when making changes
- Include examples and practical guidance
- Cross-reference related documentation
- Keep language clear and accessible