#!/bin/bash
# InfraFlux v2.0 Deployment Testing Script
# Test deployment pipeline with dry-run and validation modes

set -euo pipefail

# Script metadata
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly CONFIG_FILE="${1:-config/cluster-config.yaml}"
readonly TEST_MODE="${2:-all}"
readonly TEST_DIR="/tmp/infraflux-test-$(date +%Y%m%d-%H%M%S)"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly NC='\033[0m'

# State tracking
declare -i TOTAL_TESTS=0
declare -i PASSED_TESTS=0
declare -i FAILED_TESTS=0
declare -a TEST_RESULTS=()

# Logging functions
log() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TEST_RESULTS+=("✅ $1")
    ((PASSED_TESTS++))
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    TEST_RESULTS+=("⚠️  $1")
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
    TEST_RESULTS+=("❌ $1")
    ((FAILED_TESTS++))
}

test_case() {
    local description="$1"
    local command="$2"
    local expected_exit_code="${3:-0}"
    
    ((TOTAL_TESTS++))
    log "Testing: $description"
    
    local exit_code=0
    if eval "$command" &>/dev/null; then
        exit_code=0
    else
        exit_code=$?
    fi
    
    if [[ $exit_code -eq $expected_exit_code ]]; then
        success "$description"
        return 0
    else
        error "$description (exit code: $exit_code, expected: $expected_exit_code)"
        return 1
    fi
}

# Banner
show_banner() {
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}InfraFlux v2.0 Deployment Testing Suite${NC}"
    echo -e "${PURPLE}Testing deployment pipeline with dry-run validation${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo
    echo -e "Test Directory: ${TEST_DIR}"
    echo -e "Configuration: ${CONFIG_FILE}"
    echo -e "Test Mode: ${TEST_MODE}"
    echo
}

# Setup test environment
setup_test_environment() {
    log "🔧 Setting up test environment..."
    
    # Create test directory
    mkdir -p "$TEST_DIR"
    
    # Copy configuration for testing
    if [[ -f "$CONFIG_FILE" ]]; then
        cp "$CONFIG_FILE" "$TEST_DIR/test-config.yaml"
        success "Test environment setup completed"
    else
        error "Configuration file not found: $CONFIG_FILE"
        exit 1
    fi
}

# Test configuration generation
test_configuration_generation() {
    log "📝 Testing configuration generation..."
    
    test_case "Configuration validation" "python3 '$SCRIPT_DIR/generate-configs.py' --config '$TEST_DIR/test-config.yaml' --validate-only"
    
    test_case "Configuration generation" "python3 '$SCRIPT_DIR/generate-configs.py' --config '$TEST_DIR/test-config.yaml' --output '$TEST_DIR'"
    
    # Check generated files
    local expected_files=(
        "$TEST_DIR/talos/secrets.yaml"
        "$TEST_DIR/talos/talosconfig"
        "$TEST_DIR/terraform/main.tf"
    )
    
    for file in "${expected_files[@]}"; do
        test_case "Generated file exists: $(basename "$file")" "test -f '$file'"
    done
}

# Test Terraform validation
test_terraform_validation() {
    log "🏗️ Testing Terraform validation..."
    
    local terraform_dir="$TEST_DIR/terraform"
    
    if [[ -d "$terraform_dir" ]]; then
        test_case "Terraform init" "terraform -chdir='$terraform_dir' init"
        test_case "Terraform validate" "terraform -chdir='$terraform_dir' validate"
        test_case "Terraform plan (dry-run)" "terraform -chdir='$terraform_dir' plan -var='proxmox_password=test-password'"
    else
        error "Terraform directory not found"
    fi
}

