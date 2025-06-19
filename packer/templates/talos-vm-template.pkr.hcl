# Talos VM Template for Proxmox
# This Packer template creates a Talos VM template in Proxmox

# Variables
variable "proxmox_api_url" {
  type        = string
  description = "Proxmox API URL"
}

variable "proxmox_api_token_id" {
  type        = string
  description = "Proxmox API Token ID"
}

variable "proxmox_api_token_secret" {
  type        = string
  description = "Proxmox API Token Secret"
  sensitive   = true
}

variable "proxmox_node" {
  type        = string
  description = "Proxmox node name"
}

variable "proxmox_storage_pool" {
  type        = string
  default     = "local-lvm"
  description = "Proxmox storage pool for VM disks"
}

variable "proxmox_iso_storage" {
  type        = string
  default     = "local"
  description = "Proxmox storage for ISO files"
}

variable "talos_version" {
  type        = string
  description = "Talos version"
}

variable "talos_iso_file" {
  type        = string
  description = "Talos ISO file name in Proxmox storage"
}

variable "vm_id" {
  type        = number
  default     = 9000
  description = "VM ID for the template"
}

variable "vm_name" {
  type        = string
  description = "VM template name"
}

variable "vm_cpu_cores" {
  type        = number
  default     = 2
  description = "Number of CPU cores"
}

variable "vm_memory" {
  type        = number
  default     = 4096
  description = "Memory in MB"
}

variable "vm_disk_size" {
  type        = string
  default     = "20G"
  description = "Disk size"
}

variable "vm_network_bridge" {
  type        = string
  default     = "vmbr0"
  description = "Network bridge"
}

# Packer configuration
packer {
  required_plugins {
    proxmox = {
      version = "~> 1"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

# Source configuration
source "proxmox-iso" "talos" {
  # Proxmox connection
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  node                     = var.proxmox_node
  insecure_skip_tls_verify = true

  # VM configuration
  vm_id                = var.vm_id
  vm_name              = var.vm_name
  memory               = var.vm_memory
  cores                = var.vm_cpu_cores
  cpu_type             = "host"
  os                   = "l26"
  
  # Storage configuration
  storage_pool         = var.proxmox_storage_pool
  storage_pool_type    = "lvm"
  
  # Disk configuration
  disks {
    type              = "scsi"
    disk_size         = var.vm_disk_size
    storage_pool      = var.proxmox_storage_pool
    storage_pool_type = "lvm"
    format            = "raw"
  }

  # Network configuration
  network_adapters {
    bridge   = var.vm_network_bridge
    firewall = false
    model    = "virtio"
  }

  # ISO configuration
  iso_file         = "${var.proxmox_iso_storage}:iso/${var.talos_iso_file}"
  unmount_iso      = true

  # Cloud-init configuration
  cloud_init              = true
  cloud_init_storage_pool = var.proxmox_storage_pool

  # Boot configuration
  boot_wait    = "10s"
  boot_command = [
    # Talos will auto-boot from ISO
  ]

  # SSH configuration (Talos doesn't use SSH by default)
  ssh_timeout = "15m"
  
  # Template configuration
  template_name        = var.vm_name
  template_description = "Talos ${var.talos_version} VM Template - Created by InfraFlux"

  # Additional VM settings
  additional_wait_timeout = 5
  vm_interface           = "virtio0"
  
  # QEMU agent
  qemu_agent = true
  
  # SCSI controller
  scsi_controller = "virtio-scsi-pci"
  
  # Machine type
  machine = "q35"
  
  # BIOS
  bios = "ovmf"
  
  # EFI disk
  efi_config {
    efi_storage_pool  = var.proxmox_storage_pool
    efi_type         = "4m"
    pre_enrolled_keys = true
  }

  # Additional disks for future expansion
  additional_iso_files {
    device   = "sata3"
    iso_file = "${var.proxmox_iso_storage}:iso/${var.talos_iso_file}"
    unmount  = true
  }
}

# Build configuration
build {
  name = "talos-template"
  
  sources = [
    "source.proxmox-iso.talos"
  ]

  # Wait for VM to be ready
  provisioner "shell-local" {
    inline = [
      "echo 'Waiting for Talos VM to initialize...'",
      "sleep 30"
    ]
  }

  # Talos-specific provisioning
  provisioner "shell-local" {
    inline = [
      "echo 'Talos VM template creation in progress...'",
      "echo 'VM ID: ${var.vm_id}'",
      "echo 'VM Name: ${var.vm_name}'",
      "echo 'Talos Version: ${var.talos_version}'",
      "echo 'Storage Pool: ${var.proxmox_storage_pool}'",
      "echo 'Network Bridge: ${var.vm_network_bridge}'"
    ]
  }

  # Convert to template
  post-processor "shell-local" {
    inline = [
      "echo 'Converting VM to template...'",
      "sleep 10"
    ]
  }
}

# Local variables for computed values
locals {
  timestamp = regex_replace(timestamp(), "[- TZ:]", "")
}

# Output information
build {
  name = "output-info"
  
  sources = [
    "source.proxmox-iso.talos"
  ]

  provisioner "shell-local" {
    inline = [
      "echo '=================================='",
      "echo 'Talos VM Template Creation Complete'",
      "echo '=================================='",
      "echo 'Template Name: ${var.vm_name}'",
      "echo 'Template ID: ${var.vm_id}'", 
      "echo 'Talos Version: ${var.talos_version}'",
      "echo 'Node: ${var.proxmox_node}'",
      "echo 'Storage: ${var.proxmox_storage_pool}'",
      "echo 'Created: ${local.timestamp}'",
      "echo '=================================='",
      "echo 'Template ready for VM deployment!'"
    ]
  }
}