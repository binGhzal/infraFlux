#!/bin/bash
# Test script for configuration generation

echo "🧪 Testing InfraFlux Config Generation"

# Clean up previous runs
rm -rf _out/

# Test 1: Generate configurations
echo "📋 Test 1: Generating configurations..."
python3 scripts/generate-configs.py

if [ $? -eq 0 ]; then
    echo "✅ Configuration generation successful"
else
    echo "❌ Configuration generation failed"
    exit 1
fi

# Test 2: Verify expected files exist
echo "📋 Test 2: Verifying generated files..."
expected_files=(
    "_out/talos/secrets.yaml"
    "_out/talos/controlplane-0.yaml"
    "_out/talos/controlplane-1.yaml"
    "_out/talos/controlplane-2.yaml"
    "_out/talos/worker-0.yaml"
    "_out/talos/worker-1.yaml"
    "_out/talos/worker-2.yaml"
    "_out/talos/talosconfig"
    "_out/terraform/main.tf"
)

all_files_exist=true
for file in "${expected_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $file"
    else
        echo "❌ Missing: $file"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = true ]; then
    echo "✅ All expected files generated"
else
    echo "❌ Some files are missing"
    exit 1
fi

# Test 3: Validate YAML syntax
echo "📋 Test 3: Validating YAML syntax..."
yaml_files=(_out/talos/*.yaml)
for file in "${yaml_files[@]}"; do
    if python3 -c "import yaml; yaml.safe_load(open('$file'))" 2>/dev/null; then
        echo "✅ Valid YAML: $file"
    else
        echo "❌ Invalid YAML: $file"
        exit 1
    fi
done

echo "🎉 All tests passed! Configuration generation is working correctly."
