terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "~> 2.9"
    }
  }
}

provider "proxmox" {
  pm_api_url      = var.proxmox_api_url
  pm_user         = var.proxmox_user
  pm_password     = var.proxmox_password
  pm_tls_insecure = true
}

# Create controller nodes
resource "proxmox_vm_qemu" "controllers" {
  count       = var.controller_count
  name        = "${var.cluster_name}-controller-${count.index + 1}"
  target_node = var.proxmox_node
  clone       = var.vm_template_name
  vmid        = 4000 + count.index + 1

  # VM Configuration
  cores   = var.vm_cores
  memory  = var.vm_memory
  balloon = 0

  # Disk Configuration
  disk {
    size     = var.vm_disk_size
    type     = "virtio"
    storage  = var.proxmox_storage
  }

  # Network Configuration
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  # Cloud-init Configuration
  os_type                 = "cloud-init"
  cloudinit_cdrom_storage = var.proxmox_storage
  
  # SSH Configuration
  sshkeys = var.ssh_public_key

  # IP Configuration
  ipconfig0 = "ip=${cidrhost(var.network_cidr, 10 + count.index + 1)}/24,gw=${var.gateway_ip}"

  # VM Settings
  agent    = 1
  onboot   = true
  bootdisk = "virtio0"

  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}

# Create worker nodes
resource "proxmox_vm_qemu" "workers" {
  count       = var.worker_count
  name        = "${var.cluster_name}-worker-${count.index + 1}"
  target_node = var.proxmox_node
  clone       = var.vm_template_name
  vmid        = 4100 + count.index + 1

  # VM Configuration
  cores   = var.vm_cores
  memory  = var.vm_memory
  balloon = 0

  # Disk Configuration
  disk {
    size     = var.vm_disk_size
    type     = "virtio"
    storage  = var.proxmox_storage
  }

  # Network Configuration
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  # Cloud-init Configuration
  os_type                 = "cloud-init"
  cloudinit_cdrom_storage = var.proxmox_storage
  
  # SSH Configuration
  sshkeys = var.ssh_public_key

  # IP Configuration
  ipconfig0 = "ip=${cidrhost(var.network_cidr, 20 + count.index + 1)}/24,gw=${var.gateway_ip}"

  # VM Settings
  agent    = 1
  onboot   = true
  bootdisk = "virtio0"

  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}