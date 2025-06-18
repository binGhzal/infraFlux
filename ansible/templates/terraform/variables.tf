# Terraform Variables for Proxmox VM Deployment

variable "proxmox_host" {
  description = "Proxmox server hostname or IP"
  type        = string
}

variable "proxmox_user" {
  description = "Proxmox username"
  type        = string
  default     = "root@pam"
}

variable "proxmox_password" {
  description = "Proxmox password"
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
  default     = "pve"
}

variable "proxmox_storage" {
  description = "Proxmox storage pool"
  type        = string
  default     = "local-lvm"
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
  default     = "infraflux-cluster"
}

variable "controller_count" {
  description = "Number of controller nodes"
  type        = number
  default     = 3
}

variable "worker_count" {
  description = "Number of worker nodes"
  type        = number
  default     = 3
}

variable "vm_template_name" {
  description = "Name of the VM template to clone"
  type        = string
  default     = "ubuntu-24.04-template"
}

variable "vm_cores" {
  description = "Number of CPU cores per VM"
  type        = number
  default     = 2
}

variable "vm_memory" {
  description = "Memory size in MB per VM"
  type        = number
  default     = 4096
}

variable "vm_disk_size" {
  description = "Disk size per VM"
  type        = string
  default     = "20G"
}

variable "network_cidr" {
  description = "Network CIDR for VM IP assignment"
  type        = string
  default     = "192.168.1.0/24"
}

variable "gateway_ip" {
  description = "Network gateway IP"
  type        = string
  default     = "192.168.1.1"
}

variable "ssh_key_path" {
  description = "Path to SSH public key for VM access"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}
