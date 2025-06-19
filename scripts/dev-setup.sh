#!/bin/bash
# InfraFlux v2.0 Development Environment Setup Script
# This script sets up the complete development environment for InfraFlux

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

# Check if we're in the right directory
check_directory() {
    if [[ ! -f "ansible.cfg" ]] || [[ ! -f "requirements.txt" ]]; then
        error "Please run this script from the InfraFlux project root directory"
        exit 1
    fi
}

# Check system requirements
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check Python version
    if ! command -v python3 &> /dev/null; then
        error "Python 3 is required but not installed"
        exit 1
    fi
    
    local python_version
    python_version=$(python3 --version | cut -d' ' -f2)
    log "Python version: $python_version"
    
    # Check if version is >= 3.9
    if ! python3 -c "import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)"; then
        error "Python 3.9 or higher is required"
        exit 1
    fi
    
    # Check for required system tools
    local required_tools=("git" "ssh" "curl" "tar" "gzip")
    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            error "$tool is required but not installed"
            exit 1
        fi
    done
    
    success "System requirements check passed"
}

# Set up Python virtual environment
setup_python_env() {
    log "Setting up Python virtual environment..."
    
    local venv_dir="venv"
    
    if [[ -d "$venv_dir" ]]; then
        warning "Virtual environment already exists"
        read -p "Do you want to recreate it? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$venv_dir"
        else
            log "Using existing virtual environment"
            return 0
        fi
    fi
    
    # Create virtual environment
    python3 -m venv "$venv_dir"
    
    # Activate virtual environment
    source "$venv_dir/bin/activate"
    
    # Upgrade pip
    log "Upgrading pip..."
    pip install --upgrade pip
    
    # Install Python dependencies
    log "Installing Python dependencies..."
    pip install -r requirements.txt
    
    success "Python environment setup complete"
}

# Install Ansible collections
install_ansible_collections() {
    log "Installing Ansible collections..."
    
    # Activate virtual environment if it exists
    if [[ -d "venv" ]]; then
        source venv/bin/activate
    fi
    
    # Install collections
    ansible-galaxy collection install -r ansible/collections/requirements.yaml --force
    
    success "Ansible collections installed"
}

# Install Terraform (if not already installed)
install_terraform() {
    log "Checking Terraform installation..."
    
    if command -v terraform &> /dev/null; then
        local tf_version
        tf_version=$(terraform version -json | jq -r '.terraform_version')
        log "Terraform already installed: v$tf_version"
        return 0
    fi
    
    log "Installing Terraform..."
    
    # Detect OS and architecture
    local os arch tf_url
    
    case "$(uname -s)" in
        Darwin)
            os="darwin"
            ;;
        Linux)
            os="linux"
            ;;
        *)
            error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    case "$(uname -m)" in
        x86_64)
            arch="amd64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            error "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
    
    # Download and install Terraform
    local tf_version="1.6.6"
    tf_url="https://releases.hashicorp.com/terraform/${tf_version}/terraform_${tf_version}_${os}_${arch}.zip"
    
    local temp_dir
    temp_dir=$(mktemp -d)
    
    log "Downloading Terraform from $tf_url"
    curl -L -o "$temp_dir/terraform.zip" "$tf_url"
    
    # Extract and install
    unzip -q "$temp_dir/terraform.zip" -d "$temp_dir"
    
    # Install to /usr/local/bin (requires sudo) or ~/bin
    if [[ -w "/usr/local/bin" ]]; then
        mv "$temp_dir/terraform" "/usr/local/bin/"
    else
        mkdir -p "$HOME/bin"
        mv "$temp_dir/terraform" "$HOME/bin/"
        warning "Terraform installed to ~/bin. Make sure ~/bin is in your PATH"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Terraform installed successfully"
}

