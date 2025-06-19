#!/bin/bash
# InfraFlux v2.0 Configuration Validation Script
# Comprehensive validation of cluster configuration and templates

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
readonly NC='\033[0m'

# State tracking
declare -i TOTAL_CHECKS=0
declare -i PASSED_CHECKS=0
declare -i FAILED_CHECKS=0
declare -a FAILURES=()

# Logging functions
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASSED_CHECKS++))
}

warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[FAIL]${NC} $1"
    FAILURES+=("$1")
    ((FAILED_CHECKS++))
}

check() {
    local description="$1"
    local command="$2"
    
    ((TOTAL_CHECKS++))
    log "Checking: $description"
    
    if eval "$command" &>/dev/null; then
        success "$description"
        return 0
    else
        error "$description"
        return 1
    fi
}

# Banner
show_banner() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}InfraFlux v2.0 Configuration Validation${NC}"
    echo -e "${BLUE}Validating deployment readiness and configuration integrity${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo
}

# Prerequisites validation
validate_prerequisites() {
    log "🔍 Validating prerequisites..."
    
    local tools=("python3" "yq" "terraform" "talosctl" "kubectl")
    for tool in "${tools[@]}"; do
        check "Tool availability: $tool" "command -v $tool"
    done
    
    # Python dependencies
    check "Python YAML module" "python3 -c 'import yaml'"
    check "Python Jinja2 module" "python3 -c 'import jinja2'"
    
    echo
}

