# InfraFlux v2.0 Implementation Plan - Detailed Tracking

## Overview

Complete overhaul of InfraFlux to follow production-grade patterns from the example implementation.

**Key Goals:**

- ✅ One-command deployment maintained
- ✅ Eliminate Proxmox CSI in favor of Longhorn distributed storage
- ✅ Mandatory Sealed Secrets for production security
- ✅ Advanced Talos Image Factory integration
- ✅ Clean Terraform patterns (no .env parsing in templates)

## **Phase 1: Terraform Foundation (4 tasks)**

### TODO-001: Remove environment parsing from Terraform templates ✅ COMPLETED

- [x] Remove `lookup('file', '../config/.env')` calls from terraform-main.tf.j2
- [x] Replace with standard `var.proxmox.api_token_id` references
- [ ] Test template generation with placeholder variables

### TODO-002: Create Terraform variables structure

- [ ] Create `playbooks/templates/terraform-variables.tf.j2` template
- [ ] Define proxmox variable object with all required fields
- [ ] Define cluster, nodes, and image variables following example pattern

### TODO-003: Implement .env parser Ansible task

- [ ] Create `playbooks/tasks/parse-env.yml` task
- [ ] Parse config/.env into Ansible variables dict
- [ ] Handle quoted values and special characters properly

### TODO-004: Generate .tfvars from parsed .env

- [ ] Create `playbooks/templates/proxmox.auto.tfvars.j2` template
- [ ] Generate from parsed .env variables
- [ ] Test Terraform variable loading

## **Phase 2: Talos Image Factory (5 tasks)**

### TODO-005: Create schematic configuration

- [ ] Create `playbooks/templates/talos-schematic.yaml.j2`
- [ ] Include QEMU guest agent, Intel microcode, iGPU drivers
- [ ] Make schematic customizable via cluster config

### TODO-006: Implement schematic submission

- [ ] Create HTTP POST task to factory.talos.dev/schematics
- [ ] Parse schematic ID from JSON response
- [ ] Store schematic ID for image download

### TODO-007: Create image download Terraform resource

- [ ] Add `proxmox_virtual_environment_download_file` to template
- [ ] Use factory URL with schematic ID and version
- [ ] Support multiple Proxmox nodes and storage backends

### TODO-008: Implement rolling update support

- [ ] Add update_version and update_schematic variables
- [ ] Create logic for per-node image selection
- [ ] Test image switching for upgrades

### TODO-009: Test complete image workflow

- [ ] Verify schematic submission works
- [ ] Confirm image downloads to Proxmox
- [ ] Validate image files are usable

## **Phase 3: Machine Configuration Templates (6 tasks)**

### TODO-010: Create control plane base template

- [ ] Create `playbooks/templates/talos-controlplane.yaml.j2`
- [ ] Add hostname and network configuration
- [ ] Include topology labels (region/zone)

### TODO-011: Add cluster configuration to control plane

- [ ] Enable scheduling on control planes
- [ ] Disable kube-proxy (replaced by Cilium)
- [ ] Configure CNI to "none"

### TODO-012: Add Cilium bootstrap to control plane

- [ ] Create inline manifest for Cilium values ConfigMap
- [ ] Add Cilium installation job as inline manifest
- [ ] Include Gateway API CRDs as extraManifests

### TODO-013: Create worker node template

- [ ] Create `playbooks/templates/talos-worker.yaml.j2`
- [ ] Minimal config with hostname only
- [ ] Add topology labels for Longhorn

### TODO-014: Add Longhorn preparation to templates

- [ ] Ensure required kernel modules are available
- [ ] Configure open-iscsi if needed
- [ ] Add any Longhorn-specific node labels

### TODO-015: Test machine configuration generation

- [ ] Generate configs for test cluster
- [ ] Validate YAML syntax
- [ ] Verify all required fields are present

## **Phase 4: VM Infrastructure (4 tasks)**

### TODO-016: Update VM Terraform template structure

- [ ] Reorganize terraform-main.tf.j2 into logical sections
- [ ] Add proper VM resource configuration
- [ ] Include network and storage configuration

### TODO-017: Implement direct image integration

- [ ] Reference downloaded images via file_id
- [ ] Remove any manual image attachment steps
- [ ] Configure proper boot order

### TODO-018: Add optional iGPU passthrough

- [ ] Add dynamic hostpci blocks for GPU passthrough
- [ ] Make GPU passthrough configurable per node
- [ ] Document GPU mapping requirements

### TODO-019: Test VM creation end-to-end

- [ ] Create test VMs with custom images
- [ ] Verify network connectivity
- [ ] Confirm GPU passthrough if enabled

## **Phase 5: Talos Bootstrap & Cluster (5 tasks)**

### TODO-020: Create Talos secret generation task

- [ ] Generate Talos machine secrets via talosctl
- [ ] Store secrets in work directory
- [ ] Load secrets for machine configuration

