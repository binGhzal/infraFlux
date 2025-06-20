# InfraFlux v2.0 Context Prime

This is the definitive context file for InfraFlux v2.0, containing all essential project information for seamless conversation continuity across chat sessions.

## Project Overview

**InfraFlux v2.0** is a unified Infrastructure as Code platform that automates Proxmox homelab infrastructure using Pulumi TypeScript. It replaces the previous three-tool ecosystem (Ansible + Terraform + Packer) with a single, type-safe, testable solution.

### Core Mission
- **One-Command Deployment**: Complete homelab infrastructure with `pulumi up`
- **Developer Experience**: Type-safe infrastructure with TypeScript
- **Modular Design**: Small, reusable components for maintainability
- **Testing-First**: Comprehensive unit, integration, and E2E testing
- **GitOps Ready**: Native FluxCD integration for continuous deployment

## Current Architecture (v2.0)

### Technology Stack
- **IaC Platform**: Pulumi (TypeScript)
- **Hypervisor**: Proxmox VE 7.4+
- **Kubernetes**: Talos Linux (immutable, secure)
- **Secret Management**: Pulumi ESC (Environments, Secrets, Configuration)
- **Testing**: Jest + fast-check (property-based testing)
- **CI/CD**: GitHub Actions + GitOps (FluxCD)
- **Networking**: Cilium CNI
- **Storage**: Longhorn distributed storage
- **Monitoring**: Prometheus + Grafana + Loki

### Key Architectural Decisions
1. **Pulumi over Ansible+Terraform+Packer**: Unified codebase, better testing, integrated secrets
2. **TypeScript over Python/Go**: Type safety, familiar ecosystem, excellent Pulumi support
3. **Pulumi ESC over HashiCorp Vault**: Native integration, simpler operations
4. **Talos over traditional K8s**: Immutable, secure, API-driven management
5. **Component-based architecture**: Small, focused, reusable modules

## Project Structure

```
infraFlux/
├── .claude/                    # Claude Code configuration
│   ├── context-prime.md       # This file - comprehensive context
│   ├── settings.json          # Claude Code settings and commands
│   └── .mcp.json             # MCP server configurations
├── src/                       # TypeScript source code
│   ├── components/           # Modular infrastructure components
│   │   ├── network/         # Network infrastructure (VLANs, bridges, firewall)
│   │   ├── storage/         # Storage management (templates, volumes, backups)
│   │   ├── compute/         # VM provisioning and management
│   │   └── kubernetes/      # Talos cluster and K8s resources
│   ├── stacks/              # Stack definitions per environment
│   │   ├── dev/            # Development environment
│   │   ├── staging/        # Staging environment
│   │   └── prod/           # Production environment
│   ├── config/             # Configuration schemas and validation
│   ├── utils/              # Utility functions and helpers
│   └── types/              # TypeScript type definitions
├── tests/                    # Comprehensive testing suite
│   ├── unit/               # Component unit tests
│   ├── integration/        # Multi-component integration tests
│   └── e2e/                # End-to-end deployment tests
├── docs/                     # Project documentation
│   ├── plan/               # Project planning and roadmaps
│   ├── specs/              # Technical specifications
│   └── adr/                # Architectural decision records
├── configs/                  # Configuration files and examples
├── scripts/                  # Development and deployment scripts
└── CLAUDE.md                # Primary project documentation for Claude
```

## Configuration Schema

### Global Configuration Structure
```typescript
interface GlobalConfig {
  project: ProjectConfig;       // Project metadata and environment
  proxmox: ProxmoxConfig;      // Proxmox connection and settings
  cluster: ClusterConfig;      // Kubernetes cluster configuration
  network: NetworkConfig;      // Network topology and security
  storage: StorageConfig;      // Storage datastores and volumes
  security: SecurityConfig;    // RBAC, secrets, certificates
}
```

### Key Configuration Points
- **Proxmox API**: Token-based authentication, node selection, storage datastores
- **Cluster Networking**: Pod/service subnets, CNI choice, network policies
- **Node Specifications**: CPU/memory/disk per role (control-plane vs worker)
- **Security**: RBAC policies, secret encryption, TLS certificates

## Development Workflow

### Phase-Based Implementation
**Current Status**: Phase 2.2 Complete - TypeScript project structure created

**Completed Phases:**
1. **Phase 1**: Planning & Documentation (7.5 hour detailed roadmap)
2. **Phase 2.1**: CLAUDE.md architecture updates
3. **Phase 2.2**: TypeScript project structure with modular components

