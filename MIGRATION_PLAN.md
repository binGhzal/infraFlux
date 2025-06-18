# InfraFlux Migration Plan: Ansible → Flux GitOps

## Executive Summary

This plan outlines the migration from Ansible-managed applications to Flux GitOps management while preserving the mature 245+ resource infrastructure.

## Current State Analysis

### Ansible-Managed (cluster/base/)
- **245+ Kubernetes resources** across 7 namespaces
- **Complete application stack**: Nextcloud, Vaultwarden, Gitea, etc.
- **Enterprise security**: Authentik SSO, Sealed Secrets, cert-manager
- **Full monitoring**: Prometheus, Grafana, Loki with dashboards
- **Production-ready**: 90% complete, sophisticated configurations

### Risk Assessment
- **HIGH RISK**: Mass migration could break working production system
- **LOW VALUE**: Current setup already provides GitOps benefits via Kustomize
- **HIGH EFFORT**: Converting 245+ resources to HelmReleases

## Migration Strategy: **GRADUAL & ADDITIVE**

### Phase 1: Flux Foundation ✅ COMPLETE
- [x] Add Flux GitOps structure alongside existing cluster/
- [x] Create apps/, infrastructure/, clusters/ directories
- [x] Establish HelmRelease patterns
- [x] Create environment overlays (staging/production)

### Phase 2: New Applications → Flux (CURRENT)
```
Priority: HIGH | Risk: LOW | Impact: HIGH
```

**Approach**: All NEW applications go directly to `apps/` as HelmReleases
- ✅ Avoid disrupting existing applications
- ✅ Gain Flux benefits immediately for new deployments
- ✅ Build confidence with Flux workflows

**Applications to Add as HelmReleases:**
1. **Immich** (Photo management) - NEW
2. **Homer** (Dashboard alternative) - NEW  
3. **Portainer** (Container management) - NEW
4. **Prowlarr** (Indexer management) - NEW
5. **Wiki.js** (Documentation) - NEW

### Phase 3: Infrastructure Enhancement (PARALLEL)
```
Priority: MEDIUM | Risk: LOW | Impact: MEDIUM
```

**Approach**: Add Flux capabilities without replacing existing infrastructure
- Image automation for container updates
- Notification providers for deployment status
- Health checks and monitoring integration

### Phase 4: Selective Migration (FUTURE)
```
Priority: LOW | Risk: MEDIUM | Impact: MEDIUM
```

**Candidates for Migration** (Only if clear benefit):
1. **Simple applications** with upstream Helm charts
2. **Applications requiring frequent updates**
3. **New application versions** that benefit from Helm

**NEVER MIGRATE**:
- Complex custom applications (Authentik setup)
- Working monitoring stack
- Security infrastructure
- Applications without clear Helm chart benefits

## Migration Decision Matrix

| Application | Complexity | Helm Chart Available | Update Frequency | Migration Priority |
|-------------|------------|---------------------|------------------|-------------------|
| Nextcloud | Medium | ✅ Official | Medium | 🟡 MAYBE |
| Vaultwarden | Low | ✅ Community | Low | 🟡 MAYBE |
| Gitea | Medium | ✅ Official | Medium | 🟡 MAYBE |
| Authentik | HIGH | ✅ Complex | Low | 🔴 NO |
| Monitoring | HIGH | ✅ Complex | Low | 🔴 NO |
| AI/ML Stack | HIGH | ❌ Custom | High | 🔴 NO |

## Implementation Guidelines

### When to Migrate ✅
- Application has official Helm chart
- Current setup is simple Kubernetes manifests
- Frequent updates needed
- Clear benefit from Helm templating

### When NOT to Migrate ❌
- Application works perfectly as-is
- Complex custom configuration
- No official Helm chart
- High risk, low reward

### Migration Process
1. **Create HelmRelease** in `apps/base/`
2. **Test in staging** environment
3. **Validate functionality** matches current setup
4. **Deploy to production** 
5. **Remove from cluster/base/** only after confirmed working
6. **Update Ansible playbooks** to skip migrated apps

## Success Metrics

### Short-term (Phase 2)
- [ ] 5 new applications deployed via Flux
- [ ] Zero disruption to existing applications
- [ ] Staging/production environment separation working

### Medium-term (Phase 3)
- [ ] Image automation operational
- [ ] Notification providers configured
- [ ] Health monitoring integrated

### Long-term (Phase 4)
- [ ] 2-3 existing applications successfully migrated
- [ ] Clear migration patterns established
- [ ] Team comfortable with hybrid approach

## Conclusion

The hybrid approach prioritizes **stability** and **gradual adoption** over full migration. This ensures the mature 90% complete system remains operational while gaining GitOps benefits for new workloads.