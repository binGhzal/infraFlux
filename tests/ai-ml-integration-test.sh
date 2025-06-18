#!/bin/bash

# AI/ML Integration Test Script
# Tests Ollama + Open WebUI + Authentik SSO integration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

# Test functions
test_kustomize_builds() {
    log "Testing Kustomize builds for AI/ML stack..."
    
    # Check if individual component files exist
    if [ -f "$PROJECT_ROOT/cluster/base/applications/ai-ml/ollama/ollama.yaml" ]; then
        success "Ollama configuration file exists"
    else
        error "Ollama configuration file not found"
        return 1
    fi
    
    if [ -f "$PROJECT_ROOT/cluster/base/applications/ai-ml/open-webui/open-webui.yaml" ]; then
        success "Open WebUI configuration file exists"
    else
        error "Open WebUI configuration file not found"
        return 1
    fi
    
    # Test full AI/ML stack build
    if kustomize build "$PROJECT_ROOT/cluster/base/applications/ai-ml" --load-restrictor LoadRestrictionsNone > /tmp/ai-ml-build.yaml; then
        success "Full AI/ML stack Kustomize build successful"
        
        # Validate the generated YAML
        if command -v kubeval >/dev/null 2>&1; then
            if kubeval /tmp/ai-ml-build.yaml; then
                success "AI/ML stack Kubernetes validation passed"
            else
                warn "AI/ML stack Kubernetes validation has warnings"
            fi
        else
            warn "kubeval not available, skipping Kubernetes validation"
        fi
    else
        error "Full AI/ML stack Kustomize build failed"
        return 1
    fi
}

test_gpu_infrastructure() {
    log "Testing GPU infrastructure configuration..."
    
    if kustomize build "$PROJECT_ROOT/cluster/base/infrastructure/gpu" --load-restrictor LoadRestrictionsNone > /tmp/gpu-build.yaml; then
        success "GPU infrastructure build successful"
        
        # Check for required GPU components
        local required_components=(
            "nvidia-device-plugin"
            "intel-gpu-plugin"
            "node-feature-discovery"
            "RuntimeClass"
        )
        
        for component in "${required_components[@]}"; do
            if grep -q "$component" /tmp/gpu-build.yaml; then
                success "Found required component: $component"
            else
                error "Missing required component: $component"
                return 1
            fi
        done
        
        # Check for GPU runtime classes
        if grep -q "runtimeClassName: nvidia" "$PROJECT_ROOT/cluster/base/applications/ai-ml/ollama/ollama.yaml"; then
            success "Ollama configured with NVIDIA runtime class"
        else
            warn "Ollama not configured with GPU runtime class"
        fi
        
    else
        error "GPU infrastructure build failed"
        return 1
    fi
}

test_sso_configuration() {
    log "Testing Authentik SSO configuration..."
    
    # Check Open WebUI OAuth configuration
    local webui_config="$PROJECT_ROOT/cluster/base/applications/ai-ml/open-webui/open-webui.yaml"
    
    if [ -f "$webui_config" ]; then
        # Check for required OAuth environment variables
        local required_oauth_vars=(
            "OPENID_PROVIDER_URL"
            "OAUTH_CLIENT_ID"
            "OAUTH_CLIENT_SECRET"
            "OPENID_REDIRECT_URI"
        )
        
        for var in "${required_oauth_vars[@]}"; do
            if grep -q "$var" "$webui_config"; then
                success "Found OAuth configuration: $var"
            else
                error "Missing OAuth configuration: $var"
                return 1
            fi
        done
        
        # Check for proper Authentik URL structure
        if grep -q "auth.local.cluster" "$webui_config"; then
            success "Authentik SSO URL properly configured"
        else
            error "Authentik SSO URL not found"
            return 1
        fi
        
        # Check for OAuth callback configuration
        if grep -q "/oauth/oidc/callback" "$webui_config"; then
            success "OAuth callback URL configured"
        else
            error "OAuth callback URL not configured"
            return 1
        fi
        
    else
        error "Open WebUI configuration file not found"
        return 1
    fi
}

test_storage_configuration() {
    log "Testing AI/ML storage configuration..."
    
    # Check for persistent volumes
    local ai_ml_yaml="$PROJECT_ROOT/cluster/base/applications/ai-ml/ollama/ollama.yaml"
    
    if grep -q "PersistentVolumeClaim" "$ai_ml_yaml"; then
        success "Persistent storage configured for Ollama"
        
        # Check storage size
        if grep -q "100Gi" "$ai_ml_yaml"; then
            success "Appropriate storage size configured (100Gi)"
        else
            warn "Consider increasing storage size for AI models"
        fi
    else
        error "Persistent storage not configured for Ollama"
        return 1
    fi
    
    # Check for Open WebUI storage
    local webui_yaml="$PROJECT_ROOT/cluster/base/applications/ai-ml/open-webui/open-webui.yaml"
    
    if grep -q "PersistentVolumeClaim" "$webui_yaml"; then
        success "Persistent storage configured for Open WebUI"
    else
        error "Persistent storage not configured for Open WebUI"
        return 1
    fi
}

