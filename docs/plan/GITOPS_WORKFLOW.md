# InfraFlux v2.0: GitOps Workflow Architecture Plan

> **Phase 2 - High Priority**: Complete GitOps automation using Flux v2 for application lifecycle management

---

## 🎯 **Strategic Overview**

This document defines the complete GitOps workflow architecture for InfraFlux v2.0, establishing Flux v2 as the automated application delivery system that manages the entire Kubernetes application lifecycle through Git-based workflows, ensuring consistency, auditability, and automated operations.

### **Core GitOps Principles**

1. **Git as Single Source of Truth**: All cluster state defined in Git repositories
2. **Declarative Configuration**: Everything described in YAML manifests
3. **Automated Synchronization**: Flux automatically applies changes from Git
4. **Observable Operations**: All changes tracked and auditable
5. **Security by Design**: Sealed secrets and RBAC enforcement

---

## 📋 **Implementation Tasks Overview**

**Total Tasks**: 20 (6-8 per major component)
**Priority**: High (Phase 2)
**Timeline**: Week 3-4
**Dependencies**: Talos Architecture (Phase 1) complete

---

## 🚀 **Component 1: Flux v2 Integration**

### **1.1 Bootstrap Automation** (Task 1-2)

#### **Task 1.1.1: Automated Flux Installation**
- **Priority**: Critical
- **Dependencies**: Talos cluster operational
- **Deliverable**: `scripts/bootstrap-flux.sh`
- **Description**: Automated Flux v2 installation and bootstrap process
- **Validation**: Flux deploys successfully and syncs with Git repository
- **Implementation**:
  ```bash
  #!/bin/bash
  # scripts/bootstrap-flux.sh
  
  set -euo pipefail
  
  # Configuration
  FLUX_VERSION="v2.4.0"
  CLUSTER_NAME="${CLUSTER_NAME:-infraflux-v2}"
  GIT_REPOSITORY="${GIT_REPOSITORY}"
  GIT_BRANCH="${GIT_BRANCH:-main}"
  GIT_PATH="${GIT_PATH:-clusters/${CLUSTER_NAME}}"
  
  log() {
    echo -e "\033[0;34m[$(date +'%H:%M:%S')]\033[0m $1"
  }
  
  success() {
    echo -e "\033[0;32m[SUCCESS]\033[0m $1"
  }
  
  error() {
    echo -e "\033[0;31m[ERROR]\033[0m $1" >&2
  }
  
  # Install Flux CLI if not present
  install_flux_cli() {
    if ! command -v flux &> /dev/null; then
      log "Installing Flux CLI v${FLUX_VERSION}..."
      curl -s https://fluxcd.io/install.sh | bash
      success "Flux CLI installed"
    else
      log "Flux CLI already installed: $(flux version --client)"
    fi
  }
  
  # Verify prerequisites
  verify_prerequisites() {
    log "Verifying prerequisites..."
    
    # Check cluster access
    if ! kubectl cluster-info &> /dev/null; then
      error "Cannot access Kubernetes cluster"
      exit 1
    fi
    
    # Check Flux prerequisites
    if ! flux check --pre; then
      error "Flux prerequisites not met"
      exit 1
    fi
    
    success "Prerequisites verified"
  }
  
  # Bootstrap Flux
  bootstrap_flux() {
    log "Bootstrapping Flux v2..."
    
    flux bootstrap git \
      --url="${GIT_REPOSITORY}" \
      --branch="${GIT_BRANCH}" \
      --path="${GIT_PATH}" \
      --components-extra="image-reflector-controller,image-automation-controller" \
      --read-write-key \
      --silent
    
    success "Flux v2 bootstrapped successfully"
  }
  
  # Verify Flux installation
  verify_flux() {
    log "Verifying Flux installation..."
    
    # Wait for Flux controllers to be ready
    kubectl wait --for=condition=ready pod -l app.kubernetes.io/part-of=flux-system -n flux-system --timeout=300s
    
    # Check Flux status
    flux check
    
    success "Flux installation verified"
  }
  
  # Main execution
  main() {
    install_flux_cli
    verify_prerequisites
    bootstrap_flux
    verify_flux
    
    log "Flux GitOps system ready!"
    log "Repository: ${GIT_REPOSITORY}"
    log "Branch: ${GIT_BRANCH}"
    log "Path: ${GIT_PATH}"
  }
  
  main "$@"
  ```

