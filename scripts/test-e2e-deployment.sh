#!/bin/bash
# InfraFlux v2.0 - End-to-End Deployment Validation
# Comprehensive testing framework for complete deployment pipeline

set -euo pipefail

# Script metadata
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly E2E_TEST_DIR="${PROJECT_ROOT}/tests/e2e"
readonly CONFIG_FILE="${1:-config/cluster-config.yaml}"
readonly TEST_MODE="${2:-validate}"  # validate, dry-run, full-deploy
readonly TEST_ID="e2e-$(date +%Y%m%d-%H%M%S)"
readonly TEST_WORK_DIR="/tmp/infraflux-e2e-${TEST_ID}"
readonly TEST_LOG="${TEST_WORK_DIR}/e2e-test.log"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly CYAN='\033[0;36m'
readonly NC='\033[0m'
readonly BOLD='\033[1m'

# Test state tracking
declare -i TOTAL_TESTS=0
declare -i PASSED_TESTS=0
declare -i FAILED_TESTS=0
declare -i WARNING_TESTS=0
declare -a TEST_FAILURES=()
declare -a TEST_WARNINGS=()
declare -i START_TIME
declare -i TEST_START_TIME

# Logging functions
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}] INFO${NC} $1" | tee -a "${TEST_LOG}"
}

success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] PASS${NC} ✅ $1" | tee -a "${TEST_LOG}"
    ((PASSED_TESTS++))
}

warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] WARN${NC} ⚠️  $1" | tee -a "${TEST_LOG}"
    TEST_WARNINGS+=("$1")
    ((WARNING_TESTS++))
}

error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] FAIL${NC} ❌ $1" | tee -a "${TEST_LOG}"
    TEST_FAILURES+=("$1")
    ((FAILED_TESTS++))
}

test_case() {
    local description="$1"
    local command="$2"
    local optional="${3:-false}"
    
    ((TOTAL_TESTS++))
    TEST_START_TIME=$(date +%s)
    log "Testing: $description"
    
    if eval "$command" >> "${TEST_LOG}" 2>&1; then
        local duration=$(($(date +%s) - TEST_START_TIME))
        success "$description (${duration}s)"
        return 0
    else
        local duration=$(($(date +%s) - TEST_START_TIME))
        if [[ "$optional" == "true" ]]; then
            warning "$description (${duration}s) - Optional test failed"
            return 0
        else
            error "$description (${duration}s)"
            return 1
        fi
    fi
}

# Banner
show_banner() {
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}InfraFlux v2.0 - End-to-End Deployment Validation${NC}"
    echo -e "${PURPLE}Comprehensive testing of complete deployment pipeline${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${CYAN}Test Mode: ${BOLD}${TEST_MODE}${NC}"
    echo -e "${CYAN}Config File: ${BOLD}${CONFIG_FILE}${NC}"
    echo -e "${CYAN}Test ID: ${BOLD}${TEST_ID}${NC}"
    echo -e "${CYAN}Work Directory: ${BOLD}${TEST_WORK_DIR}${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo
}

# Initialize test environment
init_test_environment() {
    # Create work directories first
    mkdir -p "${TEST_WORK_DIR}"
    mkdir -p "${E2E_TEST_DIR}/reports"
    
    # Initialize log file
    echo "InfraFlux v2.0 E2E Test Log - ${TEST_ID}" > "${TEST_LOG}"
    echo "Started: $(date)" >> "${TEST_LOG}"
    echo "Mode: ${TEST_MODE}" >> "${TEST_LOG}"
    echo "Config: ${CONFIG_FILE}" >> "${TEST_LOG}"
    echo "========================================" >> "${TEST_LOG}"
    
    log "🔧 Initializing test environment..."
    success "Test environment initialized"
}

