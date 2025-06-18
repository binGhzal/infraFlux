# InfraFlux Secrets Management

This directory contains templates and examples for managing secrets in InfraFlux.

## Directory Structure

```
secrets/
├── README.md                 # This file
├── examples/                # Example secrets files (never commit real values)
│   └── secrets-example.env  # Example environment variables
└── templates/               # Sealed secrets templates
    └── (moved from templates/sealed-secrets/)
```

## Security Guidelines

1. **NEVER commit real secrets** to this repository
2. Use the example files as templates for your own secrets
3. Real secrets should be:
   - Stored in a secure password manager
   - Loaded via environment variables
   - Managed through Kubernetes Sealed Secrets

## Usage

1. Copy `examples/secrets-example.env` to your local environment
2. Fill in your actual values
3. Use the configure script to generate sealed secrets
4. Deploy using the sealed secrets templates

## Sealed Secrets

InfraFlux uses Sealed Secrets for secure secret management in GitOps workflows.
Templates in the `templates/` directory show the proper format for each service.