#### **Task 1.1.2: Flux Configuration Templates**
- **Priority**: Critical
- **Dependencies**: Task 1.1.1
- **Deliverable**: `templates/flux/` directory with base configurations
- **Description**: Create reusable Flux configuration templates
- **Validation**: Templates generate valid Flux resources

### **1.2 Repository Structure Design** (Task 3-4)

#### **Task 1.2.1: Git Repository Architecture**
- **Priority**: Critical
- **Dependencies**: Task 1.1.2
- **Deliverable**: Complete Git repository structure design
- **Description**: Define optimal Git repository structure for multi-environment GitOps
- **Validation**: Structure supports development, staging, and production workflows
- **Implementation**:
  ```
  infraflux-gitops/
  ├── clusters/
  │   ├── development/
  │   │   ├── flux-system/
  │   │   │   ├── gotk-components.yaml
  │   │   │   ├── gotk-sync.yaml
  │   │   │   └── kustomization.yaml
  │   │   ├── infrastructure.yaml
  │   │   └── applications.yaml
  │   ├── staging/
  │   │   ├── flux-system/
  │   │   ├── infrastructure.yaml
  │   │   └── applications.yaml
  │   └── production/
  │       ├── flux-system/
  │       ├── infrastructure.yaml
  │       └── applications.yaml
  ├── infrastructure/
  │   ├── sources/
  │   │   ├── helm-repositories.yaml
  │   │   └── git-repositories.yaml
  │   ├── core/
  │   │   ├── cilium/
  │   │   ├── cert-manager/
  │   │   ├── sealed-secrets/
  │   │   └── longhorn/
  │   └── security/
  │       ├── policy-engine/
  │       ├── falco/
  │       └── network-policies/
  ├── applications/
  │   ├── base/
  │   │   ├── monitoring/
  │   │   │   ├── prometheus/
  │   │   │   ├── grafana/
  │   │   │   └── loki/
  │   │   ├── productivity/
  │   │   │   ├── nextcloud/
  │   │   │   ├── vaultwarden/
  │   │   │   └── gitea/
  │   │   └── media/
  │   │       ├── jellyfin/
  │   │       ├── sonarr/
  │   │       └── radarr/
  │   └── overlays/
  │       ├── development/
  │       ├── staging/
  │       └── production/
  └── policies/
      ├── security/
      ├── resource-quotas/
      └── network-policies/
  ```

#### **Task 1.2.2: Environment-Specific Overlays**
- **Priority**: High
- **Dependencies**: Task 1.2.1
- **Deliverable**: Kustomize overlays for each environment
- **Description**: Create environment-specific configurations using Kustomize
- **Validation**: Each environment deploys with correct configurations

### **1.3 Application Lifecycle Management** (Task 5-6)

