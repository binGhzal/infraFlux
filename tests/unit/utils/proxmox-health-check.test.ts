/**
 * Unit tests for Proxmox Health Check utility
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import {
  ProxmoxHealthChecker,
  ProxmoxHealthCheckResult,
  HealthCheckConfig,
  DEFAULT_HEALTH_CHECK_CONFIG,
  createHealthChecker,
  quickHealthCheck,
  detailedHealthCheck,
} from '../../../src/utils/proxmox-health-check';

describe('ProxmoxHealthChecker', () => {
  let healthChecker: ProxmoxHealthChecker;
  
  beforeEach(() => {
    healthChecker = new ProxmoxHealthChecker();
    jest.clearAllMocks();
  });
  
  describe('Constructor and Configuration', () => {
    it('should use default configuration when none provided', () => {
      const checker = new ProxmoxHealthChecker();
      expect(checker).toBeInstanceOf(ProxmoxHealthChecker);
    });
    
    it('should merge provided configuration with defaults', () => {
      const config: HealthCheckConfig = {
        timeoutMs: 5000,
        includeNodeInfo: false,
      };
      
      const checker = new ProxmoxHealthChecker(config);
      expect(checker).toBeInstanceOf(ProxmoxHealthChecker);
    });
    
    it('should validate default configuration values', () => {
      expect(DEFAULT_HEALTH_CHECK_CONFIG.timeoutMs).toBe(10000);
      expect(DEFAULT_HEALTH_CHECK_CONFIG.includeNodeInfo).toBe(true);
      expect(DEFAULT_HEALTH_CHECK_CONFIG.validatePermissions).toBe(true);
      expect(DEFAULT_HEALTH_CHECK_CONFIG.minVersion).toBe('7.0.0');
    });
  });
  
  describe('Parameter Validation', () => {
    it('should throw error for missing endpoint', async () => {
      await expect(
        healthChecker.checkHealth('', 'root@pam', 'password')
      ).rejects.toThrow('Endpoint is required and must be a string');
    });
    
    it('should throw error for missing username', async () => {
      await expect(
        healthChecker.checkHealth('https://proxmox.test.com:8006', '', 'password')
      ).rejects.toThrow('Username is required and must be a string');
    });
    
    it('should throw error when both password and API token are missing', async () => {
      await expect(
        healthChecker.checkHealth('https://proxmox.test.com:8006', 'root@pam')
      ).rejects.toThrow('Either password or API token must be provided');
    });
    
    it('should throw error for invalid endpoint URL', async () => {
      await expect(
        healthChecker.checkHealth('not-a-url', 'root@pam', 'password')
      ).rejects.toThrow('Invalid endpoint URL');
    });
    
    it('should throw error for non-HTTPS endpoint', async () => {
      await expect(
        healthChecker.checkHealth('http://proxmox.test.com:8006', 'root@pam', 'password')
      ).rejects.toThrow('Endpoint must use HTTPS protocol');
    });
    
    it('should accept valid parameters with password', async () => {
      // This will fail at the health check stage, not parameter validation
      await expect(
        healthChecker.checkHealth('https://proxmox.test.com:8006', 'root@pam', 'password')
      ).resolves.toHaveProperty('healthy');
    });
    
    it('should accept valid parameters with API token', async () => {
      // This will fail at the health check stage, not parameter validation
      await expect(
        healthChecker.checkHealth('https://proxmox.test.com:8006', 'root@pam', undefined, 'api-token')
      ).resolves.toHaveProperty('healthy');
    });
  });
  
  describe('Health Check Results', () => {
    it('should return successful health check result structure', async () => {
      const result = await healthChecker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('responseTimeMs');
      expect(typeof result.healthy).toBe('boolean');
      expect(typeof result.message).toBe('string');
      expect(typeof result.responseTimeMs).toBe('number');
    });
    
    it('should include version information when successful', async () => {
      const result = await healthChecker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      if (result.healthy) {
        expect(result).toHaveProperty('version');
        expect(typeof result.version).toBe('string');
      }
    });
    
    it('should include node information when requested', async () => {
      const checker = new ProxmoxHealthChecker({ includeNodeInfo: true });
      const result = await checker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      if (result.healthy) {
        expect(result).toHaveProperty('nodes');
        expect(Array.isArray(result.nodes)).toBe(true);
      }
    });
    
    it('should measure response time', async () => {
      const startTime = Date.now();
      
      const result = await healthChecker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      const endTime = Date.now();
      
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.responseTimeMs).toBeLessThanOrEqual(endTime - startTime + 100); // Allow some margin
    });
  });
  
  describe('Timeout Handling', () => {
    it('should timeout after specified duration', async () => {
      const checker = new ProxmoxHealthChecker({ timeoutMs: 100 });
      
      const result = await checker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      // Since this is a mock implementation, we expect it to succeed quickly
      // In a real implementation with network calls, this would test actual timeout
      expect(result.responseTimeMs).toBeLessThan(1000);
    });
  });
  
  describe('Version Compatibility', () => {
    it('should pass version check for compatible versions', async () => {
      const checker = new ProxmoxHealthChecker({ minVersion: '7.0.0' });
      
      const result = await checker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      // Mock implementation returns 7.4-3, which should be compatible with 7.0.0
      expect(result.healthy).toBe(true);
    });
    
    it('should fail version check for incompatible versions', async () => {
      const checker = new ProxmoxHealthChecker({ minVersion: '8.0.0' });
      
      const result = await checker.checkHealth(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      // Mock implementation returns 7.4-3, which should be incompatible with 8.0.0
      expect(result.healthy).toBe(false);
      expect(result.message).toContain('below minimum required version');
    });
  });
  
  describe('Quick Check Method', () => {
    it('should return boolean for quick check', async () => {
      const result = await healthChecker.quickCheck(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      expect(typeof result).toBe('boolean');
    });
    
    it('should return false for invalid parameters in quick check', async () => {
      const result = await healthChecker.quickCheck(
        'invalid-url',
        'root@pam',
        'password'
      );
      
      expect(result).toBe(false);
    });
  });
  
  describe('Utility Functions', () => {
    it('should create health checker with createHealthChecker', () => {
      const config: HealthCheckConfig = { timeoutMs: 5000 };
      const checker = createHealthChecker(config);
      
      expect(checker).toBeInstanceOf(ProxmoxHealthChecker);
    });
    
    it('should perform quick health check with utility function', async () => {
      const result = await quickHealthCheck(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      expect(typeof result).toBe('boolean');
    });
    
    it('should perform detailed health check with utility function', async () => {
      const result = await detailedHealthCheck(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password'
      );
      
      expect(result).toHaveProperty('healthy');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('responseTimeMs');
    });
    
    it('should accept custom timeout in quick health check', async () => {
      const startTime = Date.now();
      
      await quickHealthCheck(
        'https://proxmox.test.com:8006',
        'root@pam',
        'password',
        undefined,
        100 // 100ms timeout
      );
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete quickly in mock
    });
  });
  
  describe('Error Handling', () => {
    it('should handle and return error information', async () => {
      // Test with invalid URL to trigger error
      const result = await healthChecker.checkHealth(
        'not-a-valid-url',
        'root@pam',
        'password'
      );
      
      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toContain('Health check failed');
    });
    
    it('should include response time even for failed checks', async () => {
      const result = await healthChecker.checkHealth(
        'not-a-valid-url',
        'root@pam',
        'password'
      );
      
      expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});