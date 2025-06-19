# InfraFlux v2.0 Configuration Schema Specification

## Overview

This document defines the complete configuration schema for InfraFlux v2.0, including validation rules, data types, and inheritance patterns. The configuration system provides a declarative interface for defining infrastructure, cluster settings, and operational parameters.

## Configuration Architecture

### Configuration Hierarchy

```mermaid
graph TB
    subgraph "Configuration Sources"
        Global[configs/global.yaml]
        Inventory[ansible/inventory/hosts.yml]
        GroupVars[group_vars/]
        HostVars[host_vars/]
        Vault[group_vars/all/vault.yml]
    end
    
    subgraph "Processing"
        Validation[Schema Validation]
        Merge[Variable Merging]
        Template[Template Generation]
    end
    
    subgraph "Output"
        TF[Terraform Configs]
        Talos[Talos Configs]
        K8s[Kubernetes Manifests]
    end
    
    Global --> Validation
    Inventory --> Validation
    GroupVars --> Validation
    HostVars --> Validation
    Vault --> Validation
    
    Validation --> Merge
    Merge --> Template
    Template --> TF
    Template --> Talos
    Template --> K8s
```

### Variable Precedence Order

1. **Command-line variables** (highest precedence)
2. **host_vars/** specific variables
3. **group_vars/** specific variables
4. **group_vars/all/** variables
5. **configs/global.yaml** (lowest precedence)

## Global Configuration Schema

### Root Configuration Structure
```yaml
# configs/global.yaml - Complete schema
---
# Project metadata
project:
  name: "infraflux"
  version: "v2.0"
  environment: "production"  # development, staging, production
  
# Proxmox configuration
proxmox:
  api_url: "https://proxmox.example.com:8006"
  api_user: "root@pam"
  api_token_id: "infraflux"
  api_token_secret: "{{ vault_proxmox_api_token }}"
  node_name: "proxmox-node1"
  
  # Default storage configuration
  storage:
    vm_storage: "local-lvm"
    backup_storage: "backup-nfs"
    template_storage: "local"
    
  # Default network configuration
  network:
    management_bridge: "vmbr0"
    vm_bridge: "vmbr1"
    storage_bridge: "vmbr2"
    
# Cluster configuration
cluster:
  name: "infraflux-cluster"
  type: "talos"  # talos, k3s (future)
  
  # Talos-specific configuration
  talos:
    version: "v1.6.0"
    kubernetes_version: "v1.29.0"
    
    # Custom image factory configuration
    image:
      factory_url: "https://factory.talos.dev"
      schematic_id: "dcac6b92c17d1d8947a0cee5e0e6b6904089aa878c70d66196bb1138dbd05d1a"
      platform: "nocloud"
      architecture: "amd64"
      
    # Cluster networking
    networking:
      cluster_endpoint: "https://k8s.example.com:6443"
      pod_subnet: "10.244.0.0/16"
      service_subnet: "10.96.0.0/12"
      dns_domain: "cluster.local"
      
  # Node configuration templates
  nodes:
    control_plane:
      count: 3
      resources:
        cpu: 8
        memory: 16384  # MB
        disk_size: 100  # GB
        
    workers:
      count: 6
      resources:
        cpu: 16
        memory: 32768  # MB
        disk_size: 200  # GB
        
# Network configuration
network:
  domain: "homelab.local"
  
  dns:
    servers:
      - "1.1.1.1"
      - "8.8.8.8"
    search_domains:
      - "homelab.local"
      - "cluster.local"
      
  ntp:
    servers:
      - "time.cloudflare.com"
      - "pool.ntp.org"
      
  # IP allocation ranges
  ip_ranges:
    management: "192.168.0.0/24"
    kubernetes: "192.168.1.0/24"
    storage: "192.168.2.0/24"
    
  # VLAN configuration (optional)
  vlans:
    enabled: false
    management_vlan: 100
    production_vlan: 200
    development_vlan: 300

# Security configuration
security:
  # SSH configuration
  ssh:
    key_type: "ed25519"
    key_path: "~/.ssh/infraflux"
    
  # Certificate configuration
  certificates:
    ca_key_algorithm: "RSA"
    ca_key_size: 4096
    cert_validity_days: 365
    
  # Encryption settings
  encryption:
    at_rest: true
    in_transit: true
    
# Backup configuration
backup:
  enabled: true
  
  # etcd backup
  etcd:
    schedule: "0 */6 * * *"  # Every 6 hours
    retention_days: 30
    compression: true
    
  # Volume backup
  volumes:
    schedule: "0 2 * * *"    # Daily at 2 AM
    retention_days: 7
    
  # VM backup
  vms:
    schedule: "0 1 * * 0"    # Weekly on Sunday
    retention_weeks: 4
    
  # Backup storage
  storage:
    type: "s3"  # s3, nfs, local
    endpoint: "s3.amazonaws.com"
    bucket: "infraflux-backups"
    region: "us-east-1"

