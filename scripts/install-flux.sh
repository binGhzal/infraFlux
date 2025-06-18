#!/bin/bash
# InfraFlux Flux CLI Installation Script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}==>${NC} ${1}"
}

print_success() {
    echo -e "${GREEN}✓${NC} ${1}"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} ${1}"
}

print_error() {
    echo -e "${RED}✗${NC} ${1}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root"
   exit 1
fi

print_step "Installing Flux CLI..."

# Detect OS and architecture
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case $ARCH in
    x86_64) ARCH="amd64" ;;
    aarch64) ARCH="arm64" ;;
    armv7l) ARCH="arm" ;;
    *) print_error "Unsupported architecture: $ARCH"; exit 1 ;;
esac

# Download and install Flux CLI
FLUX_VERSION="v2.2.3"
FLUX_URL="https://github.com/fluxcd/flux2/releases/download/${FLUX_VERSION}/flux_${FLUX_VERSION#v}_${OS}_${ARCH}.tar.gz"

print_step "Downloading Flux CLI ${FLUX_VERSION} for ${OS}/${ARCH}..."
curl -sL "$FLUX_URL" | tar xz

print_step "Installing Flux CLI to /usr/local/bin..."
sudo mv flux /usr/local/bin/

print_success "Flux CLI installed successfully!"

# Verify installation
print_step "Verifying Flux CLI installation..."
flux version --client

print_step "Checking Flux prerequisites..."
flux check --pre

print_step "Installing Flux controllers to cluster..."
flux install

print_step "Waiting for Flux controllers to be ready..."
kubectl wait --for=condition=ready pod -l app=source-controller -n flux-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=kustomize-controller -n flux-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=helm-controller -n flux-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=notification-controller -n flux-system --timeout=300s

print_success "Flux controllers are ready!"

print_step "Creating sealed-secrets controller..."
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

print_step "Waiting for sealed-secrets controller to be ready..."
kubectl wait --for=condition=ready pod -l name=sealed-secrets-controller -n kube-system --timeout=300s

print_success "Sealed Secrets controller is ready!"

print_step "Installing kubeseal CLI..."
KUBESEAL_VERSION="v0.24.0"
KUBESEAL_URL="https://github.com/bitnami-labs/sealed-secrets/releases/download/${KUBESEAL_VERSION}/kubeseal-${KUBESEAL_VERSION#v}-${OS}-${ARCH}.tar.gz"

curl -sL "$KUBESEAL_URL" | tar xz
sudo mv kubeseal /usr/local/bin/

print_success "kubeseal CLI installed successfully!"

# Verify kubeseal installation
print_step "Verifying kubeseal installation..."
kubeseal --version

print_success "🎉 Flux and Sealed Secrets setup complete!"
echo
echo "Next steps:"
echo "1. Create GitRepository: kubectl apply -f cluster/base/gitops/flux-system.yaml"
echo "2. Monitor deployment: flux get kustomizations --watch"
echo "3. Check sealed secrets: kubectl get sealedsecrets -A"
echo
echo "Useful commands:"
echo "  flux get sources git"
echo "  flux get kustomizations"
echo "  flux logs --follow --tail=10"
echo "  kubeseal --fetch-cert > pub-sealed-secrets.pem"