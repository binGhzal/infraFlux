# InfraFlux v2.0 - End-to-End Testing Framework

This directory contains comprehensive end-to-end testing for the InfraFlux v2.0 platform.

## 📋 **Test Structure**

```
tests/e2e/
├── README.md               # This file - testing documentation
├── reports/                # Test execution reports and results
├── fixtures/               # Test configuration files and data
├── scripts/                # Additional test utilities
└── test-scenarios/         # Specific test scenarios and cases
```

## 🚀 **Running Tests**

### **Basic Validation**
```bash
# Run comprehensive validation tests
./scripts/test-e2e-deployment.sh

# Test specific configuration
./scripts/test-e2e-deployment.sh config/cluster-config.yaml
```

### **Advanced Testing**
```bash
# Include deployment dry-run simulation
./scripts/test-e2e-deployment.sh config/cluster-config.yaml dry-run

# Full deployment testing (requires infrastructure)
./scripts/test-e2e-deployment.sh config/cluster-config.yaml full-deploy
```

## 📊 **Test Coverage**

### **Phase 1: Prerequisites and Configuration**
- ✅ Tool availability (python3, yq, terraform, kubectl, etc.)
- ✅ Python dependencies (yaml, jinja2, ipaddress)
- ✅ Configuration file validation and syntax
- ✅ Required configuration fields validation

### **Phase 2: Template Generation and Validation**
- ✅ Configuration generator syntax and execution
- ✅ Template rendering for Talos and Terraform
- ✅ Generated configuration validation
- ✅ Terraform syntax and formatting checks

### **Phase 3: GitOps Structure and Manifests**
- ✅ Directory structure validation
- ✅ Kustomization file syntax and structure
- ✅ Application manifest validation
- ✅ Helm release configuration checks

### **Phase 4: Script and Automation Validation**
- ✅ Deployment script syntax and executability
- ✅ Automation script validation
- ✅ Tool integration testing

### **Phase 5: Deployment Process Simulation**
- ✅ Terraform plan validation (dry-run mode)
- ✅ Kubernetes manifest dry-run application
- ✅ Full deployment simulation (when infrastructure available)

### **Phase 6: Security and Performance Features**
- ✅ Security configuration validation
- ✅ Performance optimization settings
- ✅ Monitoring integration checks
- ✅ Resource management validation

### **Phase 7: Documentation and Completeness**
- ✅ Documentation file existence and completeness
- ✅ Template file validation
- ✅ Architecture documentation consistency

## 📈 **Test Reporting**

Test results are automatically generated and stored in `reports/` directory:

- **JSON Reports**: Machine-readable test results with detailed metrics
- **Log Files**: Complete test execution logs with timestamps
- **Summary Reports**: Human-readable test summaries

### **Report Format**
```json
{
  "test_id": "e2e-20250119-143022",
  "timestamp": "2025-01-19T14:30:22+00:00",
  "duration_seconds": 45,
  "test_mode": "validate",
  "summary": {
    "total_tests": 50,
    "passed_tests": 48,
    "failed_tests": 0,
    "warning_tests": 2,
    "success_rate": "96.00%"
  },
  "failures": [],
  "warnings": ["Optional test failed", "Tool not available"]
}
```

## 🔧 **Test Configuration**

### **Test Modes**

1. **`validate`** (Default)
   - Configuration and template validation
   - Syntax checking and static analysis
   - No deployment simulation
   - Fast execution (~30-60 seconds)

2. **`dry-run`**
   - All validation tests
   - Terraform plan generation
   - Kubernetes dry-run application
   - Deployment simulation without actual deployment
   - Medium execution time (~2-5 minutes)

3. **`full-deploy`**
   - Complete deployment testing
   - Requires actual Proxmox infrastructure
   - Full cluster deployment and validation
   - Long execution time (~10-30 minutes)

### **Configuration Requirements**

The test framework validates these configuration requirements:

- **Required Fields**: cluster_name, talos_version, kubernetes_version, control_plane_ips, worker_ips
- **IP Address Validation**: Valid IPv4 addresses for all node IPs
- **Control Plane HA**: Odd number of control plane nodes for HA
- **Production Features**: Security, performance, and monitoring settings

## 🛠️ **Extending Tests**

### **Adding New Test Cases**

1. **Add to main test script**: Extend `scripts/test-e2e-deployment.sh`
2. **Create specific test functions**: Follow existing pattern
3. **Update documentation**: Document new test coverage

### **Creating Test Fixtures**

```bash
# Create test configuration
cp config/cluster-config.yaml tests/e2e/fixtures/test-config.yaml

# Modify for testing
vim tests/e2e/fixtures/test-config.yaml
```

### **Test Utilities**

Additional test utilities can be added to `scripts/` directory:

- **Performance testing**: Benchmark deployment performance
- **Security testing**: Validate security configurations
- **Integration testing**: Test with external systems

## 🔍 **Troubleshooting**

### **Common Test Failures**

1. **Missing Tools**: Install required tools (terraform, kubectl, yq)
2. **Configuration Errors**: Validate configuration file syntax
3. **Template Issues**: Check Jinja2 template syntax
4. **Dependency Issues**: Install Python dependencies (yaml, jinja2)

### **Debug Mode**

Enable detailed logging by checking the test log files:

```bash
# View latest test log
tail -f /tmp/infraflux-e2e-*/e2e-test.log

# View specific test report
cat tests/e2e/reports/e2e-report-*.json | jq .
```

## ✅ **Success Criteria**

Tests are considered successful when:

- **All critical tests pass**: Core functionality validated
- **Warnings are acceptable**: Optional features may generate warnings
- **Performance targets met**: Tests complete within expected time
- **Report generated**: Detailed test report created successfully

## 🎯 **Continuous Integration**

This test framework is designed for CI/CD integration:

- **Fast feedback**: Validate mode runs quickly for pull requests
- **Comprehensive testing**: Dry-run mode for merge validation
- **Production validation**: Full-deploy mode for production deployments

The test framework ensures InfraFlux v2.0 deployments are reliable, secure, and production-ready! 🚀