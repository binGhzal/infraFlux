#!/bin/bash
# InfraFlux v2.0 Integration Testing Script
# Orchestrates comprehensive testing of the entire platform

set -euo pipefail

# Script metadata
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly CONFIG_FILE="${1:-config/cluster-config.yaml}"

# Colors
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly PURPLE='\033[0;35m'
readonly WHITE='\033[1;37m'
readonly NC='\033[0m'

# State tracking
declare -i TOTAL_SUITES=0
declare -i PASSED_SUITES=0
declare -i FAILED_SUITES=0
declare -a SUITE_RESULTS=()

# Banner
show_banner() {
    clear
    echo -e "${PURPLE}${WHITE}"
    cat << 'EOF'
  ██╗███╗   ██╗████████╗███████╗ ██████╗ ██████╗  █████╗ ████████╗██╗ ██████╗ ███╗   ██╗
  ██║████╗  ██║╚══██╔══╝██╔════╝██╔════╝ ██╔══██╗██╔══██╗╚══██╔══╝██║██╔═══██╗████╗  ██║
  ██║██╔██╗ ██║   ██║   █████╗  ██║  ███╗██████╔╝███████║   ██║   ██║██║   ██║██╔██╗ ██║
  ██║██║╚██╗██║   ██║   ██╔══╝  ██║   ██║██╔══██╗██╔══██║   ██║   ██║██║   ██║██║╚██╗██║
  ██║██║ ╚████║   ██║   ███████╗╚██████╔╝██║  ██║██║  ██║   ██║   ██║╚██████╔╝██║ ╚████║
  ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
EOF
    echo -e "${NC}"
    echo -e "${WHITE}InfraFlux v2.0 - Integration Testing Suite${NC}"
    echo -e "${BLUE}Comprehensive validation of Talos Kubernetes platform${NC}"
    echo "=============================================================================="
    echo
}

# Logging functions
log() {
    echo -e "${BLUE}[INTEGRATION]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUITE PASS]${NC} $1"
    SUITE_RESULTS+=("✅ $1")
    ((PASSED_SUITES++))
}

error() {
    echo -e "${RED}[SUITE FAIL]${NC} $1"
    SUITE_RESULTS+=("❌ $1")
    ((FAILED_SUITES++))
}

# Run test suite
run_test_suite() {
    local suite_name="$1"
    local script_path="$2"
    local description="$3"
    
    ((TOTAL_SUITES++))
    
    echo
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}Running Test Suite: ${suite_name}${NC}"
    echo -e "${PURPLE}${description}${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo
    
    if [[ -x "$script_path" ]]; then
        if "$script_path" "$CONFIG_FILE"; then
            success "$suite_name"
            return 0
        else
            error "$suite_name"
            return 1
        fi
    else
        error "$suite_name (script not found or not executable: $script_path)"
        return 1
    fi
}

# Pre-flight checks
pre_flight_checks() {
    log "🔍 Running pre-flight checks..."
    
    # Check if config file exists
    if [[ ! -f "$CONFIG_FILE" ]]; then
        echo -e "${RED}❌ Configuration file not found: $CONFIG_FILE${NC}"
        echo "Please create the configuration file first."
        exit 1
    fi
    
    # Check if required scripts exist
    local required_scripts=(
        "$SCRIPT_DIR/validate-config.sh"
        "$SCRIPT_DIR/test-deployment.sh"
    )
    
    for script in "${required_scripts[@]}"; do
        if [[ ! -x "$script" ]]; then
            echo -e "${RED}❌ Required script not found or not executable: $script${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ Pre-flight checks passed${NC}"
    echo
}