# Monitoring configuration
monitoring:
  enabled: true
  
  # Prometheus configuration
  prometheus:
    retention: "30d"
    storage_size: "50Gi"
    
  # Grafana configuration
  grafana:
    admin_password: "{{ vault_grafana_admin_password }}"
    
  # Loki configuration
  loki:
    retention: "30d"
    storage_size: "100Gi"
    
  # Alerting
  alerting:
    slack_webhook: "{{ vault_slack_webhook }}"
    email_smtp_host: "smtp.gmail.com"
    email_from: "alerts@example.com"

# Application configuration
applications:
  # GitOps configuration
  gitops:
    provider: "fluxcd"  # fluxcd, argocd
    repository: "https://github.com/example/infraflux-apps"
    branch: "main"
    sync_interval: "5m"
    
  # Ingress configuration
  ingress:
    class: "nginx"
    tls_issuer: "letsencrypt-prod"
    
  # Storage configuration
  storage:
    default_class: "longhorn-standard"
    backup_class: "longhorn-backup"
```

## Schema Validation Rules

### Data Type Definitions

#### Basic Types
```yaml
# String validations
string_types:
  hostname:
    pattern: "^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]$"
    max_length: 63
    
  ip_address:
    pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
    validation: "valid_ipv4"
    
  cidr:
    pattern: "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}/[0-9]{1,2}$"
    validation: "valid_cidr"
    
  url:
    pattern: "^https?://[^\\s/$.?#].[^\\s]*$"
    validation: "valid_url"
    
# Numeric validations
numeric_types:
  cpu_cores:
    type: "integer"
    minimum: 1
    maximum: 128
    
  memory_mb:
    type: "integer"
    minimum: 1024
    maximum: 1048576  # 1TB in MB
    
  disk_gb:
    type: "integer"
    minimum: 10
    maximum: 10240    # 10TB in GB
    
  port:
    type: "integer"
    minimum: 1
    maximum: 65535
```

#### Complex Types
```yaml
# Resource specification
resource_spec:
  type: "object"
  properties:
    cpu:
      type: "integer"
      minimum: 1
      maximum: 128
    memory:
      type: "integer"
      minimum: 1024
      maximum: 1048576
    disk_size:
      type: "integer"
      minimum: 10
      maximum: 10240
  required: ["cpu", "memory", "disk_size"]
  
# Network interface specification
network_interface:
  type: "object"
  properties:
    name:
      type: "string"
      pattern: "^[a-zA-Z0-9]+$"
    bridge:
      type: "string"
      pattern: "^vmbr[0-9]+$"
    vlan:
      type: "integer"
      minimum: 1
      maximum: 4094
    ip:
      type: "string"
      format: "ipv4"
  required: ["name", "bridge"]
