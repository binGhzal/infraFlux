variable "proxmox_api_url" {
  description = "Proxmox API URL"
  type        = string
}

variable "proxmox_user" {
  description = "Proxmox username"
  type        = string
}

variable "proxmox_password" {
  description = "Proxmox password"
  type        = string
  sensitive   = true
}

variable "proxmox_node" {
  description = "Proxmox node name"
  type        = string
}

variable "proxmox_storage" {
  description = "Proxmox storage pool"
  type        = string
}

variable "cluster_name" {
  description = "Name of the Kubernetes cluster"
  type        = string
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
  description = "Name of the VM template"
  type        = string
}

variable "vm_cores" {
  description = "Number of CPU cores per VM"
  type        = number
  default     = 2
}

variable "vm_memory" {
  description = "Amount of memory per VM in MB"
  type        = number
  default     = 4096
}

variable "vm_disk_size" {
  description = "Disk size per VM"
  type        = string
  default     = "20G"
}

variable "network_cidr" {
  description = "Network CIDR for the cluster"
  type        = string
}

variable "gateway_ip" {
  description = "Gateway IP address"
  type        = string
}

variable "ssh_public_key" {
  description = "SSH public key for VM access"
  type        = string
}