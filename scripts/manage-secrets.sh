#!/bin/bash
# InfraFlux v2.0 - Sealed Secrets Management
# Generate and manage encrypted secrets safe for Git commits

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SECRETS_DIR="${PROJECT_ROOT}/config"
SEALED_SECRETS_PUBLIC_KEY="${SECRETS_DIR}/sealed-secrets-public.pem"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    cat << EOF
InfraFlux v2.0 - Sealed Secrets Management

Usage: $0 <command> [options]

Commands:
  init                 Initialize sealed secrets system
  seal <secret-file>   Seal a secret file for Git commits
  create-template      Create secrets template for user input
  validate             Validate sealed secrets
  install              Install sealed secrets to cluster
  status               Show sealed secrets status

Examples:
  $0 init                              # First-time setup
  $0 create-template                   # Create secrets template
  $0 seal config/secrets-raw.yaml     # Seal your secrets
  $0 install                           # Install to cluster
  $0 status                            # Check status

Safe for Git: Sealed secrets are encrypted and safe to commit!
EOF
}

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

check_prerequisites() {
    if ! command -v kubeseal &> /dev/null; then
        error "kubeseal not found. Install with: brew install kubeseal (macOS) or download from GitHub releases"
    fi
    
    if ! command -v kubectl &> /dev/null; then
        error "kubectl not found. Please install kubectl"
    fi
}