```

### Validation Schema (JSON Schema)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "InfraFlux v2.0 Configuration Schema",
  "type": "object",
  "properties": {
    "project": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$",
          "minLength": 3,
          "maxLength": 32
        },
        "version": {
          "type": "string",
          "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
        },
        "environment": {
          "type": "string",
          "enum": ["development", "staging", "production"]
        }
      },
      "required": ["name", "version", "environment"]
    },
    "proxmox": {
      "type": "object",
      "properties": {
        "api_url": {
          "type": "string",
          "format": "uri",
          "pattern": "^https://.*:8006$"
        },
        "api_user": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9@._-]+$"
        },
        "api_token_id": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_-]+$"
        },
        "node_name": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9][a-zA-Z0-9-]*$"
        }
      },
      "required": ["api_url", "api_user", "api_token_id", "node_name"]
    },
    "cluster": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string",
          "pattern": "^[a-z][a-z0-9-]*$"
        },
        "type": {
          "type": "string",
          "enum": ["talos", "k3s"]
        },
        "talos": {
          "type": "object",
          "properties": {
            "version": {
              "type": "string",
              "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
            },
            "kubernetes_version": {
              "type": "string",
              "pattern": "^v[0-9]+\\.[0-9]+\\.[0-9]+$"
            }
          },
          "required": ["version", "kubernetes_version"]
        }
      },
      "required": ["name", "type"]
    }
  },
  "required": ["project", "proxmox", "cluster"]
}
```

## Inventory Schema

### Ansible Inventory Structure
```yaml
# ansible/inventory/hosts.yml
all:
  vars:
    # Global variables applied to all hosts
    ansible_user: "root"
    ansible_ssh_private_key_file: "{{ vault_ssh_private_key }}"
    
  children:
    # Proxmox hypervisor nodes
    proxmox_servers:
      hosts:
        proxmox-1:
          ansible_host: "192.168.0.10"
          node_id: 1
          
        proxmox-2:
          ansible_host: "192.168.0.11"
          node_id: 2
          
        proxmox-3:
          ansible_host: "192.168.0.12"
          node_id: 3
          
      vars:
        ansible_user: "root"
        proxmox_datacenter: "datacenter"
        
    # Kubernetes cluster nodes
    kubernetes:
      children:
        # Control plane nodes
        control_plane:
          hosts:
            k8s-cp-1:
              ansible_host: "192.168.1.10"
              talos_role: "controlplane"
              vm_id: 100
              proxmox_node: "proxmox-1"
              
            k8s-cp-2:
              ansible_host: "192.168.1.11"
              talos_role: "controlplane"
              vm_id: 101
              proxmox_node: "proxmox-2"
              
            k8s-cp-3:
              ansible_host: "192.168.1.12"
              talos_role: "controlplane"
              vm_id: 102
              proxmox_node: "proxmox-3"
              
          vars:
            node_type: "control_plane"
            cpu_cores: 8
            memory_mb: 16384
            disk_size_gb: 100
            
        # Worker nodes
        workers:
          hosts:
            k8s-worker-1:
              ansible_host: "192.168.1.20"
              talos_role: "worker"
              vm_id: 200
              proxmox_node: "proxmox-1"
              
            k8s-worker-2:
              ansible_host: "192.168.1.21"
              talos_role: "worker"
              vm_id: 201
              proxmox_node: "proxmox-2"
              
            k8s-worker-3:
              ansible_host: "192.168.1.22"
              talos_role: "worker"
              vm_id: 202
              proxmox_node: "proxmox-3"
              
          vars:
            node_type: "worker"
            cpu_cores: 16
            memory_mb: 32768
            disk_size_gb: 200
            
      vars:
        cluster_name: "{{ cluster.name }}"
        talos_version: "{{ cluster.talos.version }}"
        kubernetes_version: "{{ cluster.talos.kubernetes_version }}"
```

### Inventory Validation Rules

```yaml
# Inventory validation schema
inventory_validation:
  groups:
    proxmox_servers:
      required: true
      min_hosts: 1
      max_hosts: 10
      
    control_plane:
      required: true
      min_hosts: 1
      max_hosts: 7  # Odd numbers for etcd quorum
      hosts_must_be_odd: true
      
    workers:
      required: true
      min_hosts: 1
      max_hosts: 100
      
  host_variables:
    required:
      - "ansible_host"
      - "vm_id"
      - "proxmox_node"
      
    vm_id:
      type: "integer"
      unique: true
      range: [100, 999]
      
    ansible_host:
      type: "ip_address"
      unique: true
      
    proxmox_node:
      type: "string"
      must_exist_in: "proxmox_servers"
```

