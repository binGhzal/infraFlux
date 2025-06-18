#!/usr/bin/env python3
"""
InfraFlux Network Auto-Detection Utility

This script analyzes your inventory file and automatically detects:
- Network ranges and subnets
- IP addressing patterns
- Generates dynamic network configuration

This allows users to use any IP range (192.168.x.x, 10.x.x.x, etc.)
without hardcoding network prefixes in the configuration.
"""

import re
import sys
import ipaddress
import argparse
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class NetworkDetector:
    def __init__(self, inventory_file: str):
        self.inventory_file = Path(inventory_file)
        self.hosts = {}
        self.networks = {}

    def parse_inventory(self) -> Dict[str, str]:
        """Parse inventory file and extract host IP addresses."""
        hosts = {}

        if not self.inventory_file.exists():
            raise FileNotFoundError(f"Inventory file not found: {self.inventory_file}")

        with open(self.inventory_file, 'r') as f:
            for line in f:
                # Match lines with ansible_host
                match = re.search(r'(\S+)\s+.*ansible_host=(\d+\.\d+\.\d+\.\d+)', line.strip())
                if match:
                    hostname, ip = match.groups()
                    hosts[hostname] = ip

        return hosts

    def detect_networks(self) -> Dict[str, Dict]:
        """Detect network patterns from host IPs."""
        if not self.hosts:
            self.hosts = self.parse_inventory()

        networks = {}
        ips = list(self.hosts.values())

        if not ips:
            return networks

        # Group IPs by network prefix
        network_groups = {}
        for ip in ips:
            # Try different subnet sizes
            for prefix_len in [24, 16, 8]:
                try:
                    network = ipaddress.IPv4Network(f"{ip}/{prefix_len}", strict=False)
                    network_str = str(network)

                    if network_str not in network_groups:
                        network_groups[network_str] = []
                    network_groups[network_str].append(ip)
                    break
                except:
                    continue

        # Find the most appropriate network
        if network_groups:
            # Use the network that contains the most IPs
            best_network = max(network_groups.items(), key=lambda x: len(x[1]))
            network_str, network_ips = best_network

            network = ipaddress.IPv4Network(network_str)

            networks['cluster'] = {
                'network': str(network),
                'prefix': str(network.network_address),
                'prefix_length': network.prefixlen,
                'netmask': str(network.netmask),
                'gateway': str(network.network_address + 1),  # Assume first IP is gateway
                'broadcast': str(network.broadcast_address),
                'hosts': network_ips,
                'class_c': '.'.join(str(network.network_address).split('.')[:-1])  # For legacy compatibility
            }

        return networks

    def generate_keepalived_vip(self) -> Optional[str]:
        """Generate a suitable VIP for keepalived."""
        if 'cluster' not in self.networks:
            return None

        cluster_net = ipaddress.IPv4Network(self.networks['cluster']['network'])
        used_ips = set(self.hosts.values())

        # Find an unused IP in the network (preferably low number)
        for ip in cluster_net.hosts():
            if str(ip) not in used_ips:
                return str(ip)

        return None

    def generate_ansible_vars(self) -> Dict:
        """Generate Ansible variables based on detected networks."""
        if not self.networks:
            self.networks = self.detect_networks()

        vars_dict = {}

        if 'cluster' in self.networks:
            cluster = self.networks['cluster']

            vars_dict.update({
                # Network configuration
                'cluster_network': cluster['network'],
                'cluster_network_prefix': cluster['prefix'],
                'cluster_network_prefix_length': cluster['prefix_length'],
                'cluster_netmask': cluster['netmask'],
                'cluster_gateway': cluster['gateway'],

                # Legacy compatibility
                'cluster_nic_class_c': cluster['class_c'],

                # Keepalived VIP
                'keepalived_vip': self.generate_keepalived_vip(),

                # HAProxy backend configuration
                'haproxy_backends': self.generate_haproxy_backends(),
            })

        return vars_dict

    def generate_haproxy_backends(self) -> List[str]:
        """Generate HAProxy backend configuration."""
        backends = []

        for hostname, ip in self.hosts.items():
            # Only include k3s servers as backends
            if any(group in hostname.lower() for group in ['master', 'server', 'pixie']):
                backends.append(f"server k8s-api-{hostname} {ip}:6443 check")

        return backends

    def validate_network(self) -> List[str]:
        """Validate network configuration and return warnings/errors."""
        warnings = []

        if not self.hosts:
            warnings.append("No hosts found in inventory file")
            return warnings

        # Check for IP conflicts
        ip_counts = {}
        for hostname, ip in self.hosts.items():
            if ip in ip_counts:
                ip_counts[ip].append(hostname)
            else:
                ip_counts[ip] = [hostname]

        for ip, hostnames in ip_counts.items():
            if len(hostnames) > 1:
                warnings.append(f"IP conflict: {ip} is used by {', '.join(hostnames)}")

        # Check for mixed networks
        if 'cluster' in self.networks:
            cluster_net = ipaddress.IPv4Network(self.networks['cluster']['network'])
            for hostname, ip in self.hosts.items():
                ip_addr = ipaddress.IPv4Address(ip)
                if ip_addr not in cluster_net:
                    warnings.append(f"Host {hostname} ({ip}) is outside cluster network {cluster_net}")

        return warnings

    def print_summary(self):
        """Print a summary of detected network configuration."""
        if not self.hosts:
            self.hosts = self.parse_inventory()

        if not self.networks:
            self.networks = self.detect_networks()

        print("=== InfraFlux Network Detection Summary ===\n")

        print(f"Inventory file: {self.inventory_file}")
        print(f"Hosts found: {len(self.hosts)}\n")

        if self.hosts:
            print("Detected hosts:")
            for hostname, ip in sorted(self.hosts.items()):
                print(f"  {hostname:20} {ip}")
            print()

        if 'cluster' in self.networks:
            cluster = self.networks['cluster']
            print("Network configuration:")
            print(f"  Network:     {cluster['network']}")
            print(f"  Gateway:     {cluster['gateway']}")
            print(f"  Netmask:     {cluster['netmask']}")
            print(f"  VIP:         {self.generate_keepalived_vip()}")
            print()

        # Validation
        warnings = self.validate_network()
        if warnings:
            print("⚠️  Warnings:")
            for warning in warnings:
                print(f"   {warning}")
        else:
            print("✅ Network configuration looks good!")

        print()


def main():
    parser = argparse.ArgumentParser(description='InfraFlux Network Auto-Detection')
    parser.add_argument('inventory_file', help='Path to Ansible inventory file')
    parser.add_argument('--output', '-o', help='Output file for generated variables (YAML)')
    parser.add_argument('--format', '-f', choices=['yaml', 'json'], default='yaml',
                       help='Output format')
    parser.add_argument('--quiet', '-q', action='store_true', help='Quiet mode')

    args = parser.parse_args()

    try:
        detector = NetworkDetector(args.inventory_file)

        if not args.quiet:
            detector.print_summary()

        if args.output:
            vars_dict = detector.generate_ansible_vars()

            output_path = Path(args.output)

            if args.format == 'yaml':
                import yaml
                with open(output_path, 'w') as f:
                    yaml.dump(vars_dict, f, default_flow_style=False, indent=2)
            else:
                import json
                with open(output_path, 'w') as f:
                    json.dump(vars_dict, f, indent=2)

            if not args.quiet:
                print(f"Variables written to: {output_path}")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
