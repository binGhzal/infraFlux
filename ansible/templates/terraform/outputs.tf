# Terraform Outputs for Ansible Integration

output "controller_ips" {
  description = "IP addresses of controller nodes"
  value       = proxmox_vm_qemu.controller[*].default_ipv4_address
}

output "worker_ips" {
  description = "IP addresses of worker nodes"
  value       = proxmox_vm_qemu.worker[*].default_ipv4_address
}

output "controller_names" {
  description = "Names of controller VMs"
  value       = proxmox_vm_qemu.controller[*].name
}

output "worker_names" {
  description = "Names of worker VMs"
  value       = proxmox_vm_qemu.worker[*].name
}

output "all_ips" {
  description = "All VM IP addresses"
  value       = concat(proxmox_vm_qemu.controller[*].default_ipv4_address, proxmox_vm_qemu.worker[*].default_ipv4_address)
}

output "cluster_info" {
  description = "Cluster information for Ansible"
  value = {
    cluster_name      = var.cluster_name
    controller_count  = var.controller_count
    worker_count      = var.worker_count
    network_cidr      = var.network_cidr
    first_controller  = proxmox_vm_qemu.controller[0].default_ipv4_address
  }
}