# Configuration file validation
validate_configuration() {
    log "📝 Validating configuration file..."
    
    # File existence
    check "Configuration file exists" "test -f '$CONFIG_FILE'"
    
    if [[ -f "$CONFIG_FILE" ]]; then
        # YAML syntax
        check "YAML syntax validation" "yq eval '.' '$CONFIG_FILE'"
        
        # Required fields
        local required_fields=(
            ".data.cluster_name"
            ".data.talos_version"
            ".data.kubernetes_version"
            ".data.proxmox_host"
            ".data.control_plane_ips"
            ".data.worker_ips"
            ".data.cluster_domain"
        )
        
        for field in "${required_fields[@]}"; do
            check "Required field: $field" "yq eval '$field' '$CONFIG_FILE' | grep -v null"
        done
        
        # IP address validation
        check "Control plane IPs valid" "python3 -c '
import yaml, ipaddress, sys
with open(\"$CONFIG_FILE\") as f:
    config = yaml.safe_load(f)
for ip in config[\"data\"][\"control_plane_ips\"]:
    ipaddress.ip_address(ip)
'"
        
        check "Worker IPs valid" "python3 -c '
import yaml, ipaddress, sys
with open(\"$CONFIG_FILE\") as f:
    config = yaml.safe_load(f)
for ip in config[\"data\"][\"worker_ips\"]:
    ipaddress.ip_address(ip)
'"
        
        # Control plane count validation (must be odd for HA)
        check "Control plane count (odd for HA)" "python3 -c '
import yaml, sys
with open(\"$CONFIG_FILE\") as f:
    config = yaml.safe_load(f)
cp_count = len(config[\"data\"][\"control_plane_ips\"])
if cp_count > 1 and cp_count % 2 == 0:
    sys.exit(1)
'"
        
        # Production features validation
        check "Production configuration structure" "yq eval '.data.production' '$CONFIG_FILE' | grep -v null"
        
        # Security configuration validation
        check "Security hardening features" "yq eval '.data.production.enable_audit_logging' '$CONFIG_FILE'"
        check "Performance optimization features" "yq eval '.data.production.enable_cpu_manager' '$CONFIG_FILE'"
        check "Monitoring integration features" "yq eval '.data.production.enable_metrics_server' '$CONFIG_FILE'"
    fi
    
    echo
}

# Template validation
validate_templates() {
    log "🔧 Validating Jinja2 templates..."
    
    # Template files existence
    local templates=(
        "templates/talos/controlplane.yaml.j2"
        "templates/talos/worker.yaml.j2"
        "templates/terraform/main.tf.j2"
    )
    
    for template in "${templates[@]}"; do
        check "Template exists: $(basename "$template")" "test -f '$template'"
    done
    
    # Template syntax validation
    if [[ -f "$CONFIG_FILE" ]]; then
        check "Template rendering test" "python3 '$SCRIPT_DIR/generate-configs.py' --config '$CONFIG_FILE' --validate-only"
    fi
    
    echo
}

# Terraform validation
validate_terraform() {
    log "🏗️ Validating Terraform configuration..."
    
    # Generate configs to temp directory
    local temp_dir="/tmp/infraflux-validation-$$"
    mkdir -p "$temp_dir"
    
    if [[ -f "$CONFIG_FILE" ]] && python3 "$SCRIPT_DIR/generate-configs.py" --config "$CONFIG_FILE" --output "$temp_dir" &>/dev/null; then
        
        # Terraform syntax validation
        check "Terraform syntax validation" "terraform -chdir='$temp_dir/terraform' validate"
        
        # Terraform formatting
        check "Terraform formatting" "terraform -chdir='$temp_dir/terraform' fmt -check"
        
    else
        error "Could not generate Terraform configs for validation"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    echo
}

# Talos configuration validation
validate_talos() {
    log "🤖 Validating Talos configuration..."
    
    # Generate configs to temp directory
    local temp_dir="/tmp/infraflux-validation-$$"
    mkdir -p "$temp_dir"
    
    if [[ -f "$CONFIG_FILE" ]] && python3 "$SCRIPT_DIR/generate-configs.py" --config "$CONFIG_FILE" --output "$temp_dir" &>/dev/null; then
        
        # Validate generated Talos configs
        for config_file in "$temp_dir/talos"/*.yaml; do
            if [[ -f "$config_file" && "$config_file" != *"talosconfig"* && "$config_file" != *"secrets.yaml"* ]]; then
                local config_name=$(basename "$config_file")
                check "Talos config syntax: $config_name" "talosctl validate --config '$config_file'"
            fi
        done
        
    else
        error "Could not generate Talos configs for validation"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    echo
}

# GitOps structure validation
validate_gitops() {
    log "🔄 Validating GitOps structure..."
    
    # Directory structure
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
        check "GitOps directory: $dir" "test -d '$dir'"
    done
    
    # Kustomization files
    local kustomizations=(
        "infrastructure/kustomization.yaml"
        "apps/base/kustomization.yaml"
        "clusters/production/infrastructure.yaml"
        "clusters/production/apps.yaml"
    )
    
    for kustomization in "${kustomizations[@]}"; do
        check "Kustomization file: $(basename "$kustomization")" "test -f '$kustomization'"
        if [[ -f "$kustomization" ]]; then
            check "Kustomization syntax: $(basename "$kustomization")" "yq eval '.' '$kustomization'"
        fi
    done
    
    echo
}

# Summary report
show_summary() {
    echo -e "${BLUE}================================================================${NC}"
    echo -e "${BLUE}Validation Summary${NC}"
    echo -e "${BLUE}================================================================${NC}"
    echo
    
    echo -e "Total Checks: ${TOTAL_CHECKS}"
    echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}"
    echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"
    
    if [[ ${FAILED_CHECKS} -gt 0 ]]; then
        echo
        echo -e "${RED}Failed Checks:${NC}"
        for failure in "${FAILURES[@]}"; do
            echo -e "  ❌ $failure"
        done
        echo
        echo -e "${YELLOW}Recommendations:${NC}"
        echo -e "  1. Review configuration file: $CONFIG_FILE"
        echo -e "  2. Install missing prerequisites"
        echo -e "  3. Check template syntax and paths"
        echo -e "  4. Verify GitOps directory structure"
        
        return 1
    else
        echo
        echo -e "${GREEN}🎉 All validation checks passed!${NC}"
        echo -e "${GREEN}InfraFlux v2.0 is ready for deployment.${NC}"
        
        return 0
    fi
}

# Main execution
main() {
    show_banner
    
    validate_prerequisites
    validate_configuration
    validate_templates
    validate_terraform
    validate_talos
    validate_gitops
    
    show_summary
}

# Execute if run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi