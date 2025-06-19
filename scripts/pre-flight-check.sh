#!/bin/bash
# InfraFlux v2.0 Pre-flight Check Script
# Validates environment readiness before deployment testing

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CONFIG_FILE="$PROJECT_ROOT/configs/global.yaml"
INVENTORY_FILE="$PROJECT_ROOT/ansible/inventory/hosts.yml"

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  InfraFlux v2.0 Pre-flight Check${NC}"
echo -e "${BLUE}======================================${NC}"
echo

# Function to check command availability
check_command() {
    local cmd="$1"
    local version_flag="${2:-}"
    
    if command -v "$cmd" >/dev/null 2>&1; then
        local version=""
        if [[ -n "$version_flag" ]]; then
            version=$(eval "$cmd $version_flag" 2>/dev/null | head -n 1 || echo "unknown")
        fi
        echo -e "${GREEN}✓${NC} $cmd installed${version:+ ($version)}"
        return 0
    else
        echo -e "${RED}✗${NC} $cmd not found"
        return 1
    fi
}

# Function to check file existence
check_file() {
    local file="$1"
    local description="$2"
    
    if [[ -f "$file" ]]; then
        echo -e "${GREEN}✓${NC} $description exists"
        return 0
    else
        echo -e "${RED}✗${NC} $description missing: $file"
        return 1
    fi
}

# Check required tools
echo -e "${YELLOW}Checking required tools...${NC}"
TOOLS_OK=true

check_command "ansible" "--version" || TOOLS_OK=false
check_command "terraform" "version" || TOOLS_OK=false
check_command "packer" "version" || TOOLS_OK=false
check_command "talosctl" "version --client" || TOOLS_OK=false
check_command "kubectl" "version --client" || TOOLS_OK=false
check_command "python3" "--version" || TOOLS_OK=false
check_command "jinja2" || echo -e "${YELLOW}⚠${NC} jinja2 not in PATH (may be installed as Python module)"

echo

# Check configuration files
echo -e "${YELLOW}Checking configuration files...${NC}"
CONFIG_OK=true

check_file "$CONFIG_FILE" "Global configuration" || CONFIG_OK=false
check_file "$INVENTORY_FILE" "Ansible inventory" || CONFIG_OK=false
check_file "$PROJECT_ROOT/ansible/site.yml" "Main playbook" || CONFIG_OK=false

echo

# Check Ansible vault
echo -e "${YELLOW}Checking Ansible vault...${NC}"
VAULT_OK=true

if [[ -f "$PROJECT_ROOT/ansible/group_vars/all/vault.yml" ]]; then
    echo -e "${GREEN}✓${NC} Vault file exists"
    
    # Test vault decryption
    if ansible-vault view "$PROJECT_ROOT/ansible/group_vars/all/vault.yml" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Vault password configured correctly"
    else
        echo -e "${RED}✗${NC} Cannot decrypt vault file (check .vault_pass)"
        VAULT_OK=false
    fi
else
    echo -e "${RED}✗${NC} Vault file missing"
    VAULT_OK=false
fi

echo

# Check Proxmox connectivity (if config exists)
echo -e "${YELLOW}Checking Proxmox connectivity...${NC}"
PROXMOX_OK=true

if [[ -f "$CONFIG_FILE" ]]; then
    # Extract Proxmox URL from config (simple grep approach)
    PROXMOX_URL=$(grep "api_url:" "$CONFIG_FILE" | sed 's/.*api_url: *"\([^"]*\)".*/\1/' || echo "")
    
    if [[ -n "$PROXMOX_URL" && "$PROXMOX_URL" != *"example.com"* ]]; then
        echo "Testing connection to: $PROXMOX_URL"
        
        if curl -k -s --connect-timeout 10 "$PROXMOX_URL" >/dev/null; then
            echo -e "${GREEN}✓${NC} Proxmox API endpoint accessible"
        else
            echo -e "${RED}✗${NC} Cannot reach Proxmox API endpoint"
            PROXMOX_OK=false
        fi
    else
        echo -e "${YELLOW}⚠${NC} Proxmox URL not configured or using example values"
        PROXMOX_OK=false
    fi