# Install Packer (if not already installed)
install_packer() {
    log "Checking Packer installation..."
    
    if command -v packer &> /dev/null; then
        local packer_version
        packer_version=$(packer version | head -n1 | cut -d' ' -f2)
        log "Packer already installed: $packer_version"
        return 0
    fi
    
    log "Installing Packer..."
    
    # Detect OS and architecture
    local os arch packer_url
    
    case "$(uname -s)" in
        Darwin)
            os="darwin"
            ;;
        Linux)
            os="linux"
            ;;
        *)
            error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    case "$(uname -m)" in
        x86_64)
            arch="amd64"
            ;;
        arm64|aarch64)
            arch="arm64"
            ;;
        *)
            error "Unsupported architecture: $(uname -m)"
            exit 1
            ;;
    esac
    
    # Download and install Packer
    local packer_version="1.9.4"
    packer_url="https://releases.hashicorp.com/packer/${packer_version}/packer_${packer_version}_${os}_${arch}.zip"
    
    local temp_dir
    temp_dir=$(mktemp -d)
    
    log "Downloading Packer from $packer_url"
    curl -L -o "$temp_dir/packer.zip" "$packer_url"
    
    # Extract and install
    unzip -q "$temp_dir/packer.zip" -d "$temp_dir"
    
    # Install to /usr/local/bin (requires sudo) or ~/bin
    if [[ -w "/usr/local/bin" ]]; then
        mv "$temp_dir/packer" "/usr/local/bin/"
    else
        mkdir -p "$HOME/bin"
        mv "$temp_dir/packer" "$HOME/bin/"
        warning "Packer installed to ~/bin. Make sure ~/bin is in your PATH"
    fi
    
    # Cleanup
    rm -rf "$temp_dir"
    
    success "Packer installed successfully"
}

# Install kubectl (if not already installed)
install_kubectl() {
    log "Checking kubectl installation..."
    
    if command -v kubectl &> /dev/null; then
        local kubectl_version
        kubectl_version=$(kubectl version --client --short 2>/dev/null | cut -d' ' -f3)
        log "kubectl already installed: $kubectl_version"
        return 0
    fi
    
    log "Installing kubectl..."
    
    # Download kubectl
    local kubectl_version
    kubectl_version=$(curl -L -s https://dl.k8s.io/release/stable.txt)
    
    case "$(uname -s)" in
        Darwin)
            local kubectl_url="https://dl.k8s.io/release/$kubectl_version/bin/darwin/amd64/kubectl"
            ;;
        Linux)
            local kubectl_url="https://dl.k8s.io/release/$kubectl_version/bin/linux/amd64/kubectl"
            ;;
        *)
            error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    # Download and install
    if [[ -w "/usr/local/bin" ]]; then
        curl -L "$kubectl_url" -o "/usr/local/bin/kubectl"
        chmod +x "/usr/local/bin/kubectl"
    else
        mkdir -p "$HOME/bin"
        curl -L "$kubectl_url" -o "$HOME/bin/kubectl"
        chmod +x "$HOME/bin/kubectl"
        warning "kubectl installed to ~/bin. Make sure ~/bin is in your PATH"
    fi
    
    success "kubectl installed successfully"
}

# Install talosctl (if not already installed)
install_talosctl() {
    log "Checking talosctl installation..."
    
    if command -v talosctl &> /dev/null; then
        local talos_version
        talos_version=$(talosctl version --client --short 2>/dev/null || echo "unknown")
        log "talosctl already installed: $talos_version"
        return 0
    fi
    
    log "Installing talosctl..."
    
    # Download talosctl
    local talos_version="v1.6.0"
    
    case "$(uname -s)" in
        Darwin)
            local talos_url="https://github.com/siderolabs/talos/releases/download/$talos_version/talosctl-darwin-amd64"
            ;;
        Linux)
            local talos_url="https://github.com/siderolabs/talos/releases/download/$talos_version/talosctl-linux-amd64"
            ;;
        *)
            error "Unsupported operating system: $(uname -s)"
            exit 1
            ;;
    esac
    
    # Download and install
    if [[ -w "/usr/local/bin" ]]; then
        curl -L "$talos_url" -o "/usr/local/bin/talosctl"
        chmod +x "/usr/local/bin/talosctl"
    else
        mkdir -p "$HOME/bin"
        curl -L "$talos_url" -o "$HOME/bin/talosctl"
        chmod +x "$HOME/bin/talosctl"
        warning "talosctl installed to ~/bin. Make sure ~/bin is in your PATH"
    fi
    
    success "talosctl installed successfully"
}

# Set up pre-commit hooks
setup_pre_commit() {
    log "Setting up pre-commit hooks..."
    
    # Activate virtual environment
    if [[ -d "venv" ]]; then
        source venv/bin/activate
    fi
    
    # Install pre-commit if not already installed
    if ! command -v pre-commit &> /dev/null; then
        pip install pre-commit
    fi
    
    # Create pre-commit configuration
    cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict
      
  - repo: https://github.com/ansible/ansible-lint
    rev: v6.14.3
    hooks:
      - id: ansible-lint
        files: \.(yaml|yml)$
        
  - repo: https://github.com/adrienverge/yamllint
    rev: v1.29.0
    hooks:
      - id: yamllint
        args: [-c=.yamllint.yaml]
        
  - repo: https://github.com/psf/black
    rev: 23.1.0
    hooks:
      - id: black
        language_version: python3
EOF

    # Create yamllint configuration
    cat > .yamllint.yaml << 'EOF'
extends: default

rules:
  line-length:
    max: 120
  comments:
    min-spaces-from-content: 1
  indentation:
    spaces: 2
EOF

    # Install pre-commit hooks
    pre-commit install
    
    success "Pre-commit hooks setup complete"
}

