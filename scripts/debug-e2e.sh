#!/bin/bash
# Debug version of e2e test to identify issues

set -euo pipefail

echo "Starting debug e2e test..."

# Test basic commands that the e2e test uses
echo "Testing tool availability..."

tools=("python3" "yq" "terraform" "kubectl" "git" "curl")
for tool in "${tools[@]}"; do
    if command -v "$tool" >/dev/null 2>&1; then
        echo "✅ $tool: $(command -v "$tool")"
    else
        echo "❌ $tool: not found"
    fi
done

echo ""
echo "Testing Python modules..."

# Test Python imports
if python3 -c 'import yaml' 2>/dev/null; then
    echo "✅ yaml module"
else
    echo "❌ yaml module"
fi

if python3 -c 'import jinja2' 2>/dev/null; then
    echo "✅ jinja2 module"
else
    echo "❌ jinja2 module"
fi

echo ""
echo "Testing configuration file..."

CONFIG_FILE="${1:-tests/e2e/fixtures/test-cluster-config.yaml}"

if [[ -f "$CONFIG_FILE" ]]; then
    echo "✅ Config file exists: $CONFIG_FILE"
else
    echo "❌ Config file missing: $CONFIG_FILE"
    exit 1
fi

if yq eval '.' "$CONFIG_FILE" >/dev/null 2>&1; then
    echo "✅ Config file YAML syntax"
else
    echo "❌ Config file YAML syntax error"
    exit 1
fi

echo ""
echo "Testing configuration generator..."

if python3 scripts/generate-configs.py --config "$CONFIG_FILE" --validate-only; then
    echo "✅ Configuration validation passed"
else
    echo "❌ Configuration validation failed"
    exit 1
fi

echo ""
echo "🎉 All debug tests passed!"