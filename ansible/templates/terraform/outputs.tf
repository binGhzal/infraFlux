output "controller_ips" {
  description = "IP addresses of controller nodes"
  value       = [for vm in proxmox_vm_qemu.controllers : regex("ip=([^/]+)", vm.ipconfig0)[0]]
}

output "worker_ips" {
  description = "IP addresses of worker nodes"
  value       = [for vm in proxmox_vm_qemu.workers : regex("ip=([^/]+)", vm.ipconfig0)[0]]
}

output "all_ips" {
  description = "All VM IP addresses"
  value       = concat(
    [for vm in proxmox_vm_qemu.controllers : regex("ip=([^/]+)", vm.ipconfig0)[0]],
    [for vm in proxmox_vm_qemu.workers : regex("ip=([^/]+)", vm.ipconfig0)[0]]
  )
}

output "controller_names" {
  description = "Names of controller VMs"
  value       = proxmox_vm_qemu.controllers[*].name
}

output "worker_names" {
  description = "Names of worker VMs"
  value       = proxmox_vm_qemu.workers[*].name
}

output "cluster_info" {
  description = "Cluster information summary"
  value = {
    cluster_name     = var.cluster_name
    controller_count = var.controller_count
    worker_count     = var.worker_count
    network_cidr     = var.network_cidr
    gateway_ip       = var.gateway_ip
  }
}