#### **Task 1.3.1: HelmRelease Templates**
- **Priority**: Critical
- **Dependencies**: Task 1.2.2
- **Deliverable**: `templates/flux/helmrelease.yaml.j2`
- **Description**: Standardized HelmRelease templates for consistent deployments
- **Validation**: All applications deploy consistently across environments
- **Implementation**:
  ```yaml
  # templates/flux/helmrelease.yaml.j2
  apiVersion: helm.toolkit.fluxcd.io/v2beta1
  kind: HelmRelease
  metadata:
    name: {{ app.name }}
    namespace: {{ app.namespace }}
    labels:
      app.kubernetes.io/name: {{ app.name }}
      app.kubernetes.io/part-of: infraflux
      app.kubernetes.io/managed-by: flux
  spec:
    interval: {{ app.sync_interval | default('5m') }}
    timeout: {{ app.timeout | default('10m') }}
    chart:
      spec:
        chart: {{ app.chart.name }}
        version: {{ app.chart.version }}
        sourceRef:
          kind: HelmRepository
          name: {{ app.chart.repository }}
          namespace: flux-system
        interval: {{ app.chart.interval | default('1h') }}
    {% if app.depends_on %}
    dependsOn:
    {% for dependency in app.depends_on %}
      - name: {{ dependency.name }}
        namespace: {{ dependency.namespace | default(app.namespace) }}
    {% endfor %}
    {% endif %}
    values:
      {{ app.values | to_nice_yaml | indent(6) }}
    {% if app.post_renderers %}
    postRenderers:
    {% for renderer in app.post_renderers %}
      - kustomize:
          {{ renderer | to_nice_yaml | indent(10) }}
    {% endfor %}
    {% endif %}
    install:
      createNamespace: true
      remediation:
        retries: {{ app.install.retries | default(3) }}
    upgrade:
      remediation:
        retries: {{ app.upgrade.retries | default(3) }}
        remediateLastFailure: true
    rollback:
      timeout: {{ app.rollback.timeout | default('10m') }}
      cleanupOnFail: true
    {% if app.tests %}
    test:
      enable: true
      timeout: {{ app.tests.timeout | default('5m') }}
    {% endif %}
  ```

#### **Task 1.3.2: Application Dependencies Management**
- **Priority**: High
- **Dependencies**: Task 1.3.1
- **Deliverable**: Dependency management system for applications
- **Description**: Ensure applications deploy in correct order with proper dependencies
- **Validation**: Complex dependency chains resolve correctly

### **1.4 Image Automation and Updates** (Task 7-8)

#### **Task 1.4.1: Image Repository Automation**
- **Priority**: High
- **Dependencies**: Task 1.3.2
- **Deliverable**: Automated image repository scanning and update system
- **Description**: Configure Flux image automation for container updates
- **Validation**: Container images auto-update according to policies
- **Implementation**:
  ```yaml
  # infrastructure/core/image-automation/image-repositories.yaml
  apiVersion: image.toolkit.fluxcd.io/v1beta2
  kind: ImageRepository
  metadata:
    name: infraflux-apps
    namespace: flux-system
  spec:
    image: ghcr.io/infraflux/apps
    interval: 10m
    provider: generic
  ---
  apiVersion: image.toolkit.fluxcd.io/v1beta2
  kind: ImagePolicy
  metadata:
    name: infraflux-apps-policy
    namespace: flux-system
  spec:
    imageRepositoryRef:
      name: infraflux-apps
    policy:
      semver:
        range: '>=1.0.0'
  ---
  apiVersion: image.toolkit.fluxcd.io/v1beta1
  kind: ImageUpdateAutomation
  metadata:
    name: infraflux-apps-update
    namespace: flux-system
  spec:
    interval: 30m
    sourceRef:
      kind: GitRepository
      name: flux-system
    git:
      checkout:
        ref:
          branch: main
      commit:
        author:
          email: fluxcdbot@infraflux.dev
          name: fluxcdbot
        messageTemplate: |
          Automated image update
          
          Automation name: {{ .AutomationObject }}
          
          Files:
          {{ range $filename, $_ := .Updated.Files -}}
          - {{ $filename }}
          {{ end -}}
          
          Objects:
          {{ range $resource, $_ := .Updated.Objects -}}
          - {{ $resource.Kind }} {{ $resource.Name }}
          {{ end -}}
          
          Images:
          {{ range .Updated.Images -}}
          - {{.}}
          {{ end -}}
      push:
        branch: main
    update:
      path: "./clusters"
      strategy: Setters
  ```

#### **Task 1.4.2: Image Policy Configuration**
- **Priority**: Medium
- **Dependencies**: Task 1.4.1
- **Deliverable**: Comprehensive image update policies for different application types
- **Description**: Configure image update policies based on application criticality
- **Validation**: Policies correctly filter and update images

---

## 📦 **Component 2: Git Repository Design**

### **2.1 Directory Structure Optimization** (Task 9-10)

#### **Task 2.1.1: Multi-Tenant Repository Structure**
- **Priority**: High
- **Dependencies**: Task 1.2.1
- **Deliverable**: Repository structure supporting multiple teams and environments
- **Description**: Design repository structure for scalable multi-tenant usage
- **Validation**: Multiple teams can work independently without conflicts