## Secrets Schema

### Vault Structure
```yaml
# group_vars/all/vault.yml (encrypted with ansible-vault)
---
# Proxmox API credentials
vault_proxmox_api_token: "12345678-1234-1234-1234-123456789abc"

# SSH keys
vault_ssh_private_key: |
  -----BEGIN OPENSSH PRIVATE KEY-----
  b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAFwAAAAdzc2gtcn
  ...
  -----END OPENSSH PRIVATE KEY-----

vault_ssh_public_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJzfFf... user@host"

# Talos cluster secrets
vault_talos_cluster_secret: "abcdef1234567890abcdef1234567890"
vault_talos_machine_token: "1234567890abcdef1234567890abcdef"

# Certificate authority
vault_ca_private_key: |
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  -----END RSA PRIVATE KEY-----

vault_ca_certificate: |
  -----BEGIN CERTIFICATE-----
  MIIDXTCCAkWgAwIBAgIJAK...
  -----END CERTIFICATE-----

# Application secrets
vault_grafana_admin_password: "secure_password_123"
vault_slack_webhook: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"

# Backup credentials
vault_backup_access_key: "AKIAIOSFODNN7EXAMPLE"
vault_backup_secret_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Database passwords
vault_postgres_password: "secure_db_password_456"
vault_redis_password: "secure_redis_password_789"
```

### Secret Validation Rules

```yaml
secret_validation:
  vault_proxmox_api_token:
    type: "string"
    format: "uuid"
    required: true
    
  vault_ssh_private_key:
    type: "string"
    format: "ssh_private_key"
    required: true
    
  vault_ssh_public_key:
    type: "string"
    format: "ssh_public_key"
    required: true
    must_match: "vault_ssh_private_key"
    
  vault_talos_cluster_secret:
    type: "string"
    format: "hex"
    length: 32
    required: true
    
  vault_ca_private_key:
    type: "string"
    format: "pem_private_key"
    required: true
    
  vault_ca_certificate:
    type: "string"
    format: "pem_certificate"
    required: true
    must_match: "vault_ca_private_key"
```

## Configuration Validation

### Validation Implementation

#### Ansible Validation Playbook
```yaml
# ansible/validate-config.yaml
---
- name: "Validate InfraFlux Configuration"
  hosts: localhost
  gather_facts: false
  
  tasks:
    - name: "Load configuration schema"
      set_fact:
        config_schema: "{{ lookup('file', 'docs/specs/config-schema.json') | from_json }}"
        
    - name: "Load current configuration"
      set_fact:
        current_config: "{{ lookup('file', 'configs/global.yaml') | from_yaml }}"
        
    - name: "Validate configuration against schema"
      jsonschema:
        data: "{{ current_config }}"
        schema: "{{ config_schema }}"
      register: validation_result
      
    - name: "Display validation results"
      debug:
        msg: "Configuration validation: {{ 'PASSED' if validation_result.valid else 'FAILED' }}"
        
    - name: "Display validation errors"
      debug:
        msg: "Validation errors: {{ validation_result.errors }}"
      when: not validation_result.valid
      
    - name: "Fail if validation errors"
      fail:
        msg: "Configuration validation failed"
      when: not validation_result.valid
```

