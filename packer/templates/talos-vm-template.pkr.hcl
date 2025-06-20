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

variable "static_ip" {
  type        = string
  default     = "10.0.0.200/24"
  description = "Static IP for Packer SSH access"
}

variable "gateway" {
  type        = string
  default     = "10.0.0.1"
  description = "Gateway IP"
}

# Packer configuration
packer {
  required_plugins {
    proxmox = {
      version = "= 1.2.1"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

locals {
  timestamp = timestamp()
}

# Source configuration
source "proxmox-iso" "talos" {
  # Proxmox connection
  proxmox_url              = var.proxmox_api_url
  username                 = var.proxmox_api_token_id
  token                    = var.proxmox_api_token_secret
  node                     = var.proxmox_node
  insecure_skip_tls_verify = true

  # ISO configuration
  boot_iso {
    type     = "ide"
    iso_file = "${var.proxmox_iso_storage}:iso/${var.talos_iso_file}"
  }

  # VM configuration
  vm_id        = var.vm_id
  vm_name      = var.vm_name
  memory       = var.vm_memory
  cpu_type     = "host"
  sockets      = 1
  cores        = var.vm_cpu_cores
  os           = "l26"


  # Storage configuration
  scsi_controller = "virtio-scsi-single"

  # Disk configuration
  disks {
    type         = "virtio"
    storage_pool = var.proxmox_storage_pool
    format       = "raw"
    disk_size    = var.vm_disk_size
  }

  # Network configuration
  network_adapters {
    bridge = var.vm_network_bridge
    model  = "virtio"
  }

  # Boot configuration
  boot_wait = "20s"
  boot_command = [
    "<enter><wait50s>",
    "passwd<enter><wait1s>packer<enter><wait1s>packer<enter>",
    "dhclient -v ens18<enter><wait>",
  ]

  # SSH configuration
  ssh_username         = "root"
  ssh_password         = "packer"
  ssh_timeout          = "15m"
  ssh_handshake_attempts = "50"

  # Template configuration
  template_name        = var.vm_name
  template_description = "${local.timestamp} - Talos ${var.talos_version} template - Created by InfraFlux"
  tags                 = "talos_v1_6_0;template"

  # Machine configuration
  machine = "pc"
  bios    = "seabios"

  # QEMU agent
  qemu_agent = true

  # Start on boot
  onboot = true
}

# Build configuration
build {
  name = "talos-template"

  sources = [
    "source.proxmox-iso.talos"
  ]

  # Talos boots from ISO and creates a template automatically
  # No provisioning needed since we're just creating a template
  provisioner "shell-local" {
    inline = [
      "echo 'Talos VM template creation completed'",
      "echo 'VM ID: ${var.vm_id}'",
      "echo 'VM Name: ${var.vm_name}'",
      "echo 'Talos Version: ${var.talos_version}'"
    ]
  }
}
