# Clusters Directory - Flux Bootstrap Configuration

This directory contains per-cluster Flux bootstrap configurations.

## Structure

```
clusters/
├── production/     # Production cluster Flux configuration
│   ├── infrastructure.yaml
│   └── apps.yaml
└── staging/        # Staging cluster Flux configuration
    ├── infrastructure.yaml
    └── apps.yaml
```

## Flux Bootstrap Process

1. **Ansible Phase**: Deploys cluster, installs Flux, applies `cluster/base/`
2. **Flux Phase**: Flux reads `clusters/*/` and manages `infrastructure/` and `apps/`

## File Purposes

- **infrastructure.yaml**: Flux Kustomization for infrastructure components
- **apps.yaml**: Flux Kustomization for applications

## Environment Differences

- **Production**: Stable versions, strict security, full features
- **Staging**: Latest versions, relaxed security, testing features

## Relationship to cluster/overlays/

- **`cluster/overlays/`**: Ansible-deployed environment configurations (bootstrap)
- **`clusters/`**: Flux-managed environment configurations (continuous delivery)