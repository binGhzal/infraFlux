# Apps Directory - Flux GitOps Applications

This directory contains Flux-managed applications using HelmReleases and Kustomize overlays.

## Structure

```
apps/
├── base/           # Base application definitions (HelmReleases)
├── production/     # Production-specific values and patches
└── staging/        # Staging-specific values and patches
```

## Relationship to cluster/

**Important**: This `apps/` directory is for **NEW** Flux-managed applications.

- **`cluster/base/`**: Contains existing applications deployed by Ansible (bootstrap phase)
- **`apps/base/`**: Contains new applications managed by Flux GitOps (continuous delivery phase)

## Migration Strategy

Applications will be gradually migrated from `cluster/base/` to `apps/base/` as they are converted to HelmReleases and Flux management.

## Usage

1. Add new applications to `apps/base/` as HelmReleases
2. Create environment-specific patches in `apps/production/` and `apps/staging/`
3. Reference from `clusters/*/apps.yaml` Flux Kustomizations