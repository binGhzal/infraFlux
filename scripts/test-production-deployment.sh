#!/bin/bash
# InfraFlux v2.0 - Production Deployment Test Script
# Comprehensive testing with real credentials and automated validation

set -euo pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
CONFIG_FILE="${1:-config/test-cluster-config.yaml}"
TEST_MODE="${2:-dry-run}"  # dry-run, validate-only, full-deploy
TEST_OUTPUT="${PROJECT_ROOT}/_out/production-test"
LOG_FILE="${TEST_OUTPUT}/production-test.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Test state tracking
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()
declare -a WARNINGS=()
declare -i START_TIME
START_TIME=$(date +%s)

# Logging functions
log() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${BLUE}[${timestamp}]${NC} $1" | tee -a "${LOG_FILE}"
}

success() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[${timestamp}] ✅${NC} $1" | tee -a "${LOG_FILE}"
    PASSED_TESTS+=("$1")
}

warning() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[${timestamp}] ⚠️${NC} $1" | tee -a "${LOG_FILE}"
    WARNINGS+=("$1")
}

error() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[${timestamp}] ❌${NC} $1" | tee -a "${LOG_FILE}"
    FAILED_TESTS+=("$1")
}

# Banner
show_banner() {
    echo -e "${PURPLE}"
    cat << 'EOF'
🧪 InfraFlux v2.0 Production Deployment Test Suite
=================================================
EOF
    echo -e "${NC}"
    echo "Configuration: ${CONFIG_FILE}"
    echo "Test Mode: ${TEST_MODE}"
    echo "Output Directory: ${TEST_OUTPUT}"
    echo "================================================="
    echo
}

# Setup test environment
setup_test_environment() {
    log "Setting up test environment..."
    
    # Create test output directory
    mkdir -p "${TEST_OUTPUT}/logs"
    mkdir -p "${TEST_OUTPUT}/configs"
    mkdir -p "${TEST_OUTPUT}/reports"
    
    # Load secrets
    if ! "${SCRIPT_DIR}/load-secrets.sh" load; then
        error "Failed to load secrets"
        return 1
    fi
    
    # Validate configuration file exists
    if [[ ! -f "${PROJECT_ROOT}/${CONFIG_FILE}" ]]; then
        error "Configuration file not found: ${CONFIG_FILE}"
        return 1
    fi
    
    success "Test environment setup completed"
}