test_networking_configuration() {
    log "Testing AI/ML networking configuration..."
    
    # Check for ingress configuration
    local webui_yaml="$PROJECT_ROOT/cluster/base/applications/ai-ml/open-webui/open-webui.yaml"
    
    if grep -q "kind: Ingress" "$webui_yaml"; then
        success "Ingress configured for Open WebUI"
        
        # Check for proper hostname
        if grep -q "ai.local.cluster" "$webui_yaml"; then
            success "Local domain configured"
        else
            warn "Local domain not configured"
        fi
        
        # Check for TLS configuration
        if grep -q "cert-manager.io/cluster-issuer" "$webui_yaml"; then
            success "TLS certificate automation configured"
        else
            warn "TLS certificate automation not configured"
        fi
    else
        error "Ingress not configured for Open WebUI"
        return 1
    fi
    
    # Check for network policies
    if grep -q "kind: NetworkPolicy" "$webui_yaml"; then
        success "Network policies configured for security"
    else
        warn "Network policies not configured"
    fi
}

test_monitoring_integration() {
    log "Testing monitoring integration..."
    
    # Check for ServiceMonitor resources
    local ai_ml_yaml="$PROJECT_ROOT/cluster/base/applications/ai-ml/ollama/ollama.yaml"
    
    if grep -q "ServiceMonitor" "$ai_ml_yaml"; then
        success "Prometheus monitoring configured for Ollama"
    else
        warn "Prometheus monitoring not configured for Ollama"
    fi
    
    # Check for resource limits
    if grep -q "resources:" "$ai_ml_yaml"; then
        success "Resource limits configured"
        
        # Check for GPU resource requests
        if grep -q "nvidia.com/gpu" "$ai_ml_yaml"; then
            success "GPU resources properly requested"
        else
            warn "GPU resources not requested"
        fi
    else
        error "Resource limits not configured"
        return 1
    fi
}

test_configuration_script() {
    log "Testing application configuration script..."
    
    # Test enabling AI/ML in configuration
    local test_config="/tmp/test-cluster-config.yaml"
    cp "$PROJECT_ROOT/config/cluster-config.yaml" "$test_config"
    
    # Enable AI/ML features
    yq eval '.data.enable_ai_ml = "true"' -i "$test_config"
    yq eval '.data.enable_ollama = "true"' -i "$test_config"
    yq eval '.data.enable_open_webui = "true"' -i "$test_config"
    yq eval '.data.enable_gpu_support = "true"' -i "$test_config"
    
    # Test the configuration script in dry-run mode
    if cd "$PROJECT_ROOT" && CONFIG_FILE="$test_config" ./scripts/configure-apps.sh --dry-run; then
        success "Configuration script test passed"
    else
        error "Configuration script test failed"
        return 1
    fi
    
    # Clean up
    rm -f "$test_config"
}

run_integration_tests() {
    log "Starting AI/ML integration tests..."
    
    local failed_tests=0
    
    # Run all tests
    test_kustomize_builds || ((failed_tests++))
    test_gpu_infrastructure || ((failed_tests++))
    test_sso_configuration || ((failed_tests++))
    test_storage_configuration || ((failed_tests++))
    test_networking_configuration || ((failed_tests++))
    test_monitoring_integration || ((failed_tests++))
    test_configuration_script || ((failed_tests++))
    
    # Report results
    if [ "$failed_tests" -eq 0 ]; then
        success "All AI/ML integration tests passed! ✅"
        log "AI/ML platform is ready for deployment"
        return 0
    else
        error "$failed_tests test(s) failed ❌"
        log "Please address the issues above before deploying AI/ML platform"
        return 1
    fi
}

# Show help
show_help() {
    cat << EOF
AI/ML Integration Test Script

This script validates the AI/ML platform integration including:
- Ollama and Open WebUI Kustomize builds
- GPU infrastructure configuration  
- Authentik SSO integration
- Storage and networking setup
- Monitoring integration

Usage: $0 [OPTIONS]

Options:
  --help, -h          Show this help message
  --verbose, -v       Enable verbose output
  --test NAME         Run specific test only

Available Tests:
  kustomize          Test Kustomize builds
  gpu               Test GPU infrastructure
  sso               Test SSO configuration
  storage           Test storage setup
  networking        Test networking configuration
  monitoring        Test monitoring integration
  config            Test configuration script

Examples:
  $0                        # Run all tests
  $0 --test sso            # Test only SSO configuration
  $0 --verbose             # Run with verbose output

EOF
}

# Parse command line arguments
VERBOSE=false
SPECIFIC_TEST=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Set verbose mode
if [ "$VERBOSE" = true ]; then
    set -x
fi

# Check dependencies
if ! command -v kustomize >/dev/null 2>&1; then
    error "kustomize is required but not installed"
    exit 1
fi

if ! command -v yq >/dev/null 2>&1; then
    error "yq is required but not installed"
    exit 1
fi

# Run specific test or all tests
if [ -n "$SPECIFIC_TEST" ]; then
    case "$SPECIFIC_TEST" in
        kustomize)
            test_kustomize_builds
            ;;
        gpu)
            test_gpu_infrastructure
            ;;
        sso)
            test_sso_configuration
            ;;
        storage)
            test_storage_configuration
            ;;
        networking)
            test_networking_configuration
            ;;
        monitoring)
            test_monitoring_integration
            ;;
        config)
            test_configuration_script
            ;;
        *)
            error "Unknown test: $SPECIFIC_TEST"
            show_help
            exit 1
            ;;
    esac
else
    run_integration_tests
fi