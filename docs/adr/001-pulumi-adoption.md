# ADR-001: Adopt Pulumi as Unified Infrastructure as Code Platform

## Status

Accepted

## Context

InfraFlux v2.0 requires a comprehensive rebuild to improve maintainability, developer experience,
and operational efficiency. The current architecture uses three separate tools:

- **Ansible**: Configuration management and orchestration
- **Terraform**: Infrastructure provisioning
- **Packer**: VM template creation

This multi-tool approach creates several challenges:

- Context switching between different DSLs (HCL, YAML, Jinja2)
- Complex coordination between tools
- Separate state management systems
- Fragmented testing approaches
- Higher maintenance overhead

## Decision

We will adopt Pulumi with TypeScript as the unified Infrastructure as Code platform, replacing the
Ansible + Terraform + Packer stack.

## Rationale

### Unified Developer Experience

- Single programming language (TypeScript) for all infrastructure code
- Familiar development patterns and tooling
- Native IDE support with IntelliSense and debugging
- Consistent error handling and testing approaches

### Superior Testing Capabilities

- Built-in unit testing with Jest framework
- Property-based testing with fast-check
- Integration testing with Testcontainers
- End-to-end testing with Pulumi Automation API

### Integrated Secret Management

- Pulumi ESC (Environments, Secrets, and Configuration)
- Native Kubernetes secret integration
- Automated secret rotation capabilities
- Environment-based secret organization

### Proven Proxmox Integration

- Mature `@muhlba91/pulumi-proxmoxve` provider
- Comprehensive VM lifecycle management
- Native cloud-init integration
- Active community support and maintenance

### GitOps Compatibility

- Native FluxCD integration via Automation API
- Declarative configuration management
- Automated drift detection and correction
- Strong RBAC and security model

### Multi-Cloud Portability

- Consistent patterns across cloud providers
- Language-native conditionals for platform adaptation
- Reduced vendor lock-in
- Future-proof architecture

### Research Validation

Comprehensive research via MCP tools (context7, octagon-deep-research) confirms:

- Pulumi's performance improvements in recent releases
- Strong community adoption for homelab automation
- Excellent TypeScript ecosystem integration
- Superior developer productivity metrics

## Consequences

### Positive

- **Reduced Complexity**: Single tool vs. three-tool coordination
- **Improved Maintainability**: Type-safe infrastructure code
- **Better Testing**: Native testing framework integration
- **Enhanced Security**: Integrated secret management
- **Developer Productivity**: Familiar programming paradigms
- **Future Flexibility**: Multi-cloud ready architecture

### Negative

- **Learning Curve**: Team needs to learn Pulumi concepts
- **Migration Effort**: Complete rebuild required
- **Provider Maturity**: Some edge cases may require custom solutions
- **Community Size**: Smaller than Terraform ecosystem

### Mitigation Strategies

- Extensive use of MCP research tools for validation
- Comprehensive documentation and examples
- Incremental adoption approach if needed
- Strong testing foundation for reliability
- Active community engagement and contribution

## Implementation Plan

1. **Phase 1**: Foundation setup with TypeScript project structure
2. **Phase 2**: Core infrastructure components development
3. **Phase 3**: Kubernetes and secret management integration
4. **Phase 4**: GitOps and automation framework
5. **Phase 5**: Testing and validation framework
6. **Phase 6**: Documentation and knowledge transfer

## Alternatives Considered

### Continue with Ansible + Terraform + Packer

- **Pros**: Existing knowledge, mature ecosystem
- **Cons**: Complexity overhead, maintenance burden, fragmented testing
- **Verdict**: Rejected due to long-term maintainability concerns

### Hybrid Approach (Pulumi + Ansible)

- **Pros**: Gradual migration, leverage existing Ansible knowledge
- **Cons**: Still maintains tool fragmentation, partial benefits
- **Verdict**: Considered as fallback option

### Other IaC Tools (CDK, Crossplane)

- **Pros**: Alternative unified approaches
- **Cons**: Less mature Proxmox integration, steeper learning curves
- **Verdict**: Rejected due to ecosystem maturity

## Success Metrics

- **Deployment Time**: < 30 minutes for complete infrastructure
- **Test Coverage**: > 80% code coverage
- **Developer Velocity**: Faster iteration cycles
- **Maintenance Overhead**: Reduced operational complexity
- **Reliability**: 99%+ successful deployments

## Review Date

This decision will be reviewed in 6 months or after significant implementation milestones.

## References

- [Pulumi vs Terraform Analysis](../plan/technology-decisions.md)
- [Research Findings](../plan/implementation-roadmap.md)
- [Proxmox Provider Documentation](https://github.com/muhlba91/pulumi-proxmoxve)
- [Pulumi ESC Documentation](https://www.pulumi.com/docs/esc/)