# Test Phase 1: Prerequisites and Configuration
test_prerequisites() {
    log "📋 Phase 1: Testing Prerequisites and Configuration..."
    
    # Tool availability
    local tools=("python3" "yq" "terraform" "kubectl" "git" "curl")
    for tool in "${tools[@]}"; do
        test_case "Tool availability: $tool" "command -v $tool"
    done
    
    # Optional tools
    test_case "Tool availability: talosctl" "command -v talosctl" "true"
    test_case "Tool availability: flux" "command -v flux" "true"
    
    # Python dependencies
    test_case "Python YAML module" "python3 -c 'import yaml'"
    test_case "Python Jinja2 module" "python3 -c 'import jinja2'"
    test_case "Python ipaddress module" "python3 -c 'import ipaddress'"
    
    # Configuration file validation
    test_case "Configuration file exists" "test -f '${CONFIG_FILE}'"
    test_case "Configuration YAML syntax" "yq eval '.' '${CONFIG_FILE}' >/dev/null"
    
    # Configuration content validation
    test_case "Required config: cluster_name" "yq eval '.data.cluster_name' '${CONFIG_FILE}' | grep -v null"
    test_case "Required config: talos_version" "yq eval '.data.talos_version' '${CONFIG_FILE}' | grep -v null"
    test_case "Required config: kubernetes_version" "yq eval '.data.kubernetes_version' '${CONFIG_FILE}' | grep -v null"
    test_case "Required config: control_plane_ips" "yq eval '.data.control_plane_ips' '${CONFIG_FILE}' | grep -v null"
    test_case "Required config: worker_ips" "yq eval '.data.worker_ips' '${CONFIG_FILE}' | grep -v null"
    
    echo
}

