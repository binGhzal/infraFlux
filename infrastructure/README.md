# Infrastructure Directory - Flux GitOps Infrastructure

This directory contains Flux-managed infrastructure components.

## Structure

```
infrastructure/
├── controllers/    # Kubernetes controllers (cert-manager, ingress, etc.)
└── configs/        # Configuration resources (issuers, policies, etc.)
```

## Relationship to cluster/

**Important**: This `infrastructure/` directory is for **Flux-managed** infrastructure.

- **`cluster/base/infrastructure/`**: Contains infrastructure deployed by Ansible (bootstrap phase)
- **`infrastructure/controllers/`**: Contains infrastructure managed by Flux GitOps (continuous delivery phase)

## Controllers vs Configs

- **controllers/**: HelmReleases for operators, controllers, and CRDs
- **configs/**: Custom resources that depend on controllers (ClusterIssuers, NetworkPolicies, etc.)

## Dependency Order

1. Controllers are deployed first (they provide CRDs)
2. Configs are deployed second (they use the CRDs)

This is enforced through Flux Kustomization `dependsOn` fields.