# Test prerequisites
test_prerequisites() {
    log "Testing prerequisites..."
    
    local missing_tools=()
    local tools=("python3" "yq" "talosctl" "kubectl" "terraform")
    
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        else
            success "Tool available: $tool ($(command -v "$tool"))"
        fi
    done
    
    if [[ ${#missing_tools[@]} -ne 0 ]]; then
        error "Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    # Test Python dependencies
    if python3 -c "import yaml, jinja2" &>/dev/null; then
        success "Python dependencies available"
    else
        error "Missing Python dependencies (PyYAML, Jinja2)"
        return 1
    fi
    
    success "All prerequisites satisfied"
}

# Test configuration validation
test_configuration() {
    log "Testing configuration validation..."
    
    local config_path="${PROJECT_ROOT}/${CONFIG_FILE}"
    
    # YAML syntax test
    if yq eval '.' "${config_path}" > /dev/null 2>&1; then
        success "Configuration YAML syntax valid"
    else
        error "Configuration YAML syntax invalid"
        return 1
    fi
    
    # Extract key configuration values for validation
    local cluster_name=$(yq eval '.data.cluster_name' "${config_path}")
    local proxmox_host=$(yq eval '.data.proxmox_host' "${config_path}")
    local control_plane_count=$(yq eval '.data.control_plane_ips | length' "${config_path}")
    local worker_count=$(yq eval '.data.worker_ips | length' "${config_path}")
    
    log "Configuration Details:"
    echo "  Cluster Name: ${cluster_name}"
    echo "  Proxmox Host: ${proxmox_host}"
    echo "  Control Planes: ${control_plane_count}"
    echo "  Workers: ${worker_count}"
    
    # Validate configuration values
    if [[ "${cluster_name}" != "null" ]] && [[ -n "${cluster_name}" ]]; then
        success "Cluster name configured: ${cluster_name}"
    else
        error "Cluster name not configured"
        return 1
    fi
    
    if [[ "${proxmox_host}" != "null" ]] && [[ "${proxmox_host}" != "proxmox.test.local" ]]; then
        success "Proxmox host configured: ${proxmox_host}"
    else
        warning "Proxmox host using placeholder value"
    fi
    
    success "Configuration validation completed"
}

# Test configuration generation
test_config_generation() {
    log "Testing configuration generation..."
    
    local output_dir="${TEST_OUTPUT}/configs"
    
    # Test validation-only mode first
    if python3 scripts/generate-configs.py --config "${CONFIG_FILE}" --output "${output_dir}" --validate-only; then
        success "Configuration validation passed"
    else
        error "Configuration validation failed"
        return 1
    fi
    
    # Generate actual configurations
    if python3 scripts/generate-configs.py --config "${CONFIG_FILE}" --output "${output_dir}"; then
        success "Configuration generation completed"
    else
        error "Configuration generation failed"
        return 1
    fi
    
    # Verify generated files
    local expected_files=(
        "${output_dir}/talos/controlplane-0.yaml"
        "${output_dir}/talos/worker-0.yaml"
        "${output_dir}/talos/talosconfig"
        "${output_dir}/talos/secrets.yaml"
        "${output_dir}/terraform/main.tf"
    )
    
    for file in "${expected_files[@]}"; do
        if [[ -f "${file}" ]]; then
            success "Generated file exists: $(basename "${file}")"
        else
            error "Missing generated file: $(basename "${file}")"
            return 1
        fi
    done
    
    # Test file contents
    if yq eval '.machine.type' "${output_dir}/talos/controlplane-0.yaml" | grep -q "controlplane"; then
        success "Talos control plane configuration valid"
    else
        error "Talos control plane configuration invalid"
        return 1
    fi
    
    if yq eval '.machine.type' "${output_dir}/talos/worker-0.yaml" | grep -q "worker"; then
        success "Talos worker configuration valid"
    else
        error "Talos worker configuration invalid"
        return 1
    fi
    
    success "Configuration generation test completed"
}

# Test Terraform configuration
test_terraform() {
    log "Testing Terraform configuration..."
    
    local terraform_dir="${TEST_OUTPUT}/configs/terraform"
    
    if [[ ! -d "${terraform_dir}" ]]; then
        error "Terraform directory not found: ${terraform_dir}"
        return 1
    fi
    
    cd "${terraform_dir}"
    
    # Initialize Terraform
    log "Initializing Terraform..."
    if terraform init > "${TEST_OUTPUT}/logs/terraform-init.log" 2>&1; then
        success "Terraform initialization successful"
    else
        error "Terraform initialization failed"
        cat "${TEST_OUTPUT}/logs/terraform-init.log"
        return 1
    fi
    
    # Validate Terraform configuration
    log "Validating Terraform configuration..."
    if terraform validate > "${TEST_OUTPUT}/logs/terraform-validate.log" 2>&1; then
        success "Terraform configuration valid"
    else
        error "Terraform configuration invalid"
        cat "${TEST_OUTPUT}/logs/terraform-validate.log"
        return 1
    fi
    
    # Test Terraform plan (if password available)
    if [[ -n "${PROXMOX_PASSWORD:-}" ]] && [[ "${TEST_MODE}" == "full-deploy" ]]; then
        log "Creating Terraform plan..."
        if terraform plan -var="proxmox_password=${PROXMOX_PASSWORD}" -var="proxmox_tls_insecure=true" -out="${TEST_OUTPUT}/terraform.plan" > "${TEST_OUTPUT}/logs/terraform-plan.log" 2>&1; then
            success "Terraform plan created successfully"
        else
            warning "Terraform plan failed (may be expected without valid Proxmox access)"
            # Don't fail the test for plan issues in testing
        fi
    else
        log "Skipping Terraform plan (no password or not in full-deploy mode)"
    fi
    
    cd "${PROJECT_ROOT}"
    success "Terraform configuration test completed"
}

# Test Proxmox connectivity
test_proxmox_connectivity() {
    log "Testing Proxmox connectivity..."
    
    local proxmox_host=$(yq eval '.data.proxmox_host' "${PROJECT_ROOT}/${CONFIG_FILE}")
    
    if [[ "${proxmox_host}" == "null" ]] || [[ "${proxmox_host}" == "proxmox.test.local" ]]; then
        warning "Proxmox host not configured for real testing"
        return 0
    fi
    
    # Test network connectivity
    if ping -c 1 -W 5 "${proxmox_host}" > /dev/null 2>&1; then
        success "Proxmox host reachable: ${proxmox_host}"
    else
        warning "Proxmox host not reachable: ${proxmox_host}"
        return 0  # Don't fail test for network issues
    fi
    
    # Test API endpoint
    if curl -k -s --connect-timeout 10 "https://${proxmox_host}:8006/api2/json/version" > /dev/null 2>&1; then
        success "Proxmox API endpoint accessible"
    else
        warning "Proxmox API endpoint not accessible"
        return 0
    fi
    
    # Test authentication (if password available)
    if [[ -n "${PROXMOX_PASSWORD:-}" ]]; then
        local auth_test=$(curl -k -s --connect-timeout 10 \
            -d "username=root@pam&password=${PROXMOX_PASSWORD}" \
            "https://${proxmox_host}:8006/api2/json/access/ticket" 2>/dev/null || echo "failed")
        
        if echo "${auth_test}" | grep -q "ticket"; then
            success "Proxmox authentication successful"
        else
            warning "Proxmox authentication failed (check credentials)"
        fi
    else
        warning "Proxmox password not available for authentication test"
    fi
    
    success "Proxmox connectivity test completed"
}

# Test monitoring configuration
test_monitoring_config() {
    log "Testing monitoring configuration..."
    
    # Test Promtail configuration exists
    if [[ -f "apps/base/monitoring/promtail/configmap.yaml" ]]; then
        success "Promtail configuration exists"
    else
        error "Promtail configuration missing"
        return 1
    fi
    
    # Test alerting rules
    if [[ -f "apps/base/monitoring/prometheus/alerting-rules.yaml" ]]; then
        success "Alerting rules configuration exists"
        
        # Validate YAML syntax
        if yq eval '.spec.groups' "apps/base/monitoring/prometheus/alerting-rules.yaml" > /dev/null 2>&1; then
            success "Alerting rules YAML syntax valid"
        else
            error "Alerting rules YAML syntax invalid"
            return 1
        fi
    else
        error "Alerting rules configuration missing"
        return 1
    fi
    
    # Test Grafana sealed secret template
    if [[ -f "apps/base/monitoring/grafana/grafana-admin-sealed-secret.yaml" ]]; then
        success "Grafana sealed secret template exists"
    else
        warning "Grafana sealed secret template missing"
    fi
    
    success "Monitoring configuration test completed"
}

# Test security configurations
test_security_config() {
    log "Testing security configurations..."
    
    # Test Prometheus values for security improvements
    local prometheus_values="apps/base/monitoring/prometheus/values.yaml"
    
    if grep -q "insecure_skip_verify: false" "${prometheus_values}"; then
        success "Prometheus TLS security configured correctly"
    else
        error "Prometheus TLS security misconfigured"
        return 1
    fi
    
    if grep -q "existingSecret: grafana-admin-secret" "${prometheus_values}"; then
        success "Grafana admin credentials use sealed secret"
    else
        error "Grafana admin credentials not using sealed secret"
        return 1
    fi
    
    # Test Terraform security configuration
    local terraform_template="templates/terraform/main.tf.j2"
    
    if grep -q "pm_tls_insecure = var.proxmox_tls_insecure" "${terraform_template}"; then
        success "Terraform TLS security configurable"
    else
        error "Terraform TLS security not configurable"
        return 1
    fi
    
    success "Security configuration test completed"
}

# Test deployment dry-run
test_deployment_dry_run() {
    if [[ "${TEST_MODE}" != "dry-run" ]] && [[ "${TEST_MODE}" != "full-deploy" ]]; then
        log "Skipping deployment dry-run (test mode: ${TEST_MODE})"
        return 0
    fi
    
    log "Testing deployment dry-run..."
    
    # Test deploy.sh script syntax
    if bash -n scripts/deploy.sh; then
        success "Deploy script syntax valid"
    else
        error "Deploy script syntax invalid"
        return 1
    fi
    
    # Test phase execution (dry-run mode)
    if [[ "${TEST_MODE}" == "full-deploy" ]] && [[ -n "${PROXMOX_PASSWORD:-}" ]]; then
        log "Running infrastructure deployment test..."
        warning "This will attempt to create actual VMs on Proxmox!"
        
        # Run actual deployment
        export PROXMOX_PASSWORD
        if timeout 300 ./deploy.sh "${CONFIG_FILE}" infrastructure; then
            success "Infrastructure deployment completed"
            
            # Clean up created resources
            log "Cleaning up test resources..."
            cd "${TEST_OUTPUT}/configs/terraform"
            if terraform destroy -var="proxmox_password=${PROXMOX_PASSWORD}" -var="proxmox_tls_insecure=true" -auto-approve; then
                success "Test resources cleaned up"
            else
                warning "Failed to clean up test resources - manual cleanup required"
            fi
            cd "${PROJECT_ROOT}"
        else
            error "Infrastructure deployment failed"
            return 1
        fi
    else
        log "Skipping actual deployment (dry-run mode or no credentials)"
    fi
    
    success "Deployment dry-run test completed"
}

# Generate test report
generate_test_report() {
    log "Generating test report..."
    
    local report_file="${TEST_OUTPUT}/reports/test-report.md"
    local test_duration=$(($(date +%s) - START_TIME))
    
    cat > "${report_file}" << EOF
# InfraFlux v2.0 Production Deployment Test Report

**Test Date**: $(date '+%Y-%m-%d %H:%M:%S')  
**Configuration**: ${CONFIG_FILE}  
**Test Mode**: ${TEST_MODE}  
**Duration**: ${test_duration} seconds  

## Test Results Summary

- **Passed Tests**: ${#PASSED_TESTS[@]}
- **Failed Tests**: ${#FAILED_TESTS[@]}
- **Warnings**: ${#WARNINGS[@]}

### Passed Tests ✅
EOF

    for test in "${PASSED_TESTS[@]}"; do
        echo "- ✅ ${test}" >> "${report_file}"
    done
    
    if [[ ${#FAILED_TESTS[@]} -gt 0 ]]; then
        echo -e "\n### Failed Tests ❌" >> "${report_file}"
        for test in "${FAILED_TESTS[@]}"; do
            echo "- ❌ ${test}" >> "${report_file}"
        done
    fi
    
    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        echo -e "\n### Warnings ⚠️" >> "${report_file}"
        for warning in "${WARNINGS[@]}"; do
            echo "- ⚠️ ${warning}" >> "${report_file}"
        done
    fi
    
    cat >> "${report_file}" << EOF

## Configuration Analysis

$(yq eval '.data | {
  cluster_name: .cluster_name,
  environment: .environment,
  proxmox_host: .proxmox_host,
  control_planes: (.control_plane_ips | length),
  workers: (.worker_ips | length),
  monitoring_enabled: .applications.monitoring.enabled,
  gitops_enabled: .gitops.enabled
}' "${PROJECT_ROOT}/${CONFIG_FILE}")

## Generated Files

\`\`\`
$(find "${TEST_OUTPUT}/configs" -name "*.yaml" -o -name "*.tf" 2>/dev/null | sort || echo "No files generated")
\`\`\`

## Recommendations

EOF

    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        cat >> "${report_file}" << EOF
✅ **Production Ready**: All tests passed. The deployment configuration is ready for production use.

### Next Steps:
1. Review the generated configurations in \`${TEST_OUTPUT}/configs/\`
2. Update any placeholder values in the configuration
3. Run the full deployment: \`./deploy.sh ${CONFIG_FILE}\`
EOF
    else
        cat >> "${report_file}" << EOF
❌ **Not Production Ready**: ${#FAILED_TESTS[@]} test(s) failed. Address the following issues before deployment:

EOF
        for test in "${FAILED_TESTS[@]}"; do
            echo "- ${test}" >> "${report_file}"
        done
    fi
    
    cat >> "${report_file}" << EOF

---
*Report generated by InfraFlux v2.0 Test Suite*
EOF

    success "Test report generated: ${report_file}"
}

# Show test summary
show_test_summary() {
    local test_duration=$(($(date +%s) - START_TIME))
    
    echo
    echo "🧪 InfraFlux v2.0 Production Deployment Test Summary"
    echo "=================================================="
    echo "Configuration: ${CONFIG_FILE}"
    echo "Test Mode: ${TEST_MODE}"
    echo "Duration: ${test_duration} seconds"
    echo
    echo "Results:"
    echo "  ✅ Passed: ${#PASSED_TESTS[@]}"
    echo "  ❌ Failed: ${#FAILED_TESTS[@]}"
    echo "  ⚠️  Warnings: ${#WARNINGS[@]}"
    echo
    
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        echo -e "${GREEN}🎉 All tests passed! Configuration is production-ready.${NC}"
    else
        echo -e "${RED}❌ ${#FAILED_TESTS[@]} test(s) failed. Review issues before deployment.${NC}"
    fi
    
    echo
    echo "📊 Detailed report: ${TEST_OUTPUT}/reports/test-report.md"
    echo "📁 Test outputs: ${TEST_OUTPUT}/"
    echo
}

# Main test execution
main() {
    show_banner
    
    # Execute test phases
    setup_test_environment || exit 1
    test_prerequisites || exit 1
    test_configuration || exit 1
    test_config_generation || exit 1
    test_terraform || exit 1
    test_proxmox_connectivity || true  # Don't fail on connectivity issues
    test_monitoring_config || exit 1
    test_security_config || exit 1
    test_deployment_dry_run || exit 1
    
    # Generate report and summary
    generate_test_report
    show_test_summary
    
    # Exit with appropriate code
    if [[ ${#FAILED_TESTS[@]} -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Show help
show_help() {
    cat << EOF
InfraFlux v2.0 Production Deployment Test Suite

Usage: $0 [config-file] [test-mode]

Arguments:
  config-file    Configuration file to test (default: config/test-cluster-config.yaml)
  test-mode      Test mode: dry-run, validate-only, full-deploy (default: dry-run)

Test Modes:
  validate-only  - Only validate configuration and generate files
  dry-run        - Full testing without actual deployment
  full-deploy    - Complete deployment test (requires Proxmox access)

Examples:
  $0                                           # Test with defaults
  $0 config/production-test-config.yaml       # Test production config
  $0 config/test-cluster-config.yaml full-deploy  # Full deployment test

Environment Variables:
  PROXMOX_PASSWORD    - Proxmox password for connectivity testing
  GITHUB_TOKEN        - GitHub token for GitOps testing
  SLACK_WEBHOOK_URL   - Slack webhook for monitoring testing

Prerequisites:
  - All InfraFlux tools installed (python3, talosctl, kubectl, terraform, yq)
  - Secrets configured (run: scripts/load-secrets.sh template)
  - Valid configuration file

EOF
}

# Execute main or show help
if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    show_help
else
    main "$@"
fi