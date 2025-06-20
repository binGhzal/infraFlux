/**
 * Integration tests for VM Component
 */

import { VMComponent } from '../../src/components/compute/vm-component';
import { createNodeConfig } from '../../src/config/defaults';

describe('VMComponent Integration', () => {
  const mockProps = {
    nodeConfig: createNodeConfig('test-vm', 'worker'),
    proxmoxNode: 'test-node',
    networkBridge: 'vmbr0',
    template: 'talos-test',
  };

  it('should create VM component with valid configuration', () => {
    expect(() => {
      new VMComponent('test-vm', mockProps);
    }).not.toThrow();
  });

  it('should have correct VM properties', () => {
    const component = new VMComponent('test-vm', mockProps);
    
    expect(component.vm.name).toBe('test-vm');
    expect(component.vm.node).toBe('test-node');
    expect(component.vm.template).toBe('talos-test');
    expect(component.vm.specs.cores).toBe(4);
    expect(component.vm.specs.memory).toBe(8192);
  });

  // TODO: Add more integration tests
  // - Test with different node configurations
  // - Test network interface configuration
  // - Test disk configuration
  // - Test with custom cloud-init
});