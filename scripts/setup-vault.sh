#!/bin/bash
# InfraFlux v2.0 Vault Setup Script
# This script helps set up Ansible Vault for secure secrets management

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    log "Checking requirements..."
    
    if ! command -v ansible-vault &> /dev/null; then
        error "ansible-vault is not installed. Please install Ansible first."
        exit 1
    fi
    
    if ! command -v ssh-keygen &> /dev/null; then
        error "ssh-keygen is not installed. Please install OpenSSH client."
        exit 1
    fi
    
    success "All requirements met"
}

# Generate SSH key pair for VM access
generate_ssh_key() {
    local key_path="$HOME/.ssh/infraflux"
    
    log "Checking for SSH key..."
    
    if [[ -f "$key_path" ]]; then
        warning "SSH key already exists at $key_path"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Using existing SSH key"
            return 0
        fi
    fi
    
    log "Generating SSH key pair..."
    ssh-keygen -t ed25519 -f "$key_path" -N "" -C "infraflux-$(date +%Y%m%d)"
    
    if [[ -f "$key_path" && -f "$key_path.pub" ]]; then
        success "SSH key pair generated at $key_path"
        log "Public key: $(cat "$key_path.pub")"
    else
        error "Failed to generate SSH key pair"
        exit 1
    fi
}

# Create vault password file
create_vault_password() {
    local vault_pass_file=".vault_pass"
    
    log "Setting up vault password..."
    
    if [[ -f "$vault_pass_file" ]]; then
        warning "Vault password file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Using existing vault password"
            return 0
        fi
    fi
    
    # Generate a secure random password
    local vault_password
    vault_password=$(openssl rand -base64 32)
    
    echo "$vault_password" > "$vault_pass_file"
    chmod 600 "$vault_pass_file"
    
    success "Vault password created and saved to $vault_pass_file"
    warning "IMPORTANT: Back up this password securely. You'll need it to decrypt secrets."
}

# Create and encrypt vault file
create_vault_file() {
    local vault_file="group_vars/all/vault.yml"
    local vault_example="group_vars/all/vault.yml.example"
    
    log "Creating vault file..."
    
    if [[ ! -f "$vault_example" ]]; then
        error "Vault example file not found: $vault_example"
        exit 1
    fi
    
    if [[ -f "$vault_file" ]]; then
        warning "Vault file already exists"
        read -p "Do you want to overwrite it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Using existing vault file"
            return 0
        fi
    fi
    
    # Copy example file to actual vault file
    cp "$vault_example" "$vault_file"
    
    # Update SSH key in vault file if it exists
    local ssh_key_path="$HOME/.ssh/infraflux"
    if [[ -f "$ssh_key_path" ]]; then
        log "Updating SSH key in vault file..."
        
        # Read the private key and escape it for YAML
        local private_key
        private_key=$(sed 's/^/  /' "$ssh_key_path")
        
        # Read the public key
        local public_key
        public_key=$(cat "$ssh_key_path.pub")
        
        # Update the vault file with actual keys
        sed -i.bak \
            -e "s|vault_ssh_private_key_path:.*|vault_ssh_private_key_path: \"$ssh_key_path\"|" \
            -e "/vault_ssh_private_key: |/,/-----END OPENSSH PRIVATE KEY-----/{
                /vault_ssh_private_key: |/!{
                    /-----END OPENSSH PRIVATE KEY-----/!d
                }
            }" \
            "$vault_file"
        
        # Insert the actual private key
        sed -i.bak "/vault_ssh_private_key: |/r $ssh_key_path" "$vault_file"
        
        # Update public key
        sed -i.bak "s|vault_ssh_public_key:.*|vault_ssh_public_key: \"$public_key\"|" "$vault_file"
        
        # Clean up backup file
        rm -f "$vault_file.bak"
    fi
    
    # Encrypt the vault file
    log "Encrypting vault file..."
    ansible-vault encrypt "$vault_file"
    
    if [[ $? -eq 0 ]]; then
        success "Vault file created and encrypted: $vault_file"
    else
        error "Failed to encrypt vault file"
        exit 1
    fi
}

# Test vault access
test_vault_access() {
    local vault_file="group_vars/all/vault.yml"
    
    log "Testing vault access..."
    
    if ansible-vault view "$vault_file" > /dev/null 2>&1; then
        success "Vault access test passed"
    else
        error "Vault access test failed"
        exit 1
    fi
}

# Create git ignore entries
update_gitignore() {
    local gitignore_file=".gitignore"
    
    log "Updating .gitignore..."
    
    # Create .gitignore if it doesn't exist
    if [[ ! -f "$gitignore_file" ]]; then
        touch "$gitignore_file"
    fi
    
    # Add entries if they don't exist
    local entries=(
        ".vault_pass"
        "group_vars/all/vault.yml"
        "ansible.log"
        "*.retry"
        "__pycache__/"
        ".terraform/"
        "terraform.tfstate*"
        ".terraform.lock.hcl"
    )
    
    for entry in "${entries[@]}"; do
        if ! grep -q "^$entry$" "$gitignore_file"; then
            echo "$entry" >> "$gitignore_file"
        fi
    done
    
    success ".gitignore updated"
}

# Display next steps
show_next_steps() {
    log "Setup complete! Next steps:"
    echo
    echo "1. Update your configuration:"
    echo "   cp configs/global.yaml.example configs/global.yaml"
    echo "   # Edit configs/global.yaml with your Proxmox details"
    echo
    echo "2. Update your inventory:"
    echo "   cp ansible/inventory/hosts.yml.example ansible/inventory/hosts.yml"
    echo "   # Edit ansible/inventory/hosts.yml with your node details"
    echo
    echo "3. Edit encrypted secrets:"
    echo "   ansible-vault edit group_vars/all/vault.yml"
    echo "   # Update with your actual secrets (Proxmox API token, etc.)"
    echo
    echo "4. Test connectivity:"
    echo "   ansible -m ping proxmox_servers"
    echo
    echo "5. Validate configuration:"
    echo "   ansible-playbook ansible/validate-config.yaml"
    echo
    warning "Remember to:"
    echo "- Back up your .vault_pass file securely"
    echo "- Add your Proxmox API token to the vault"
    echo "- Never commit unencrypted secrets to git"
}

# Main function
main() {
    log "Starting InfraFlux v2.0 Vault Setup"
    
    check_requirements
    generate_ssh_key
    create_vault_password
    create_vault_file
    test_vault_access
    update_gitignore
    show_next_steps
    
    success "Vault setup completed successfully!"
}

# Handle script interruption
trap 'error "Script interrupted"; exit 1' INT TERM

# Check if running from correct directory
if [[ ! -f "ansible.cfg" ]]; then
    error "Please run this script from the InfraFlux project root directory"
    exit 1
fi

# Run main function
main "$@"