# Main test orchestration
main() {
    show_banner
    
    log "🎯 Starting InfraFlux v2.0 Integration Testing"
    log "📁 Configuration file: $CONFIG_FILE"
    log "🕐 $(date)"
    
    pre_flight_checks
    
    # Test Suite 1: Configuration Validation
    run_test_suite \
        "Configuration Validation" \
        "$SCRIPT_DIR/validate-config.sh" \
        "Validates configuration files, templates, and GitOps structure"
    
    # Test Suite 2: Deployment Pipeline Testing
    run_test_suite \
        "Deployment Pipeline Testing" \
        "$SCRIPT_DIR/test-deployment.sh" \
        "Tests deployment pipeline with dry-run validation"
    
    # Test Suite 3: Security Testing
    run_test_suite \
        "Security Configuration Testing" \
        "$SCRIPT_DIR/test-deployment.sh security" \
        "Validates security configurations and best practices"
    
    # Test Suite 4: GitOps Structure Testing  
    run_test_suite \
        "GitOps Structure Testing" \
        "$SCRIPT_DIR/test-deployment.sh gitops" \
        "Validates Flux v2 GitOps structure and Kustomize builds"
    
    # Generate final report
    generate_final_report
}

# Generate comprehensive final report
generate_final_report() {
    echo
    echo -e "${PURPLE}================================================================${NC}"
    echo -e "${PURPLE}Integration Testing Final Report${NC}"
    echo -e "${PURPLE}================================================================${NC}"
    echo
    
    echo -e "📊 Test Suite Summary:"
    echo -e "   Total Suites: ${TOTAL_SUITES}"
    echo -e "   ${GREEN}Passed: ${PASSED_SUITES}${NC}"
    echo -e "   ${RED}Failed: ${FAILED_SUITES}${NC}"
    echo
    
    echo -e "📋 Detailed Results:"
    for result in "${SUITE_RESULTS[@]}"; do
        echo -e "   $result"
    done
    echo
    
    # Overall status
    if [[ ${FAILED_SUITES} -gt 0 ]]; then
        echo -e "${RED}❌ Integration Testing FAILED${NC}"
        echo -e "${RED}Some test suites failed. Please review and fix issues before deployment.${NC}"
        echo
        echo -e "${YELLOW}Recommended Actions:${NC}"
        echo -e "   1. Review failed test suite outputs above"
        echo -e "   2. Fix configuration or template issues"
        echo -e "   3. Ensure all prerequisites are installed"
        echo -e "   4. Re-run integration tests after fixes"
        echo
        return 1
    else
        echo -e "${GREEN}🎉 Integration Testing PASSED${NC}"
        echo -e "${GREEN}All test suites passed successfully!${NC}"
        echo
        echo -e "${WHITE}✨ InfraFlux v2.0 is ready for deployment!${NC}"
        echo
        echo -e "${BLUE}Next Steps:${NC}"
        echo -e "   1. Review your configuration: $CONFIG_FILE"
        echo -e "   2. Ensure Proxmox is accessible and has Talos ISO"
        echo -e "   3. Run deployment: ./deploy.sh"
        echo -e "   4. Monitor deployment progress and logs"
        echo
        return 0
    fi
}

# Show help
show_help() {
    echo "InfraFlux v2.0 Integration Testing Suite"
    echo "======================================="
    echo
    echo "Usage: $0 [config-file]"
    echo
    echo "Description:"
    echo "  Runs comprehensive integration tests to validate InfraFlux v2.0"
    echo "  deployment readiness including configuration, templates, security,"
    echo "  and GitOps structure validation."
    echo
    echo "Arguments:"
    echo "  config-file    Path to cluster configuration file"
    echo "                 (default: config/cluster-config.yaml)"
    echo
    echo "Examples:"
    echo "  $0                                    # Test with default config"
    echo "  $0 config/cluster-config.yaml        # Test with custom config"
    echo
    echo "Test Suites:"
    echo "  1. Configuration Validation    - Config files, templates, GitOps structure"
    echo "  2. Deployment Pipeline Testing - Dry-run validation of deployment process"
    echo "  3. Security Configuration     - Security best practices and configurations"
    echo "  4. GitOps Structure Testing   - Flux v2 and Kustomize validation"
    echo
}

# Handle help request
if [[ "${1:-}" =~ ^(-h|--help|help)$ ]]; then
    show_help
    exit 0
fi

# Execute main function
main "$@"