# Test Phase 2: Template Generation and Validation
test_template_generation() {
    log "🔧 Phase 2: Testing Template Generation and Validation..."
    
    # Configuration generator validation
    test_case "Configuration generator syntax" "python3 -m py_compile scripts/generate-configs.py"
    test_case "Configuration validation" "python3 scripts/generate-configs.py --config '${CONFIG_FILE}' --validate-only"
    
    # Template generation test
    local temp_output="${TEST_WORK_DIR}/generated-configs"
    test_case "Template generation" "python3 scripts/generate-configs.py --config '${CONFIG_FILE}' --output '${temp_output}'"
    
    if [[ -d "${temp_output}" ]]; then
        # Validate generated Terraform configs
        test_case "Generated Terraform syntax" "cd '${temp_output}/terraform' && terraform validate"
        test_case "Generated Terraform formatting" "cd '${temp_output}/terraform' && terraform fmt -check"
        
        # Validate generated Talos configs (if talosctl available)
        if command -v talosctl >/dev/null 2>&1; then
            for config_file in "${temp_output}/talos"/*.yaml; do
                if [[ -f "$config_file" && "$config_file" != *"talosconfig"* && "$config_file" != *"secrets.yaml"* ]]; then
                    local config_name=$(basename "$config_file")
                    test_case "Talos config syntax: $config_name" "talosctl validate --config '$config_file'" "true"
                fi
            done
        else
            warning "talosctl not available - skipping Talos config validation"
        fi
    else
        error "Template generation failed - no output directory created"
    fi
    
    echo
}

# Test Phase 3: GitOps Structure Validation
test_gitops_structure() {
    log "🔄 Phase 3: Testing GitOps Structure and Manifests..."
    
    # Directory structure validation
    local directories=(
        "clusters/production"
        "clusters/staging" 
        "clusters/development"
        "infrastructure/controllers"
        "infrastructure/configs"
        "infrastructure/sources"
        "apps/base"
        "apps/overlays/production"
        "apps/overlays/staging"
        "apps/overlays/development"
    )
    
    for dir in "${directories[@]}"; do
        test_case "GitOps directory: $dir" "test -d '$dir'"
    done
    
    # Kustomization file validation
    local kustomizations=(
        "infrastructure/kustomization.yaml"
        "apps/base/kustomization.yaml"
        "clusters/production/infrastructure.yaml"
        "clusters/production/apps.yaml"
    )
    
    for kustomization in "${kustomizations[@]}"; do
        if [[ -f "$kustomization" ]]; then
            test_case "Kustomization exists: $(basename \"$kustomization\")" "test -f '$kustomization'"
            test_case "Kustomization syntax: $(basename \"$kustomization\")" "yq eval '.' '$kustomization' >/dev/null"
        else
            warning "Kustomization file not found: $kustomization"
        fi
    done
    
    # Application manifest validation
    test_case "Monitoring namespace manifest" "test -f 'apps/base/monitoring/namespace.yaml'"
    test_case "Security namespace manifest" "test -f 'apps/base/security/namespace.yaml'"
    
    # Helm release validation
    local helm_releases=(
        "apps/base/monitoring/prometheus/release.yaml"
        "apps/base/monitoring/grafana/kustomization.yaml"
        "infrastructure/controllers/cilium/release.yaml"
        "infrastructure/controllers/cert-manager/release.yaml"
    )
    
    for release in "${helm_releases[@]}"; do
        if [[ -f "$release" ]]; then
            test_case "Application manifest: $(basename \"$release\")" "yq eval '.' '$release' >/dev/null"
        else
            test_case "Application manifest exists: $(basename \"$release\")" "test -f '$release'" "true"
        fi
    done
    
    echo
}

# Test Phase 4: Script and Automation Validation
test_automation_scripts() {
    log "🤖 Phase 4: Testing Automation Scripts and Tools..."
    
    # Main deployment script validation
    test_case "Main deploy script exists" "test -f 'deploy.sh'"
    test_case "Deploy script is executable" "test -x 'deploy.sh'"
    test_case "Deploy script syntax" "bash -n deploy.sh"
    
    # Additional scripts validation
    local scripts=(
        "scripts/bootstrap-flux.sh"
        "scripts/validate-config.sh"
        "scripts/run-all-tests.sh"
        "scripts/test-deployment.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$script" ]]; then
            test_case "Script exists: $(basename \"$script\")" "test -f '$script'"
            test_case "Script executable: $(basename \"$script\")" "test -x '$script'"
            test_case "Script syntax: $(basename \"$script\")" "bash -n '$script'"
        else
            test_case "Script exists: $(basename \"$script\")" "test -f '$script'" "true"
        fi
    done
    
    # Configuration validation script test
    if [[ -f "scripts/validate-config.sh" ]]; then
        test_case "Configuration validation script" "'scripts/validate-config.sh' '${CONFIG_FILE}'" "true"
    fi
    
    echo
}

# Test Phase 5: Deployment Process Simulation
test_deployment_simulation() {
    log "🚀 Phase 5: Testing Deployment Process Simulation..."
    
    case "$TEST_MODE" in
        "validate")
            log "Skipping deployment simulation in validate mode"
            ;;
        "dry-run")
            log "Running deployment dry-run simulation..."
            
            # Test Terraform dry-run
            if [[ -d "${TEST_WORK_DIR}/generated-configs/terraform" ]]; then
                test_case "Terraform plan (dry-run)" "cd '${TEST_WORK_DIR}/generated-configs/terraform' && terraform init && terraform plan -var 'proxmox_password=dummy'" "true"
            fi
            
            # Test kubectl dry-run for manifests
            test_case "Kubernetes manifests dry-run" "kubectl apply --dry-run=client -k infrastructure/" "true"
            test_case "Application manifests dry-run" "kubectl apply --dry-run=client -k apps/base/" "true"
            ;;
        "full-deploy")
            warning "Full deployment mode not implemented in this test version"
            warning "This would require actual Proxmox infrastructure"
            ;;
    esac
    
    echo
}

# Test Phase 6: Security and Performance Validation
test_security_performance() {
    log "🔒 Phase 6: Testing Security and Performance Features..."
    
    # Security configuration validation
    test_case "Production security enabled" "yq eval '.data.production.enable_audit_logging' '${CONFIG_FILE}' | grep true"
    test_case "Kernel hardening enabled" "yq eval '.data.production.enable_kernel_hardening' '${CONFIG_FILE}' | grep true"
    test_case "Pod security policies enabled" "yq eval '.data.production.enable_pod_security_policies' '${CONFIG_FILE}' | grep true"
    
    # Performance configuration validation  
    test_case "CPU manager enabled" "yq eval '.data.production.enable_cpu_manager' '${CONFIG_FILE}' | grep true"
    test_case "BBR congestion control enabled" "yq eval '.data.production.enable_bbr_congestion_control' '${CONFIG_FILE}' | grep true"
    test_case "Kernel optimization enabled" "yq eval '.data.production.optimize_kernel_parameters' '${CONFIG_FILE}' | grep true"
    
    # Monitoring configuration validation
    test_case "Metrics server enabled" "yq eval '.data.production.enable_metrics_server' '${CONFIG_FILE}' | grep true"
    test_case "Enhanced logging enabled" "yq eval '.data.production.enable_enhanced_logging' '${CONFIG_FILE}' | grep true"
    
    # Resource management validation
    test_case "Resource quotas enabled" "yq eval '.data.production.enable_resource_quotas' '${CONFIG_FILE}' | grep true"
    test_case "System reserved CPU configured" "yq eval '.data.production.system_reserved_cpu' '${CONFIG_FILE}' | grep -v null"
    test_case "System reserved memory configured" "yq eval '.data.production.system_reserved_memory' '${CONFIG_FILE}' | grep -v null"
    
    echo
}

# Test Phase 7: Documentation and Completeness
test_documentation() {
    log "📚 Phase 7: Testing Documentation and Completeness..."
    
    # Core documentation files
    local docs=(
        "README.md"
        "CLAUDE.md"
        "docs/ARCHITECTURE.md"
        "docs/plan/INFRAFLUX_V2_COMPLETION_STATUS.md"
        "docs/plan/TALOS_ARCHITECTURE.md"
        "docs/plan/GITOPS_WORKFLOW.md"
        "docs/plan/DEPLOYMENT_SYSTEM.md"
        "docs/plan/CONFIGURATION_MANAGEMENT.md"
        "docs/plan/SECURITY_FRAMEWORK.md"
    )
    
    for doc in "${docs[@]}"; do
        test_case "Documentation exists: $(basename \"$doc\")" "test -f '$doc'"
        if [[ -f "$doc" ]]; then
            test_case "Documentation not empty: $(basename \"$doc\")" "test -s '$doc'"
        fi
    done
    
    # Template files validation
    test_case "Talos control plane template" "test -f 'templates/talos/controlplane.yaml.j2'"
    test_case "Talos worker template" "test -f 'templates/talos/worker.yaml.j2'"
    test_case "Terraform main template" "test -f 'templates/terraform/main.tf.j2'"
    
    echo
}

# Generate test report
generate_test_report() {
    local duration=$(($(date +%s) - START_TIME))
    local report_file="${E2E_TEST_DIR}/reports/e2e-report-${TEST_ID}.json"
    
    log "📊 Generating test report..."
    
    # Create JSON report
    cat > "${report_file}" << EOF
{
  "test_id": "${TEST_ID}",
  "timestamp": "$(date -Iseconds)",
  "duration_seconds": ${duration},
  "test_mode": "${TEST_MODE}",
  "config_file": "${CONFIG_FILE}",
  "summary": {
    "total_tests": ${TOTAL_TESTS},
    "passed_tests": ${PASSED_TESTS},
    "failed_tests": ${FAILED_TESTS},
    "warning_tests": ${WARNING_TESTS},
    "success_rate": "$(echo "scale=2; ${PASSED_TESTS} * 100 / ${TOTAL_TESTS}" | bc)%"
  },
  "failures": $(printf '%s\n' "${TEST_FAILURES[@]}" | jq -R . | jq -s .),
  "warnings": $(printf '%s\n' "${TEST_WARNINGS[@]}" | jq -R . | jq -s .),
  "log_file": "${TEST_LOG}"
}
EOF
    
    success "Test report generated: ${report_file}"
    
    # Display summary
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}Test Summary${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${CYAN}Test ID:${NC} ${TEST_ID}"
    echo -e "${CYAN}Duration:${NC} ${duration} seconds"
    echo -e "${CYAN}Total Tests:${NC} ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed:${NC} ${PASSED_TESTS}"
    echo -e "${RED}Failed:${NC} ${FAILED_TESTS}"
    echo -e "${YELLOW}Warnings:${NC} ${WARNING_TESTS}"
    
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        echo
        echo -e "${RED}Failed Tests:${NC}"
        for failure in "${TEST_FAILURES[@]}"; do
            echo -e "  ❌ $failure"
        done
    fi
    
    if [[ ${WARNING_TESTS} -gt 0 ]]; then
        echo
        echo -e "${YELLOW}Warnings:${NC}"
        for warning in "${TEST_WARNINGS[@]}"; do
            echo -e "  ⚠️  $warning"
        done
    fi
    
    echo -e "${PURPLE}================================================================${NC}"
    
    # Return appropriate exit code
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        error "E2E tests failed - see report for details"
        return 1
    else
        success "All E2E tests passed! 🎉"
        return 0
    fi
}

# Main execution
main() {
    START_TIME=$(date +%s)
    
    show_banner
    init_test_environment
    
    test_prerequisites
    test_template_generation
    test_gitops_structure
    test_automation_scripts
    test_deployment_simulation
    test_security_performance
    test_documentation
    
    generate_test_report
}

# Help function
show_help() {
    echo "InfraFlux v2.0 End-to-End Deployment Validation"
    echo
    echo "Usage: $0 [CONFIG_FILE] [TEST_MODE]"
    echo
    echo "Arguments:"
    echo "  CONFIG_FILE    Path to cluster configuration (default: config/cluster-config.yaml)"
    echo "  TEST_MODE      Test mode: validate, dry-run, full-deploy (default: validate)"
    echo
    echo "Test Modes:"
    echo "  validate       Validation-only testing (no deployment simulation)"
    echo "  dry-run        Include deployment dry-run simulation"
    echo "  full-deploy    Full deployment testing (requires infrastructure)"
    echo
    echo "Examples:"
    echo "  $0                                    # Basic validation"
    echo "  $0 config/cluster-config.yaml        # Validate specific config"
    echo "  $0 config/cluster-config.yaml dry-run # Include dry-run testing"
    echo
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
        show_help
        exit 0
    fi
    
    main "$@"
fi