**Next Phases:**
4. **Phase 3**: Core Pulumi Implementation
5. **Phase 4**: Kubernetes & Secrets Integration
6. **Phase 5**: GitOps & Automation
7. **Phase 6**: Documentation & Finalization

### Key Commands
```bash
# Development
npm run dev              # Development mode with ts-node
npm run build:watch      # Build with watch mode
npm run test:watch       # Run tests in watch mode

# Testing
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:e2e        # End-to-end tests
npm run test:coverage   # Coverage report

# Code Quality
npm run lint:fix        # Fix linting issues
npm run format         # Format code with Prettier
npm run typecheck      # TypeScript type checking

# Pulumi Operations
npm run pulumi:preview  # Preview infrastructure changes
npm run pulumi:up      # Deploy infrastructure
npm run pulumi:destroy # Destroy infrastructure
npm run stack:create   # Create new stack
```

## Memory Context

### Recent Accomplishments
1. **Architecture Research**: Comprehensive analysis confirming Pulumi superiority
2. **Documentation Foundation**: Complete planning docs, specs, and ADRs
3. **Project Structure**: Modular TypeScript foundation with testing infrastructure
4. **Development Tooling**: ESLint, Prettier, Jest, Husky integration

### Design Principles Applied
- **Modularity**: Small, focused components over large monolithic files
- **Type Safety**: Comprehensive TypeScript types and validation
- **Testing**: Unit, integration, and property-based testing
- **Developer Experience**: Clear abstractions and helpful error messages

## Dependencies & Integrations

### Core Dependencies
```json
{
  "@pulumi/pulumi": "^3.96.0",
  "@muhlba91/pulumi-proxmoxve": "^6.2.0",
  "@pulumi/kubernetes": "^4.5.0",
  "typescript": "^5.3.0",
  "jest": "^29.7.0",
  "joi": "^17.11.0"
}
```

### External Integrations
- **Proxmox VE**: Hypervisor management via REST API
- **Talos Factory**: Custom image generation with extensions
- **Pulumi Cloud**: State management and secret storage
- **GitHub**: Source control and CI/CD automation
- **FluxCD**: GitOps continuous deployment

## Configuration Examples

### Development Environment
- **Nodes**: 1 control-plane (2 cores, 4GB) + 2 workers (4 cores, 8GB)
- **Networking**: Simple bridge, DHCP, no VLANs
- **Features**: Monitoring, logging, GitOps enabled; backups disabled
- **Security**: Relaxed firewall for easier development

### Production Environment
- **Nodes**: 3 control-plane (4 cores, 8GB) + 3 workers (8 cores, 16GB) 
- **Networking**: VLAN segmentation, static IPs, network policies
- **Features**: All features enabled including backups and HA
- **Security**: Strict firewall, RBAC, encrypted secrets, TLS everywhere

## Troubleshooting Context

### Common Issues
1. **Proxmox Connectivity**: API endpoint, token authentication, SSL verification
2. **Template Creation**: Talos image download, cloud-init configuration
3. **Cluster Bootstrap**: Control plane initialization, worker joining
4. **Network Configuration**: Bridge setup, VLAN configuration, IP allocation

### Debug Strategies
- **Verbose Logging**: Set LOG_LEVEL=DEBUG environment variable
- **Pulumi State**: Check state consistency with `pulumi refresh`
- **Component Testing**: Use Jest tests to validate individual components
- **Provider Debugging**: Enable provider-specific logging

## Future Roadmap

### Immediate Next Steps (Phase 3)
1. Implement Proxmox provider authentication and connection
2. Create VM template component with Talos image factory integration
3. Develop network component with VLAN and bridge management
4. Build VM provisioning component with cloud-init configuration

### Medium Term Goals
1. Talos cluster bootstrap automation
2. Kubernetes application deployment via GitOps
3. Comprehensive monitoring and alerting setup
4. Automated backup and disaster recovery procedures

### Long Term Vision
1. Multi-cluster management capabilities
2. Advanced networking with service mesh
3. Edge computing node integration
4. AI/ML workload optimization features

## Critical Success Factors

1. **One-Command Deployment**: Must achieve `pulumi up` simplicity
2. **Reliable Testing**: Comprehensive test coverage prevents regressions
3. **Clear Documentation**: Every component thoroughly documented
4. **Modular Design**: Easy to extend and modify individual components
5. **Production Ready**: HA, monitoring, backups, and security from day one

---

*This context file is maintained as the single source of truth for InfraFlux v2.0 project state and should be updated with each major milestone.*