#### Python Validation Script
```python
#!/usr/bin/env python3
# scripts/validate-config.py

import yaml
import jsonschema
import sys
import os

def load_schema(schema_file):
    """Load JSON schema from file"""
    with open(schema_file, 'r') as f:
        return json.load(f)

def load_config(config_file):
    """Load YAML configuration from file"""
    with open(config_file, 'r') as f:
        return yaml.safe_load(f)

def validate_config(config, schema):
    """Validate configuration against schema"""
    try:
        jsonschema.validate(config, schema)
        return True, []
    except jsonschema.ValidationError as e:
        return False, [str(e)]
    except jsonschema.SchemaError as e:
        return False, [f"Schema error: {str(e)}"]

def main():
    """Main validation function"""
    schema_file = "docs/specs/config-schema.json"
    config_file = "configs/global.yaml"
    
    if not os.path.exists(schema_file):
        print(f"Error: Schema file {schema_file} not found")
        sys.exit(1)
        
    if not os.path.exists(config_file):
        print(f"Error: Config file {config_file} not found")
        sys.exit(1)
    
    schema = load_schema(schema_file)
    config = load_config(config_file)
    
    is_valid, errors = validate_config(config, schema)
    
    if is_valid:
        print("✅ Configuration validation PASSED")
        sys.exit(0)
    else:
        print("❌ Configuration validation FAILED")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

### Configuration Testing

#### Unit Tests for Configuration
```yaml
# tests/config-validation-tests.yaml
---
- name: "Configuration Validation Tests"
  hosts: localhost
  gather_facts: false
  
  vars:
    test_configs:
      - name: "minimal_valid_config"
        config:
          project:
            name: "test"
            version: "v2.0"
            environment: "development"
          proxmox:
            api_url: "https://test.example.com:8006"
            api_user: "root@pam"
            api_token_id: "test"
            node_name: "test-node"
          cluster:
            name: "test-cluster"
            type: "talos"
        expected: "valid"
        
      - name: "invalid_project_name"
        config:
          project:
            name: "Invalid Name With Spaces"
            version: "v2.0"
            environment: "development"
        expected: "invalid"
        
  tasks:
    - name: "Run validation tests"
      include_tasks: "test-config-validation.yaml"
      vars:
        test_config: "{{ item.config }}"
        test_name: "{{ item.name }}"
        expected_result: "{{ item.expected }}"
      loop: "{{ test_configs }}"
```

## Configuration Templates

### Environment-Specific Templates

#### Development Environment Template
```yaml
# templates/development.yaml
project:
  name: "infraflux-dev"
  version: "v2.0"
  environment: "development"
  
cluster:
  nodes:
    control_plane:
      count: 1
      resources:
        cpu: 4
        memory: 8192
        disk_size: 50
        
    workers:
      count: 2
      resources:
        cpu: 4
        memory: 8192
        disk_size: 50

backup:
  enabled: false
  
monitoring:
  prometheus:
    retention: "7d"
    storage_size: "10Gi"
```

#### Production Environment Template
```yaml
# templates/production.yaml
project:
  name: "infraflux-prod"
  version: "v2.0"
  environment: "production"
  
cluster:
  nodes:
    control_plane:
      count: 3
      resources:
        cpu: 8
        memory: 16384
        disk_size: 100
        
    workers:
      count: 6
      resources:
        cpu: 16
        memory: 32768
        disk_size: 200

backup:
  enabled: true
  
monitoring:
  prometheus:
    retention: "30d"
    storage_size: "100Gi"
```

### Configuration Generation

#### Template Generation Script
```bash
#!/bin/bash
# scripts/generate-config.sh

set -euo pipefail

ENVIRONMENT=${1:-development}
OUTPUT_FILE="configs/global.yaml"
TEMPLATE_FILE="templates/${ENVIRONMENT}.yaml"

if [[ ! -f "$TEMPLATE_FILE" ]]; then
    echo "Error: Template file $TEMPLATE_FILE not found"
    exit 1
fi

echo "Generating configuration for environment: $ENVIRONMENT"

# Copy template to output file
cp "$TEMPLATE_FILE" "$OUTPUT_FILE"

# Validate generated configuration
python3 scripts/validate-config.py

echo "Configuration generated successfully: $OUTPUT_FILE"
echo "Remember to:"
echo "  1. Update vault secrets in group_vars/all/vault.yml"
echo "  2. Update inventory in ansible/inventory/hosts.yml"
echo "  3. Review and customize the configuration"
```

This configuration schema specification provides a comprehensive foundation for managing all configuration aspects of the InfraFlux v2.0 project with proper validation and type safety.