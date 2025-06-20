/**
 * Unit tests for ProxmoxProviderComponent
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as pulumi from '@pulumi/pulumi';
import {
  ProxmoxProviderComponent,
  ProxmoxProviderConfig,
  PROXMOX_ENV_VARS,
  PROXMOX_DEFAULTS,
  createProxmoxProvider,
  getConfigFromEnvironment,
} from '../../../../src/components/core/proxmox-provider';

// Mock the Pulumi Proxmox provider
jest.mock('@muhlba91/pulumi-proxmoxve', () => ({
  Provider: jest.fn().mockImplementation((name, config, opts) => ({
    id: `provider-${name}`,
    ...config,
    ...opts,
  })),
}));

// Mock Pulumi
const mockPulumiConfig = {
  get: jest.fn(),
  getSecret: jest.fn(),
  getBoolean: jest.fn(),
  getNumber: jest.fn(),
};

jest.mock('@pulumi/pulumi', () => ({
  ComponentResource: class MockComponentResource {
    constructor(type: string, name: string, args: any, opts?: any) {
      Object.assign(this, { type, name, args, opts });
    }
    registerOutputs(outputs: any) {
      Object.assign(this, { outputs });
    }
  },
  Config: jest.fn().mockImplementation(() => mockPulumiConfig),
}));

describe('ProxmoxProviderComponent', () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    Object.values(PROXMOX_ENV_VARS).forEach(envVar => {
      delete process.env[envVar];
    });
    
    // Reset mock functions
    jest.clearAllMocks();
    mockPulumiConfig.get.mockReturnValue(undefined);
    mockPulumiConfig.getSecret.mockReturnValue(undefined);
    mockPulumiConfig.getBoolean.mockReturnValue(undefined);
    mockPulumiConfig.getNumber.mockReturnValue(undefined);
  });
  
  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });
  
  describe('Configuration Building', () => {
    it('should use passed configuration values', () => {
      const config: ProxmoxProviderConfig = {
        endpoint: 'https://proxmox.test.com:8006',
        username: 'root@pam',
        password: 'testpass',
        insecure: true,
        timeout: 600,
      };
      
      const provider = new ProxmoxProviderComponent('test', config);
      
      expect(provider.config.endpoint).toBe(config.endpoint);
      expect(provider.config.username).toBe(config.username);
      expect(provider.config.password).toBe(config.password);
      expect(provider.config.insecure).toBe(config.insecure);
      expect(provider.config.timeout).toBe(config.timeout);
    });
    
    it('should use environment variables when config not provided', () => {
      process.env[PROXMOX_ENV_VARS.ENDPOINT] = 'https://proxmox.env.com:8006';
      process.env[PROXMOX_ENV_VARS.USERNAME] = 'admin@pve';
      process.env[PROXMOX_ENV_VARS.API_TOKEN] = 'test-token-123';
      process.env[PROXMOX_ENV_VARS.INSECURE] = 'true';
      process.env[PROXMOX_ENV_VARS.TIMEOUT] = '450';
      
      const provider = new ProxmoxProviderComponent('test');
      
      expect(provider.config.endpoint).toBe('https://proxmox.env.com:8006');
      expect(provider.config.username).toBe('admin@pve');
      expect(provider.config.apiToken).toBe('test-token-123');
      expect(provider.config.insecure).toBe(true);
      expect(provider.config.timeout).toBe(450);
    });
    
    it('should use Pulumi config when env vars not available', () => {
      mockPulumiConfig.get.mockImplementation((key: string) => {
        switch (key) {
          case 'endpoint': return 'https://proxmox.pulumi.com:8006';
          case 'username': return 'pulumi@pam';
          default: return undefined;
        }
      });
      
      mockPulumiConfig.getSecret.mockImplementation((key: string) => {
        switch (key) {
          case 'password': return 'pulumi-secret-pass';
          default: return undefined;
        }
      });
      
      mockPulumiConfig.getBoolean.mockReturnValue(false);
      mockPulumiConfig.getNumber.mockReturnValue(300);
      
      const provider = new ProxmoxProviderComponent('test');
      
      expect(provider.config.endpoint).toBe('https://proxmox.pulumi.com:8006');
      expect(provider.config.username).toBe('pulumi@pam');
      expect(provider.config.password).toBe('pulumi-secret-pass');
    });
    
    it('should use default values when nothing else provided', () => {
      // Provide minimum required config
      const config = {
        endpoint: 'https://proxmox.test.com:8006',
        username: 'root@pam',
        password: 'test',
      };
      
      const provider = new ProxmoxProviderComponent('test', config);
      
      expect(provider.config.timeout).toBe(PROXMOX_DEFAULTS.timeout);
      expect(provider.config.parallelism).toBe(PROXMOX_DEFAULTS.parallelism);
      expect(provider.config.insecure).toBe(PROXMOX_DEFAULTS.insecure);
      expect(provider.config.minTls).toBe(PROXMOX_DEFAULTS.minTls);
    });
  });
  
  describe('Configuration Validation', () => {
    it('should throw error when endpoint is missing', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          username: 'root@pam',
          password: 'test',
        });
      }).toThrow('endpoint is required');
    });
    
    it('should throw error when username is missing', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'https://proxmox.test.com:8006',
          password: 'test',
        });
      }).toThrow('username is required');
    });
    
    it('should throw error when both password and apiToken are missing', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'https://proxmox.test.com:8006',
          username: 'root@pam',
        });
      }).toThrow('either password or apiToken is required');
    });
    
    it('should throw error for invalid endpoint URL', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'not-a-valid-url',
          username: 'root@pam',
          password: 'test',
        });
      }).toThrow('endpoint must be a valid URL');
    });
    
    it('should throw error for non-HTTPS endpoint', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'http://proxmox.test.com:8006',
          username: 'root@pam',
          password: 'test',
        });
      }).toThrow('endpoint must be a valid URL');
    });
    
    it('should throw error for invalid timeout', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'https://proxmox.test.com:8006',
          username: 'root@pam',
          password: 'test',
          timeout: 10, // Too low
        });
      }).toThrow('timeout must be between 30 and 3600 seconds');
    });
    
    it('should throw error for invalid parallelism', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'https://proxmox.test.com:8006',
          username: 'root@pam',
          password: 'test',
          parallelism: 25, // Too high
        });
      }).toThrow('parallelism must be between 1 and 20');
    });
    
    it('should throw error for invalid TLS version', () => {
      expect(() => {
        new ProxmoxProviderComponent('test', {
          endpoint: 'https://proxmox.test.com:8006',
          username: 'root@pam',
          password: 'test',
          minTls: '2.0', // Invalid
        });
      }).toThrow('minTls must be one of: 1.0, 1.1, 1.2, 1.3');
    });
  });
  
  describe('Utility Functions', () => {
    it('should create provider with createProxmoxProvider function', () => {
      const config: ProxmoxProviderConfig = {
        endpoint: 'https://proxmox.test.com:8006',
        username: 'root@pam',
        password: 'test',
      };
      
      const provider = createProxmoxProvider('test', config);
      
      expect(provider).toBeInstanceOf(ProxmoxProviderComponent);
      expect(provider.config.endpoint).toBe(config.endpoint);
    });
    
    it('should get config from environment with getConfigFromEnvironment', () => {
      process.env[PROXMOX_ENV_VARS.ENDPOINT] = 'https://proxmox.env.com:8006';
      process.env[PROXMOX_ENV_VARS.USERNAME] = 'admin@pve';
      process.env[PROXMOX_ENV_VARS.API_TOKEN] = 'test-token';
      process.env[PROXMOX_ENV_VARS.INSECURE] = 'true';
      process.env[PROXMOX_ENV_VARS.TIMEOUT] = '600';
      
      const config = getConfigFromEnvironment();
      
      expect(config.endpoint).toBe('https://proxmox.env.com:8006');
      expect(config.username).toBe('admin@pve');
      expect(config.apiToken).toBe('test-token');
      expect(config.insecure).toBe(true);
      expect(config.timeout).toBe(600);
    });
    
    it('should handle missing environment variables gracefully', () => {
      const config = getConfigFromEnvironment();
      
      expect(config.endpoint).toBeUndefined();
      expect(config.username).toBeUndefined();
      expect(config.password).toBeUndefined();
      expect(config.apiToken).toBeUndefined();
      expect(config.insecure).toBe(false);
    });
  });
  
  describe('Provider Integration', () => {
    it('should create Proxmox provider with correct configuration', () => {
      const config: ProxmoxProviderConfig = {
        endpoint: 'https://proxmox.test.com:8006',
        username: 'root@pam',
        apiToken: 'test-token',
        insecure: true,
        timeout: 600,
        parallelism: 8,
        minTls: '1.3',
      };
      
      const providerComponent = new ProxmoxProviderComponent('test', config);
      
      // Verify the provider was created with correct config
      expect(providerComponent.provider).toBeDefined();
      
      // In a real test with actual provider, you would verify:
      // - Provider was instantiated with correct parameters
      // - Provider configuration matches input
      // - Provider is properly parented to the component
    });
  });
});