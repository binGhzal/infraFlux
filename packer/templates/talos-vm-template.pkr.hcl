# Talos VM Template for Proxmox
# This Packer template creates a Talos VM template in Proxmox
# Updated with 2024/2025 syntax

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
  vm_id       = var.vm_id
  vm_name     = var.vm_name
  memory      = var.vm_memory
  cores       = var.vm_cpu_cores
  sockets     = 1
  cpu_type    = "host"
  os          = "l26"
  
  # ISO configuration
  boot_iso {
    type     = "scsi"
    iso_file = "${var.proxmox_iso_storage}:iso/${var.talos_iso_file}"
  }

  # Disk configuration
  disks {
    type         = "scsi"
    disk_size    = var.vm_disk_size
    storage_pool = var.proxmox_storage_pool
  }

  # Network configuration
  network_adapters {
    bridge   = var.vm_network_bridge
    firewall = false
    model    = "virtio"
  }

  # Boot configuration
  boot_wait = "10s"
  boot      = "order=scsi1;scsi0"
  
  # SSH configuration (required by Packer, though Talos doesn't use SSH)
  ssh_username = "root"
  ssh_timeout = "1m"
  communicator = "none"
  
  # Template configuration
  template_name        = var.vm_name
  template_description = "Talos ${var.talos_version} VM Template - Created by InfraFlux"

  # QEMU agent
  qemu_agent = true
}

# Build configuration
build {
  name = "talos-template"
  
  sources = [
    "source.proxmox-iso.talos"
  ]

  # Talos boots from ISO and creates a template automatically
  # No provisioning needed since Talos doesn't use SSH
  provisioner "shell-local" {
    inline = [
      "echo 'Talos VM template creation completed'",
      "echo 'VM ID: ${var.vm_id}'", 
      "echo 'VM Name: ${var.vm_name}'",
      "echo 'Talos Version: ${var.talos_version}'"
    ]
  }
}