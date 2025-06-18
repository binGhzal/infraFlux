#!/bin/bash
# InfraFlux GitOps Structure Validation Script
# Validates the hybrid Ansible+Flux architecture

set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[VALIDATE]${NC} $*"
}

success() {
    echo -e "${GREEN}✅${NC} $*"
}

warn() {
    echo -e "${YELLOW}⚠️${NC} $*"
}

error() {
    echo -e "${RED}❌${NC} $*"
}

# Track validation results
PASSED=0
FAILED=0

check() {
    local description="$1"
    local command="$2"
    
    log "Checking: $description"
    
    if eval "$command" >/dev/null 2>&1; then
        success "$description"
        ((PASSED++))
    else
        error "$description"
        ((FAILED++))
    fi
}

main() {
    log "🔍 Validating InfraFlux GitOps Structure..."
    echo
    
    # Repository Structure Validation
    log "📂 Repository Structure:"
    check "Ansible infrastructure preserved" "[ -d playbooks ] && [ -f deploy.sh ] && [ -f ansible.cfg ]"
    check "Flux apps structure exists" "[ -d apps/base ] && [ -d apps/staging ] && [ -d apps/production ]"
    check "Infrastructure structure exists" "[ -d infrastructure/controllers ] && [ -d infrastructure/configs ]"
    check "Clusters configuration exists" "[ -d clusters/staging ] && [ -d clusters/production ]"
    check "Environments configuration exists" "[ -d environments/staging ] && [ -d environments/production ]"
    echo
    
    # Kustomize Build Validation
    log "🔧 Kustomize Build Tests:"
    check "Apps base builds successfully" "kustomize build apps/base"
    check "Apps staging builds successfully" "kustomize build apps/staging" 
    check "Apps production builds successfully" "kustomize build apps/production"
    check "Infrastructure controllers builds" "kustomize build infrastructure/controllers"
    check "Infrastructure configs builds" "kustomize build infrastructure/configs"
    echo
    
    # GitOps Configuration Validation
    log "⚙️ GitOps Configuration:"
    check "Flux Kustomizations defined" "[ -f clusters/staging/apps.yaml ] && [ -f clusters/production/apps.yaml ]"
    check "Image automation configured" "[ -f infrastructure/configs/image-policies/image-update-automation.yaml ]"
    check "Notification providers configured" "[ -f infrastructure/configs/notifications/providers.yaml ]"
    check "Bootstrap script exists" "[ -x scripts/bootstrap-flux.sh ]"
    echo
    
    # Secret Templates Validation
    log "🔒 Secret Management:"
    check "Secrets directory organized" "[ -d secrets/templates ] && [ -d secrets/examples ]"
    check "Gitignore configured" "[ -f secrets/.gitignore ]"
    check "Secret templates exist" "[ -f secrets/templates/flux-notifications-template.yaml ]"
    echo
    
    # Documentation Validation
    log "📚 Documentation:"
    check "Hybrid architecture documented" "[ -f HYBRID_ARCHITECTURE.md ]"
    check "Migration plan exists" "[ -f MIGRATION_PLAN.md ]"
    check "Phase 0 summary exists" "[ -f PHASE_0_COMPLETION_SUMMARY.md ]"
    check "README files in key directories" "[ -f apps/README.md ] && [ -f infrastructure/README.md ] && [ -f clusters/README.md ]"
    echo
    
    # Compatibility Validation
    log "🔄 Compatibility:"
    check "Original cluster structure preserved" "[ -d cluster/base ] && [ -f cluster/base/kustomization.yaml ]"
    check "Ansible playbooks preserved" "[ -f playbooks/infrastructure.yml ] && [ -f playbooks/applications.yml ]"
    check "Configuration files preserved" "[ -f config/cluster-config.yaml ]"
    echo
    
    # Results Summary
    echo "=================================================="
    log "📊 Validation Results Summary:"
    success "Passed: $PASSED checks"
    
    if [ $FAILED -gt 0 ]; then
        error "Failed: $FAILED checks"
        echo
        error "🚨 GitOps structure validation FAILED"
        error "Please review failed checks above"
        exit 1
    else
        echo
        success "🎉 GitOps structure validation PASSED"
        success "✅ InfraFlux hybrid Ansible+Flux architecture is ready!"
        echo
        log "🚀 Next steps:"
        log "1. Configure secrets using templates in secrets/examples/"
        log "2. Run ./deploy.sh to deploy infrastructure"
        log "3. Run ./scripts/bootstrap-flux.sh to activate GitOps"
        log "4. Add new applications to apps/base/ as HelmReleases"
    fi
}

main "$@"