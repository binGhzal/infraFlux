#!/bin/bash
set -euo pipefail

# InfraFlux Cleanup Script
# This script removes old deployment files and creates backups

BACKUP_DIR="backup/old-deployments-$(date +%Y%m%d_%H%M%S)"

echo "🧹 Cleaning up old deployment files..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Move old files to backup
if [[ -f "ansible/deploy.yml" ]]; then
    mv ansible/deploy.yml "$BACKUP_DIR/"
    echo "✓ Backed up deploy.yml"
fi

if [[ -f "ansible/deploy-ci.yml" ]]; then
    mv ansible/deploy-ci.yml "$BACKUP_DIR/"
    echo "✓ Backed up deploy-ci.yml"
fi

if [[ -f "ansible/deploy-crunchbits.yml" ]]; then
    mv ansible/deploy-crunchbits.yml "$BACKUP_DIR/"
    echo "✓ Backed up deploy-crunchbits.yml"
fi

if [[ -f "ansible/deploy-speedtesters.yml" ]]; then
    mv ansible/deploy-speedtesters.yml "$BACKUP_DIR/"
    echo "✓ Backed up deploy-speedtesters.yml"
fi

if [[ -f "ansible/reinstall.yml" ]]; then
    mv ansible/reinstall.yml "$BACKUP_DIR/"
    echo "✓ Backed up reinstall.yml"
fi

# Move old group_vars to backup
if [[ -d "ansible/group_vars" ]]; then
    mv ansible/group_vars "$BACKUP_DIR/"
    echo "✓ Backed up group_vars"
fi

# Move old host files to backup
if [[ -f "ansible/hosts.ci" ]]; then
    mv ansible/hosts.ci "$BACKUP_DIR/"
    echo "✓ Backed up hosts.ci"
fi

if [[ -f "ansible/hosts copy.cc" ]]; then
    mv "ansible/hosts copy.cc" "$BACKUP_DIR/"
    echo "✓ Backed up hosts copy.cc"
fi

echo "✅ Cleanup completed! Old files backed up to: $BACKUP_DIR"
echo
echo "🚀 Ready to use new InfraFlux deployment system:"
echo "   1. Run: ./configure.sh"
echo "   2. Run: ./deploy.sh"