# Create useful development scripts
create_dev_scripts() {
    log "Creating development utility scripts..."
    
    mkdir -p scripts
    
    # Create validation script
    cat > scripts/validate.sh << 'EOF'
#!/bin/bash
# Validate all configurations and run tests

set -e

echo "🔍 Validating configuration..."
ansible-playbook ansible/playbooks/validate-config.yaml

echo "🧪 Running pre-commit checks..."
pre-commit run --all-files

echo "✅ All validations passed!"
EOF
    
    # Create deployment script
    cat > scripts/deploy.sh << 'EOF'
#!/bin/bash
# Deploy InfraFlux infrastructure

set -e

echo "🚀 Starting InfraFlux deployment..."

# Validate configuration first
./scripts/validate.sh

# Test connectivity
echo "🔌 Testing Proxmox connectivity..."
ansible-playbook ansible/playbooks/test-proxmox-connection.yaml

# Run deployment
echo "🏗️ Deploying infrastructure..."
ansible-playbook ansible/deploy.yaml

echo "✅ Deployment complete!"
EOF
    
    # Create cleanup script
    cat > scripts/cleanup.sh << 'EOF'
#!/bin/bash
# Clean up development environment

set -e

echo "🧹 Cleaning up development environment..."

# Remove Python cache
find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
find . -name "*.pyc" -delete 2>/dev/null || true

# Remove Ansible cache
rm -rf ~/.ansible/tmp/* 2>/dev/null || true

# Remove logs
rm -f ansible.log

echo "✅ Cleanup complete!"
EOF
    
    # Make scripts executable
    chmod +x scripts/*.sh
    
    success "Development scripts created"
}

# Update .gitignore
update_gitignore() {
    log "Updating .gitignore..."
    
    cat > .gitignore << 'EOF'
# InfraFlux specific
.vault_pass
group_vars/all/vault.yml
configs/global.yaml
ansible/inventory/hosts.yml

# Logs
ansible.log
*.log

# Python
venv/
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Terraform
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl

# SSH keys
*.pem
*.key
id_*

# OS specific
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary files
*.tmp
*.temp
.cache/

# Backup files
*.bak
*.backup

# Test results
.pytest_cache/
test-results/
coverage.xml
*.cover
.coverage

# Pre-commit
.pre-commit-config.yaml.backup
EOF
    
    success ".gitignore updated"
}

# Display completion message
show_completion_message() {
    log "Development environment setup complete!"
    echo
    echo "🎉 InfraFlux v2.0 Development Environment Ready!"
    echo "================================================="
    echo
    echo "Next steps:"
    echo "1. Activate Python environment: source venv/bin/activate"
    echo "2. Set up secrets: ./scripts/setup-vault.sh"
    echo "3. Configure your environment:"
    echo "   - Copy configs/global.yaml.example to configs/global.yaml"
    echo "   - Copy ansible/inventory/hosts.yml.example to ansible/inventory/hosts.yml"
    echo "   - Edit both files with your specific configuration"
    echo "4. Validate configuration: ./scripts/validate.sh"
    echo "5. Test connectivity: ansible-playbook ansible/playbooks/test-proxmox-connection.yaml"
    echo "6. Deploy infrastructure: ./scripts/deploy.sh"
    echo
    echo "Useful commands:"
    echo "- Activate environment: source venv/bin/activate"
    echo "- Validate config: ./scripts/validate.sh"
    echo "- Test connectivity: ansible -m ping proxmox_servers"
    echo "- Deploy: ./scripts/deploy.sh"
    echo "- Clean up: ./scripts/cleanup.sh"
    echo
    echo "Documentation: docs/"
    echo "Examples: Check *.example files"
    echo
    success "Happy coding! 🚀"
}

# Main execution
main() {
    log "Starting InfraFlux v2.0 development environment setup"
    
    check_directory
    check_system_requirements
    setup_python_env
    install_ansible_collections
    install_terraform
    install_packer
    install_kubectl
    install_talosctl
    setup_pre_commit
    create_dev_scripts
    update_gitignore
    show_completion_message
}

# Handle script interruption
trap 'error "Setup interrupted"; exit 1' INT TERM

# Run main function
main "$@"
EOF