#### **Task 2.1.2: Namespace and Resource Organization**
- **Priority**: High
- **Dependencies**: Task 2.1.1
- **Deliverable**: Logical organization of Kubernetes resources
- **Description**: Organize resources by domain, criticality, and lifecycle
- **Validation**: Resources deploy to correct namespaces with proper labeling

### **2.2 Environment Management** (Task 11-12)

#### **Task 2.2.1: Environment Promotion Pipeline**
- **Priority**: Medium
- **Dependencies**: Task 2.1.2
- **Deliverable**: Automated promotion between environments
- **Description**: GitOps workflow for promoting changes through environments
- **Validation**: Changes promote correctly from dev → staging → production

#### **Task 2.2.2: Environment-Specific Configurations**
- **Priority**: High
- **Dependencies**: Task 2.2.1
- **Deliverable**: Environment-specific configuration management
- **Description**: Manage different resource limits, replicas, and settings per environment
- **Validation**: Each environment has appropriate configurations

### **2.3 Secret Handling Workflows** (Task 13-14)

#### **Task 2.3.1: Sealed Secrets Integration**
- **Priority**: Critical
- **Dependencies**: Task 2.1.1
- **Deliverable**: Complete sealed secrets workflow for GitOps
- **Description**: Integrate sealed secrets for secure secret management in Git
- **Validation**: Secrets stored securely in Git and decrypt properly in cluster
- **Implementation**:
  ```bash
  #!/bin/bash
  # scripts/create-sealed-secret.sh
  
  set -euo pipefail
  
  SECRET_NAME="${1}"
  NAMESPACE="${2}"
  SECRET_TYPE="${3:-Opaque}"
  
  if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <secret-name> <namespace> [secret-type]"
    echo "Example: $0 database-credentials production"
    exit 1
  fi
  
  # Create temporary secret file
  cat > temp-secret.yaml << EOF
  apiVersion: v1
  kind: Secret
  metadata:
    name: ${SECRET_NAME}
    namespace: ${NAMESPACE}
  type: ${SECRET_TYPE}
  data: {}
  EOF
  
  echo "Enter secret data (key=value pairs, empty line to finish):"
  while IFS= read -r line; do
    [[ -z "$line" ]] && break
    key=$(echo "$line" | cut -d'=' -f1)
    value=$(echo "$line" | cut -d'=' -f2-)
    encoded_value=$(echo -n "$value" | base64 -w 0)
    yq eval ".data.\"$key\" = \"$encoded_value\"" -i temp-secret.yaml
  done
  
  # Create sealed secret
  kubeseal --format=yaml < temp-secret.yaml > "applications/base/secrets/${SECRET_NAME}-sealed.yaml"
  
  # Clean up
  rm temp-secret.yaml
  
  echo "✅ Sealed secret created: applications/base/secrets/${SECRET_NAME}-sealed.yaml"
  echo "📝 You can now commit this file to Git safely"
  ```

#### **Task 2.3.2: Secret Rotation Automation**
- **Priority**: Medium
- **Dependencies**: Task 2.3.1
- **Deliverable**: Automated secret rotation workflows
- **Description**: Implement automated secret rotation using external secret operators
- **Validation**: Secrets rotate automatically without service disruption

### **2.4 Branch and Release Strategies** (Task 15-16)

#### **Task 2.4.1: GitFlow Integration**
- **Priority**: Medium
- **Dependencies**: Task 2.2.1
- **Deliverable**: GitFlow workflow for GitOps operations
- **Description**: Implement Git branching strategy for safe deployments
- **Validation**: Branching strategy enables safe collaborative development

#### **Task 2.4.2: Release Management**
- **Priority**: Medium
- **Dependencies**: Task 2.4.1
- **Deliverable**: Automated release management and tagging
- **Description**: Automate release creation and environment promotion
- **Validation**: Releases created automatically with proper versioning

---

## 🎯 **Component 3: Application Management**

### **3.1 Helm Chart Integration** (Task 17-18)