# Test Talos configuration validation
test_talos_validation() {
    log "🤖 Testing Talos configuration validation..."
    
    local talos_dir="$TEST_DIR/talos"
    
    if [[ -d "$talos_dir" ]]; then
        # Validate all generated Talos configs
        for config_file in "$talos_dir"/*.yaml; do
            if [[ -f "$config_file" && "$(basename "$config_file")" != "secrets.yaml" ]]; then
                local config_name=$(basename "$config_file")
                test_case "Talos config validation: $config_name" "talosctl validate --config '$config_file'"
            fi
        done
        
        # Test talosconfig format
        test_case "Talosconfig format validation" "yq eval '.' '$talos_dir/talosconfig'"
    else
        error "Talos directory not found"
    fi
}

# Test deployment script dry-run
test_deployment_script() {
    log "🚀 Testing deployment script..."
    
    # Test help functionality
    test_case "Deploy script help" "$PROJECT_ROOT/deploy.sh --help"
    
    # Test configuration file detection
    test_case "Deploy script config detection" "test -f '$CONFIG_FILE'"
    
    # Test prerequisites check (should work since we validated tools)
    test_case "Prerequisites validation" "python3 -c 'import yaml, jinja2'"
}

# Test GitOps structure validation
test_gitops_structure() {
    log "🔄 Testing GitOps structure..."
    
    # Test Kustomize builds
    local kustomizations=(
        "infrastructure"
        "apps/base"
        "apps/overlays/production"
        "apps/overlays/staging"
        "apps/overlays/development"
    )
    
    for kustomization in "${kustomizations[@]}"; do
        if [[ -d "$PROJECT_ROOT/$kustomization" ]]; then
            test_case "Kustomize build: $kustomization" "kubectl kustomize '$PROJECT_ROOT/$kustomization'"
        fi
    done
    
    # Test Flux compatibility
    test_case "Flux dry-run compatibility" "flux check --pre"
}

# Test network and IP validation
test_network_validation() {
    log "🌐 Testing network configuration..."
    
    # Extract IPs from config and validate
    test_case "IP address format validation" "python3 -c '
import yaml, ipaddress
with open(\"$TEST_DIR/test-config.yaml\") as f:
    config = yaml.safe_load(f)
    
# Validate control plane IPs
for ip in config[\"data\"][\"control_plane_ips\"]:
    ipaddress.ip_address(ip)
    
# Validate worker IPs  
for ip in config[\"data\"][\"worker_ips\"]:
    ipaddress.ip_address(ip)
    
print(\"All IP addresses are valid\")
'"
    
    # Test for IP conflicts
    test_case "IP conflict detection" "python3 -c '
import yaml
with open(\"$TEST_DIR/test-config.yaml\") as f:
    config = yaml.safe_load(f)
    
all_ips = config[\"data\"][\"control_plane_ips\"] + config[\"data\"][\"worker_ips\"]
if len(all_ips) != len(set(all_ips)):
    raise ValueError(\"Duplicate IP addresses detected\")
    
print(\"No IP conflicts detected\")
'"
}

# Test security configuration
test_security_configuration() {
    log "🔒 Testing security configuration..."
    
    # Test that secrets aren't accidentally committed
    test_case "No secrets in git" "! git ls-files | grep -E '(secret|password|token|key)' | grep -v '.gitignore'"
    
    # Test .gitignore coverage
    test_case "Gitignore secrets protection" "grep -q 'secrets.yaml' '$PROJECT_ROOT/.gitignore'"
    test_case "Gitignore Terraform state protection" "grep -q '*.tfstate' '$PROJECT_ROOT/.gitignore'"
    test_case "Gitignore kubeconfig protection" "grep -q 'kubeconfig' '$PROJECT_ROOT/.gitignore'"
    
    # Test Talos security features
    if [[ -f "$TEST_DIR/talos/controlplane-0.yaml" ]]; then
        test_case "Talos security context" "yq eval '.machine.features.apidCheckExtKeyUsage' '$TEST_DIR/talos/controlplane-0.yaml'"
    fi
}

# Performance and resource validation
test_resource_configuration() {
    log "⚡ Testing resource configuration..."
    
    # Test VM resource allocation
    test_case "VM resource validation" "python3 -c '
import yaml
with open(\"$TEST_DIR/test-config.yaml\") as f:
    config = yaml.safe_load(f)
    
# Check reasonable resource allocation
cores = config[\"data\"][\"vm_cores\"]
memory = config[\"data\"][\"vm_memory\"]

if cores < 2:
    raise ValueError(\"Insufficient CPU cores\")
if memory < 4096:
    raise ValueError(\"Insufficient memory\")
    
print(f\"Resource allocation: {cores} cores, {memory}MB memory\")
'"
}

# Cleanup test environment
cleanup_test_environment() {
    log "🧹 Cleaning up test environment..."
    
    if [[ -d "$TEST_DIR" ]]; then
        rm -rf "$TEST_DIR"
        success "Test environment cleaned up"
    fi
}

# Generate test report
generate_test_report() {
    echo
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}Test Execution Summary${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo
    
    echo -e "Total Tests: ${TOTAL_TESTS}"
    echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
    echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"
    
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        echo
        echo -e "${RED}Test Results:${NC}"
    else
        echo
        echo -e "${GREEN}Test Results:${NC}"
    fi
    
    for result in "${TEST_RESULTS[@]}"; do
        echo -e "  $result"
    done
    
    echo
    
    if [[ ${FAILED_TESTS} -gt 0 ]]; then
        echo -e "${RED}❌ Some tests failed. Please review and fix issues before deployment.${NC}"
        return 1
    else
        echo -e "${GREEN}🎉 All tests passed! InfraFlux v2.0 is ready for deployment.${NC}"
        return 0
    fi
}

# Main execution
main() {
    show_banner
    
    # Setup
    setup_test_environment
    trap cleanup_test_environment EXIT
    
    # Run tests based on mode
    case "$TEST_MODE" in
        "all")
            test_configuration_generation
            test_terraform_validation
            test_talos_validation
            test_deployment_script
            test_gitops_structure
            test_network_validation
            test_security_configuration
            test_resource_configuration
            ;;
        "config")
            test_configuration_generation
            ;;
        "terraform")
            test_configuration_generation
            test_terraform_validation
            ;;
        "talos")
            test_configuration_generation
            test_talos_validation
            ;;
        "gitops")
            test_gitops_structure
            ;;
        "security")
            test_security_configuration
            ;;
        *)
            error "Invalid test mode: $TEST_MODE"
            echo "Valid modes: all, config, terraform, talos, gitops, security"
            exit 1
            ;;
    esac
    
    generate_test_report
}

# Show help
show_help() {
    echo "InfraFlux v2.0 Deployment Testing"
    echo "================================="
    echo
    echo "Usage: $0 [config-file] [test-mode]"
    echo
    echo "Test Modes:"
    echo "  all        - Run all tests (default)"
    echo "  config     - Test configuration generation only"
    echo "  terraform  - Test Terraform validation"
    echo "  talos      - Test Talos configuration"
    echo "  gitops     - Test GitOps structure"
    echo "  security   - Test security configuration"
    echo
    echo "Examples:"
    echo "  $0                                    # Test with default config"
    echo "  $0 config/cluster-config.yaml        # Test with custom config"
    echo "  $0 config/cluster-config.yaml talos  # Test only Talos configs"
}

# Execute based on arguments
if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    show_help
    exit 0
fi

main "$@"