init_sealed_secrets() {
    log "Initializing sealed secrets system..."
    
    # Check if cluster is available
    if ! kubectl cluster-info &> /dev/null; then
        warn "Kubernetes cluster not available. Run this after cluster deployment."
        warn "For now, creating local setup only."
    fi
    
    # Create sealed secrets namespace manifest
    cat > "${SECRETS_DIR}/sealed-secrets-namespace.yaml" << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: sealed-secrets
  labels:
    name: sealed-secrets
    app.kubernetes.io/name: sealed-secrets
    app.kubernetes.io/part-of: infraflux
EOF

    # Create sealed secrets controller manifest
    cat > "${SECRETS_DIR}/sealed-secrets-controller.yaml" << 'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sealed-secrets-controller
  namespace: sealed-secrets
  labels:
    name: sealed-secrets-controller
    app.kubernetes.io/name: sealed-secrets
    app.kubernetes.io/component: controller
spec:
  replicas: 1
  selector:
    matchLabels:
      name: sealed-secrets-controller
  template:
    metadata:
      labels:
        name: sealed-secrets-controller
    spec:
      serviceAccountName: sealed-secrets-controller
      containers:
      - name: sealed-secrets-controller
        image: quay.io/bitnami/sealed-secrets-controller:v0.24.5
        command:
        - controller
        args:
        - --update-status
        - --key-renew-period=720h
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: metrics
        securityContext:
          allowPrivilegeEscalation: false
          capabilities:
            drop:
            - ALL
          readOnlyRootFilesystem: true
          runAsNonRoot: true
          runAsUser: 1001
        volumeMounts:
        - mountPath: /tmp
          name: tmp
      volumes:
      - name: tmp
        emptyDir: {}
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sealed-secrets-controller
  namespace: sealed-secrets
  labels:
    name: sealed-secrets-controller
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sealed-secrets-controller
  labels:
    name: sealed-secrets-controller
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list", "create", "update", "delete"]
- apiGroups: ["bitnami.com"]
  resources: ["sealedsecrets"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sealed-secrets-controller
  labels:
    name: sealed-secrets-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sealed-secrets-controller
subjects:
- kind: ServiceAccount
  name: sealed-secrets-controller
  namespace: sealed-secrets
---
apiVersion: v1
kind: Service
metadata:
  name: sealed-secrets-controller
  namespace: sealed-secrets
  labels:
    name: sealed-secrets-controller
spec:
  ports:
  - name: http
    port: 8080
    targetPort: 8080
  selector:
    name: sealed-secrets-controller
EOF

    log "✅ Sealed secrets manifests created"
    log "📋 Next steps:"
    log "   1. Deploy your cluster with: ./deploy.sh config/cluster.yaml"
    log "   2. Install sealed secrets: $0 install"
    log "   3. Create secrets template: $0 create-template"
    log "   4. Edit and seal your secrets: $0 seal config/secrets-raw.yaml"
}

create_secrets_template() {
    local template_file="${SECRETS_DIR}/secrets-raw.yaml"
    
    if [[ -f "$template_file" ]]; then
        warn "Template already exists: $template_file"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Aborted"
            return
        fi
    fi
    
    cat > "$template_file" << 'EOF'
# InfraFlux v2.0 - Raw Secrets Template
# Fill in your actual values, then run: ./scripts/manage-secrets.sh seal config/secrets-raw.yaml
# NEVER commit this file to Git!

apiVersion: v1
kind: Secret
metadata:
  name: infraflux-secrets
  namespace: infraflux-system
type: Opaque
stringData:
  # Proxmox credentials (choose one method)
  proxmox-password: "YOUR_PROXMOX_PASSWORD_HERE"
  # OR use API token (recommended)
  # proxmox-api-token-id: "root@pam!infraflux"
  # proxmox-api-token-secret: "YOUR_API_TOKEN_SECRET_HERE"
  
  # GitOps credentials (optional)
  github-token: "ghp_YOUR_GITHUB_TOKEN_HERE"
  gitlab-token: "YOUR_GITLAB_TOKEN_HERE"
  git-ssh-key: |
    -----BEGIN OPENSSH PRIVATE KEY-----
    YOUR_SSH_PRIVATE_KEY_HERE
    -----END OPENSSH PRIVATE KEY-----
  
  # External integrations (optional)
  slack-webhook: "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
  email-smtp-password: "YOUR_EMAIL_PASSWORD_HERE"
  pagerduty-integration-key: "YOUR_PAGERDUTY_KEY_HERE"
  
  # Storage and backup (optional)
  backup-encryption-key: "YOUR_32_CHAR_ENCRYPTION_KEY_HERE"
  s3-access-key: "YOUR_S3_ACCESS_KEY"
  s3-secret-key: "YOUR_S3_SECRET_KEY"
EOF

    log "✅ Secrets template created: $template_file"
    log "🔒 IMPORTANT: This file contains sensitive data!"
    log "📝 Steps:"
    log "   1. Edit $template_file with your actual secrets"
    log "   2. Run: $0 seal $template_file"
    log "   3. Delete the raw file: rm $template_file"
    log "   4. Commit the sealed version to Git"
}

seal_secrets() {
    local raw_file="$1"
    
    if [[ ! -f "$raw_file" ]]; then
        error "Raw secrets file not found: $raw_file"
    fi
    
    check_prerequisites
    
    # Check if we have a cluster available for getting the public key
    if kubectl cluster-info &> /dev/null; then
        log "Getting public key from cluster..."
        kubeseal --fetch-cert > "$SEALED_SECRETS_PUBLIC_KEY"
    elif [[ ! -f "$SEALED_SECRETS_PUBLIC_KEY" ]]; then
        warn "No cluster available and no public key found"
        log "Creating placeholder public key - you'll need to re-seal after cluster deployment"
        # Create a placeholder - user will need to re-seal after cluster is up
        echo "# Placeholder - replace with actual public key from cluster" > "$SEALED_SECRETS_PUBLIC_KEY"
    fi
    
    local sealed_file="${raw_file%.yaml}-sealed.yaml"
    
    log "Sealing secrets from $raw_file to $sealed_file..."
    
    if [[ -f "$SEALED_SECRETS_PUBLIC_KEY" ]] && [[ $(head -1 "$SEALED_SECRETS_PUBLIC_KEY") != "# Placeholder"* ]]; then
        kubeseal --format=yaml --cert="$SEALED_SECRETS_PUBLIC_KEY" < "$raw_file" > "$sealed_file"
        log "✅ Secrets sealed successfully!"
        log "🔒 Sealed file: $sealed_file (safe to commit to Git)"
        log "⚠️  Raw file: $raw_file (DELETE this file!)"
        
        # Offer to delete the raw file
        read -p "Delete the raw secrets file? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm "$raw_file"
            log "✅ Raw secrets file deleted"
        else
            warn "Remember to delete $raw_file manually!"
        fi
    else
        error "Cannot seal secrets without valid public key. Deploy cluster first, then run: $0 install"
    fi
}

install_sealed_secrets() {
    check_prerequisites
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Kubernetes cluster not available. Deploy cluster first."
    fi
    
    log "Installing sealed secrets controller..."
    
    # Apply manifests
    kubectl apply -f "${SECRETS_DIR}/sealed-secrets-namespace.yaml"
    kubectl apply -f "${SECRETS_DIR}/sealed-secrets-controller.yaml"
    
    # Wait for controller to be ready
    log "Waiting for sealed secrets controller..."
    kubectl wait --for=condition=available --timeout=300s deployment/sealed-secrets-controller -n sealed-secrets
    
    # Fetch the public key
    log "Fetching public key..."
    kubeseal --fetch-cert > "$SEALED_SECRETS_PUBLIC_KEY"
    
    log "✅ Sealed secrets controller installed successfully!"
    log "🔑 Public key saved: $SEALED_SECRETS_PUBLIC_KEY"
    log "📝 You can now seal secrets with: $0 seal config/secrets-raw.yaml"
}

validate_sealed_secrets() {
    check_prerequisites
    
    if ! kubectl cluster-info &> /dev/null; then
        error "Kubernetes cluster not available"
    fi
    
    log "Validating sealed secrets..."
    
    # Check controller status
    if kubectl get deployment sealed-secrets-controller -n sealed-secrets &> /dev/null; then
        log "✅ Sealed secrets controller is deployed"
        
        # Check if it's running
        if kubectl get pods -n sealed-secrets -l name=sealed-secrets-controller | grep Running &> /dev/null; then
            log "✅ Sealed secrets controller is running"
        else
            warn "Sealed secrets controller is not running"
            kubectl get pods -n sealed-secrets -l name=sealed-secrets-controller
        fi
    else
        warn "Sealed secrets controller not found"
    fi
    
    # Check for sealed secrets
    local sealed_secrets=$(kubectl get sealedsecrets --all-namespaces --no-headers 2>/dev/null | wc -l)
    log "📊 Found $sealed_secrets sealed secret(s) in cluster"
}

show_status() {
    log "InfraFlux v2.0 - Sealed Secrets Status"
    log "=================================="
    
    # Check local files
    if [[ -f "$SEALED_SECRETS_PUBLIC_KEY" ]]; then
        log "✅ Public key: $SEALED_SECRETS_PUBLIC_KEY"
    else
        warn "❌ Public key not found"
    fi
    
    if [[ -f "${SECRETS_DIR}/sealed-secrets-controller.yaml" ]]; then
        log "✅ Controller manifests ready"
    else
        warn "❌ Controller manifests not found - run: $0 init"
    fi
    
    # Check cluster status
    if kubectl cluster-info &> /dev/null; then
        log "✅ Cluster accessible"
        validate_sealed_secrets
    else
        warn "❌ Cluster not accessible"
    fi
    
    # Check for raw secrets (should be deleted)
    if [[ -f "${SECRETS_DIR}/secrets-raw.yaml" ]]; then
        warn "⚠️  Raw secrets file found: ${SECRETS_DIR}/secrets-raw.yaml"
        warn "    Remember to delete this after sealing!"
    fi
    
    # Check for sealed secrets
    local sealed_files=$(find "$SECRETS_DIR" -name "*-sealed.yaml" | wc -l)
    log "📊 Found $sealed_files sealed secret file(s)"
}

main() {
    case "${1:-}" in
        "init")
            init_sealed_secrets
            ;;
        "seal")
            if [[ -z "${2:-}" ]]; then
                error "Usage: $0 seal <secret-file>"
            fi
            seal_secrets "$2"
            ;;
        "create-template")
            create_secrets_template
            ;;
        "install")
            install_sealed_secrets
            ;;
        "validate")
            validate_sealed_secrets
            ;;
        "status")
            show_status
            ;;
        "help"|"--help"|"-h")
            usage
            ;;
        *)
            error "Unknown command: ${1:-}. Use '$0 help' for usage."
            ;;
    esac
}

main "$@"