### TODO-021: Generate machine configurations

- [ ] Apply templates with cluster-specific variables
- [ ] Generate control plane and worker configs
- [ ] Create talosconfig for cluster management

### TODO-022: Implement machine configuration application

- [ ] Apply configs to VMs via Talos API
- [ ] Wait for machines to be configured
- [ ] Handle configuration errors gracefully

### TODO-023: Bootstrap Kubernetes cluster

- [ ] Bootstrap first control plane node
- [ ] Wait for cluster to be ready
- [ ] Verify all nodes join successfully

### TODO-024: Test cluster connectivity

- [ ] Extract kubeconfig from cluster
- [ ] Test kubectl connectivity
- [ ] Verify cluster health

## **Phase 6: Cilium CNI (4 tasks)**

### TODO-025: Create Cilium values configuration

- [ ] Create cluster-specific Cilium values
- [ ] Configure L2 announcements and load balancing
- [ ] Enable Gateway API and ingress controller

### TODO-026: Implement Cilium bootstrap job

- [ ] Create job manifest for Cilium installation
- [ ] Include proper RBAC and security contexts
- [ ] Configure for Talos-specific requirements

### TODO-027: Wait for Cilium deployment

- [ ] Monitor Cilium rollout status
- [ ] Verify network connectivity between nodes
- [ ] Test pod-to-pod communication

### TODO-028: Test Cilium features

- [ ] Test load balancing and services
- [ ] Verify L2 announcements work
- [ ] Test ingress controller functionality

## **Phase 7: Sealed Secrets (Mandatory - 4 tasks)**

### TODO-029: Generate sealed secrets certificate

- [ ] Create TLS certificate for sealed secrets
- [ ] Store certificate in secure location
- [ ] Configure certificate in deployment

### TODO-030: Bootstrap sealed secrets controller

- [ ] Create sealed-secrets namespace
- [ ] Deploy sealed secrets certificate as Kubernetes secret
- [ ] Deploy sealed secrets controller

### TODO-031: Install sealed secrets controller

- [ ] Use Helm or manifests to install controller
- [ ] Verify controller is running and healthy
- [ ] Test secret sealing/unsealing

### TODO-032: Create sealed secrets examples

- [ ] Create example sealed secret for testing
- [ ] Document secret management workflow
- [ ] Test secret rotation procedures

## **Phase 8: Longhorn Distributed Storage (6 tasks)**

### TODO-033: Prepare nodes for Longhorn

- [ ] Ensure open-iscsi is available
- [ ] Configure required kernel modules
- [ ] Add any necessary node labels

### TODO-034: Create Longhorn values configuration

- [ ] Configure Longhorn for our cluster topology
- [ ] Set default storage class settings
- [ ] Configure backup and snapshot settings

### TODO-035: Deploy Longhorn via Helm

- [ ] Add Longhorn Helm repository
- [ ] Install Longhorn with custom values
- [ ] Monitor deployment status

### TODO-036: Configure Longhorn storage classes

- [ ] Create default storage class
- [ ] Create performance storage class
- [ ] Create backup storage class if needed

### TODO-037: Test Longhorn functionality

- [ ] Create test PVCs with different storage classes
- [ ] Test volume creation and mounting
- [ ] Verify cross-node volume access

### TODO-038: Configure Longhorn backup

- [ ] Set up S3-compatible backup target
- [ ] Configure automatic backups
- [ ] Test backup and restore procedures

## **Phase 9: Integration & Testing (5 tasks)**

### TODO-039: End-to-end deployment test

- [ ] Run complete deployment from scratch
- [ ] Time deployment duration
- [ ] Document any issues encountered

### TODO-040: Storage integration testing

- [ ] Deploy workloads with persistent volumes
- [ ] Test node failure scenarios
- [ ] Verify volume migration works

### TODO-041: Security testing

- [ ] Test sealed secrets functionality
- [ ] Verify no plain text secrets in configs
- [ ] Test secret rotation procedures

### TODO-042: Performance testing

- [ ] Test storage performance with fio
- [ ] Test network performance between nodes
- [ ] Monitor resource usage during deployment

### TODO-043: Documentation and examples

- [ ] Update all deployment documentation
- [ ] Create troubleshooting guide
- [ ] Document maintenance procedures

## **Current Status**

- **Phase 1**: 1/4 tasks completed (25%)
- **Overall Progress**: 1/43 tasks completed (2.3%)
- **Next Task**: TODO-002 - Create Terraform variables structure

## **Key Architecture Decisions Made**

1. **Storage**: Longhorn over Ceph for distributed storage (simpler, Kubernetes-native)
2. **Security**: Sealed Secrets mandatory for production deployment
3. **Images**: Direct Talos Image Factory integration (no manual image handling)
4. **Terraform**: Clean variable structure following industry best practices
5. **Deployment**: Maintain single-command deployment user experience