else
    echo -e "${RED}✗${NC} Cannot check Proxmox connectivity (config missing)"
    PROXMOX_OK=false
fi

echo

# Check directory structure
echo -e "${YELLOW}Checking project structure...${NC}"
STRUCTURE_OK=true

REQUIRED_DIRS=(
    "ansible/roles"
    "configs"
    "scripts"
    "terraform/templates"
    "docs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [[ -d "$PROJECT_ROOT/$dir" ]]; then
        echo -e "${GREEN}✓${NC} $dir/ directory exists"
    else
        echo -e "${RED}✗${NC} $dir/ directory missing"
        STRUCTURE_OK=false
    fi
done

echo

# Check key Ansible roles
echo -e "${YELLOW}Checking Ansible roles...${NC}"
ROLES_OK=true

REQUIRED_ROLES=(
    "infraflux_orchestrator"
    "talos_config"
    "talos_bootstrap"
    "terraform_generator"
    "talos_image"
)

for role in "${REQUIRED_ROLES[@]}"; do
    if [[ -d "$PROJECT_ROOT/ansible/roles/$role" ]]; then
        echo -e "${GREEN}✓${NC} $role role exists"
    else
        echo -e "${RED}✗${NC} $role role missing"
        ROLES_OK=false
    fi
done

echo

# Summary
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  Pre-flight Check Summary${NC}"
echo -e "${BLUE}======================================${NC}"

echo -e "Required Tools:     ${GREEN}$(if $TOOLS_OK; then echo "PASS"; else echo -e "${RED}FAIL${NC}"; fi)${NC}"
echo -e "Configuration:      ${GREEN}$(if $CONFIG_OK; then echo "PASS"; else echo -e "${RED}FAIL${NC}"; fi)${NC}"
echo -e "Ansible Vault:      ${GREEN}$(if $VAULT_OK; then echo "PASS"; else echo -e "${RED}FAIL${NC}"; fi)${NC}"
echo -e "Proxmox Access:     ${GREEN}$(if $PROXMOX_OK; then echo "PASS"; else echo -e "${YELLOW}WARNING${NC}"; fi)${NC}"
echo -e "Project Structure:  ${GREEN}$(if $STRUCTURE_OK; then echo "PASS"; else echo -e "${RED}FAIL${NC}"; fi)${NC}"
echo -e "Ansible Roles:      ${GREEN}$(if $ROLES_OK; then echo "PASS"; else echo -e "${RED}FAIL${NC}"; fi)${NC}"

echo

if $TOOLS_OK && $CONFIG_OK && $VAULT_OK && $STRUCTURE_OK && $ROLES_OK; then
    echo -e "${GREEN}✓ All checks passed! Ready for deployment.${NC}"
    
    if ! $PROXMOX_OK; then
        echo -e "${YELLOW}⚠ Note: Proxmox connectivity needs to be verified manually.${NC}"
    fi
    
    echo
    echo "Next steps:"
    echo "1. Verify your configuration: configs/global.yaml"
    echo "2. Update inventory: ansible/inventory/hosts.yml"
    echo "3. Run deployment: ansible-playbook -i ansible/inventory/hosts.yml ansible/test-deploy.yml"
    
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please resolve the issues above.${NC}"
    
    echo
    echo "Common fixes:"
    
    if ! $TOOLS_OK; then
        echo "- Install missing tools (ansible, terraform, packer, talosctl, kubectl)"
    fi
    
    if ! $CONFIG_OK; then
        echo "- Copy configs/global.yaml.example to configs/global.yaml and customize"
        echo "- Copy ansible/inventory/hosts.yml.example to ansible/inventory/hosts.yml"
    fi
    
    if ! $VAULT_OK; then
        echo "- Run: ./scripts/setup-vault.sh"
    fi
    
    if ! $PROXMOX_OK; then
        echo "- Configure correct Proxmox API URL in configs/global.yaml"
        echo "- Ensure Proxmox is accessible from this machine"
    fi
    
    exit 1
fi