#### **Task 3.1.1: Custom Helm Chart Templates**
- **Priority**: High
- **Dependencies**: Task 1.3.1
- **Deliverable**: InfraFlux-specific Helm chart templates
- **Description**: Create standardized Helm chart templates for common application patterns
- **Validation**: Charts deploy consistently with proper defaults

#### **Task 3.1.2: Helm Repository Management**
- **Priority**: High
- **Dependencies**: Task 3.1.1
- **Deliverable**: Automated Helm repository synchronization
- **Description**: Manage multiple Helm repositories and chart dependencies
- **Validation**: All required charts available and properly versioned

### **3.2 Kustomize Overlays** (Task 19-20)

#### **Task 3.2.1: Advanced Kustomize Patterns**
- **Priority**: Medium
- **Dependencies**: Task 3.1.2
- **Deliverable**: Advanced Kustomize overlay patterns for complex scenarios
- **Description**: Implement sophisticated overlay patterns for multi-environment deployments
- **Validation**: Complex configurations deploy correctly across environments

#### **Task 3.2.2: Configuration Templating**
- **Priority**: Medium
- **Dependencies**: Task 3.2.1
- **Deliverable**: Template-driven configuration generation for Kustomize
- **Description**: Generate Kustomize overlays from templates for consistency
- **Validation**: Generated overlays are valid and deploy successfully

---

## 🔧 **Technical Specifications**

### **Flux v2 Components**
- **Source Controller**: Git and Helm repository management
- **Kustomize Controller**: Kustomize overlay processing
- **Helm Controller**: Helm chart lifecycle management
- **Image Reflector/Automation Controllers**: Container image automation
- **Notification Controller**: Event notification and webhooks

### **Git Repository Requirements**
- **Provider**: GitHub, GitLab, or Gitea
- **Access**: Deploy key with read-write access
- **Structure**: Multi-environment support
- **Security**: GPG signing optional, webhook security required

### **Application Deployment Patterns**
- **Progressive Delivery**: Flagger integration for canary deployments
- **Dependency Management**: HelmRelease dependencies
- **Health Checks**: Readiness and liveness probe requirements
- **Resource Management**: Requests and limits defined for all applications

---

## 📊 **Success Criteria**

### **Functional Requirements**
- ✅ Complete GitOps workflow operational (Git → Cluster)
- ✅ Multi-environment deployments working (dev/staging/prod)
- ✅ Automated image updates functioning
- ✅ Secret management via sealed secrets working
- ✅ Application dependencies resolve correctly

### **Performance Requirements**
- ✅ Git to cluster sync < 1 minute
- ✅ Application deployment < 5 minutes
- ✅ Image update detection < 10 minutes
- ✅ Secret rotation < 30 seconds

### **Security Requirements**
- ✅ No plain text secrets in Git
- ✅ RBAC properly configured for Flux
- ✅ Git webhook security implemented
- ✅ Image vulnerability scanning integrated

### **Operational Requirements**
- ✅ Rollback procedures tested and working
- ✅ Disaster recovery procedures documented
- ✅ Monitoring and alerting for GitOps operations
- ✅ Backup and restore procedures for Git repositories

---

## 🚀 **Integration Points**

### **With Talos Architecture**
- Flux deploys on Talos-based Kubernetes cluster
- Uses Talos-native networking and storage
- Integrates with Talos certificate management

### **With Security Framework**
- RBAC integration for Flux service accounts
- Network policies for Flux controllers
- Secret management through sealed secrets

### **With Operations Procedures**
- Monitoring of GitOps operations
- Alerting for deployment failures
- Backup procedures for Git repositories

---

## 🎯 **Next Steps**

Upon completion of this GitOps Workflow implementation:

1. **Application Deployment**: Deploy core infrastructure applications
2. **Monitoring Integration**: Add observability for GitOps operations
3. **Security Hardening**: Implement additional security measures
4. **User Training**: Create documentation and training materials
5. **Advanced Features**: Progressive delivery and advanced automation

This GitOps foundation provides the automated, secure, and scalable application delivery system required for InfraFlux v2.0's next-generation platform.