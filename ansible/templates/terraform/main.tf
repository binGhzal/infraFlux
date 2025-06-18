# Terraform Provider and VM Configuration for Proxmox
terraform {
  required_providers {
    proxmox = {
      source  = "telmate/proxmox"
      version = "~> 2.9"
    }
  }
}

# Configure the Proxmox Provider
provider "proxmox" {
  pm_api_url  = "https://${var.proxmox_host}:8006/api2/json"
  pm_user     = var.proxmox_user
  pm_password = var.proxmox_password
  pm_tls_insecure = true
}

# Create Controller VMs
resource "proxmox_vm_qemu" "controller" {
  count       = var.controller_count
  name        = "${var.cluster_name}-controller-${count.index + 1}"
  target_node = var.proxmox_node
  clone       = var.vm_template_name
  full_clone  = true

  # VM Resources
  cores  = var.vm_cores
  memory = var.vm_memory

  # Storage
  disk {
    size    = var.vm_disk_size
    type    = "scsi"
    storage = var.proxmox_storage
  }

  # Network
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  # Cloud-init configuration
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = file(var.ssh_key_path)
  ipconfig0  = "ip=${cidrhost(var.network_cidr, 10 + count.index)}/${split("/", var.network_cidr)[1]},gw=${var.gateway_ip}"

  # Tags for organization
  tags = "controller,k3s,${var.cluster_name}"

  # Wait for cloud-init to complete
  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}

# Create Worker VMs
resource "proxmox_vm_qemu" "worker" {
  count       = var.worker_count
  name        = "${var.cluster_name}-worker-${count.index + 1}"
  target_node = var.proxmox_node
  clone       = var.vm_template_name
  full_clone  = true

  # VM Resources
  cores  = var.vm_cores
  memory = var.vm_memory

  # Storage
  disk {
    size    = var.vm_disk_size
    type    = "scsi"
    storage = var.proxmox_storage
  }

  # Network
  network {
    model  = "virtio"
    bridge = "vmbr0"
  }

  # Cloud-init configuration
  ciuser     = "ubuntu"
  cipassword = "ubuntu"
  sshkeys    = file(var.ssh_key_path)
  ipconfig0  = "ip=${cidrhost(var.network_cidr, 10 + var.controller_count + count.index)}/${split("/", var.network_cidr)[1]},gw=${var.gateway_ip}"

  # Tags for organization
  tags = "worker,k3s,${var.cluster_name}"

  # Wait for cloud-init to complete
  lifecycle {
    ignore_changes = [
      network,
    ]
  }
}
