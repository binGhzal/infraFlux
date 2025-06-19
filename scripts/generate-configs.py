#!/usr/bin/env python3
"""
InfraFlux v2.0 Configuration Generator
Generates all Talos and Terraform configurations from master config
"""

import yaml
import json
import os
import sys
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape, StrictUndefined

class InfraFluxConfigGenerator:
    def __init__(self, config_file="config/cluster-config.yaml", template_dir="templates", output_dir="_out"):
        self.config_file = Path(config_file)
        self.template_dir = Path(template_dir)
        self.output_dir = Path(output_dir)

        # Load configuration
        self.config = self._load_config()

        # Initialize Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(self.template_dir),
            autoescape=select_autoescape(['html', 'xml']),
            undefined=StrictUndefined,
            trim_blocks=True,
            lstrip_blocks=True
        )

        # Register custom filters
        self._register_filters()

    def _load_config(self):
        """Load and validate configuration file"""
        try:
            with open(self.config_file, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            print(f"❌ Failed to load config: {e}")
            sys.exit(1)

    def _register_filters(self):
        """Register custom Jinja2 filters"""

        @self.env.filter('to_json')
        def to_json(value, indent=2):
            return json.dumps(value, indent=indent)

        @self.env.filter('to_yaml')
        def to_yaml_filter(value, indent=2):
            return yaml.dump(value, default_flow_style=False, indent=indent)

    def generate_talos_configs(self):
        """Generate Talos machine configurations"""
        print("🔄 Generating Talos configurations...")

        # Create output directories
        talos_dir = self.output_dir / "talos"
        talos_dir.mkdir(parents=True, exist_ok=True)

        # Generate secrets if they don't exist
        secrets_file = talos_dir / "secrets.yaml"
        if not secrets_file.exists():
            print("  Generating Talos secrets...")
            os.system(f"talosctl gen secrets -o {secrets_file}")

        # Load secrets
        with open(secrets_file, 'r') as f:
            secrets = yaml.safe_load(f)

        # Prepare template variables
        template_vars = {
            'config': self.config,
            'cluster': {
                'token': secrets['cluster']['token'],
                'secret': secrets['cluster']['secret'],
                'id': secrets['cluster']['id'],
                'ca': secrets['cluster']['ca'],
                'endpoint': f"https://{self.config['data']['control_plane_ips'][0]}:6443"
            }
        }

        # Generate control plane configs
        for i, ip in enumerate(self.config['data']['control_plane_ips']):
            template_vars['node'] = {
                'hostname': f"{self.config['data']['cluster_name']}-cp-{i+1}",
                'ip': ip
            }
            template_vars['network'] = {'gateway': '10.0.0.1'}  # TODO: Auto-detect

            self._render_template(
                'talos/controlplane.yaml.j2',
                talos_dir / f"controlplane-{i}.yaml",
                template_vars
            )

        # Generate worker configs
        for i, ip in enumerate(self.config['data']['worker_ips']):
            template_vars['node'] = {
                'hostname': f"{self.config['data']['cluster_name']}-worker-{i+1}",
                'ip': ip
            }
            template_vars['network'] = {'gateway': '10.0.0.1'}  # TODO: Auto-detect

            self._render_template(
                'talos/worker.yaml.j2',
                talos_dir / f"worker-{i}.yaml",
                template_vars
            )

        # Generate talosconfig
        talosconfig = {
            'context': self.config['data']['cluster_name'],
            'contexts': {
                self.config['data']['cluster_name']: {
                    'endpoints': self.config['data']['control_plane_ips'],
                    'nodes': self.config['data']['control_plane_ips'],
                    'ca': secrets['cluster']['ca']['crt'],
                    'crt': secrets['certs']['admin']['crt'],
                    'key': secrets['certs']['admin']['key']
                }
            }
        }

        with open(talos_dir / "talosconfig", 'w') as f:
            yaml.dump(talosconfig, f, default_flow_style=False)

        print("✅ Talos configurations generated")

    def generate_terraform_configs(self):
        """Generate Terraform configurations"""
        print("🔄 Generating Terraform configurations...")

        # Create output directory
        terraform_dir = self.output_dir / "terraform"
        terraform_dir.mkdir(parents=True, exist_ok=True)

        # Template variables
        template_vars = {'config': self.config}

        # Generate main Terraform configuration
        self._render_template(
            'terraform/main.tf.j2',
            terraform_dir / "main.tf",
            template_vars
        )

        print("✅ Terraform configurations generated")

    def _render_template(self, template_path, output_path, variables):
        """Render a single template"""
        try:
            template = self.env.get_template(template_path)
            rendered = template.render(**variables)

            # Ensure output directory exists
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, 'w') as f:
                f.write(rendered)

            print(f"  Generated: {output_path}")

        except Exception as e:
            print(f"❌ Error rendering {template_path}: {e}")
            return False

        return True

    def validate_config(self):
        """Validate configuration"""
        print("🔍 Validating configuration...")

        data = self.config.get('data', {})
        errors = []

        # Required fields
        required_fields = [
            'cluster_name', 'talos_version', 'kubernetes_version',
            'control_plane_ips', 'worker_ips', 'proxmox_host'
        ]

        for field in required_fields:
            if not data.get(field):
                errors.append(f"Missing required field: {field}")

        # Validate IP addresses
        import ipaddress
        for ip_list, name in [(data.get('control_plane_ips', []), 'control_plane_ips'),
                              (data.get('worker_ips', []), 'worker_ips')]:
            for ip in ip_list:
                try:
                    ipaddress.ip_address(ip)
                except ValueError:
                    errors.append(f"Invalid IP in {name}: {ip}")

        # Validate control plane count (must be odd for HA)
        cp_count = len(data.get('control_plane_ips', []))
        if cp_count > 1 and cp_count % 2 == 0:
            errors.append("Control plane count must be odd for HA")

        if errors:
            print("❌ Configuration errors:")
            for error in errors:
                print(f"   - {error}")
            return False

        print("✅ Configuration validation passed")
        return True

    def generate_all(self):
        """Generate all configurations"""
        if not self.validate_config():
            sys.exit(1)

        self.generate_talos_configs()
        self.generate_terraform_configs()

        print(f"\n🎉 All configurations generated in {self.output_dir}/")
        print(f"Next steps:")
        print(f"  1. Review generated configurations")
        print(f"  2. Run: ./deploy.sh")

def main():
    import argparse

    parser = argparse.ArgumentParser(description="InfraFlux v2.0 Configuration Generator")
    parser.add_argument('--config', default='config/cluster-config.yaml',
                       help='Configuration file path')
    parser.add_argument('--templates', default='templates',
                       help='Templates directory')
    parser.add_argument('--output', default='_out',
                       help='Output directory')
    parser.add_argument('--validate-only', action='store_true',
                       help='Only validate configuration')

    args = parser.parse_args()

    generator = InfraFluxConfigGenerator(args.config, args.templates, args.output)

    if args.validate_only:
        success = generator.validate_config()
        sys.exit(0 if success else 1)

    generator.generate_all()

if __name__ == "__main__":
    main()