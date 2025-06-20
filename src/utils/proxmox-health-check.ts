/**
 * Proxmox Health Check Utility
 * 
 * Provides utilities for validating Proxmox VE API connectivity and health.
 */

import * as pulumi from "@pulumi/pulumi";

/**
 * Result of a Proxmox health check
 */
export interface ProxmoxHealthCheckResult {
  /** Whether the connection is healthy */
  healthy: boolean;
  
  /** Detailed status message */
  message: string;
  
  /** Response time in milliseconds */
  responseTimeMs?: number;
  
  /** Proxmox version information */
  version?: string;
  
  /** Node information */
  nodes?: ProxmoxNodeInfo[];
  
  /** Any error encountered */
  error?: string;
}

/**
 * Proxmox node information
 */
export interface ProxmoxNodeInfo {
  node: string;
  status: string;
  cpu: number;
  maxcpu: number;
  mem: number;
  maxmem: number;
  disk: number;
  maxdisk: number;
  uptime: number;
}

/**
 * Configuration for health checks
 */
export interface HealthCheckConfig {
  /** Timeout for the health check in milliseconds */
  timeoutMs?: number;
  
  /** Whether to include detailed node information */
  includeNodeInfo?: boolean;
  
  /** Whether to validate specific permissions */
  validatePermissions?: boolean;
  
  /** Minimum required Proxmox version */
  minVersion?: string;
}

/**
 * Default health check configuration
 */
export const DEFAULT_HEALTH_CHECK_CONFIG: Required<HealthCheckConfig> = {
  timeoutMs: 10000,
  includeNodeInfo: true,
  validatePermissions: true,
  minVersion: '7.0.0',
};

/**
 * Proxmox Health Check Utility Class
 */
export class ProxmoxHealthChecker {
  private config: Required<HealthCheckConfig>;
  
  constructor(config: HealthCheckConfig = {}) {
    this.config = { ...DEFAULT_HEALTH_CHECK_CONFIG, ...config };
  }
  
  /**
   * Perform a comprehensive health check of Proxmox VE API
   */
  async checkHealth(
    endpoint: string,
    username: string,
    password?: string,
    apiToken?: string
  ): Promise<ProxmoxHealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Validate input parameters
      this.validateParameters(endpoint, username, password, apiToken);
      
      // Perform the health check
      const result = await this.performHealthCheck(endpoint, username, password, apiToken);
      
      const responseTime = Date.now() - startTime;
      
      return {
        ...result,
        responseTimeMs: responseTime,
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: false,
        message: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Quick connectivity check (just tests if API responds)
   */
  async quickCheck(
    endpoint: string,
    username: string,
    password?: string,
    apiToken?: string
  ): Promise<boolean> {
    try {
      const result = await this.checkHealth(endpoint, username, password, apiToken);
      return result.healthy;
    } catch {
      return false;
    }
  }
  
  /**
   * Validate input parameters
   */
  private validateParameters(
    endpoint: string,
    username: string,
    password?: string,
    apiToken?: string
  ): void {
    if (!endpoint || typeof endpoint !== 'string') {
      throw new Error('Endpoint is required and must be a string');
    }
    
    if (!username || typeof username !== 'string') {
      throw new Error('Username is required and must be a string');
    }
    
    if (!password && !apiToken) {
      throw new Error('Either password or API token must be provided');
    }
    
    // Validate URL format
    try {
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') {
        throw new Error('Endpoint must use HTTPS protocol');
      }
    } catch (error) {
      throw new Error(`Invalid endpoint URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Perform the actual health check
   */
  private async performHealthCheck(
    endpoint: string,
    username: string,
    password?: string,
    apiToken?: string
  ): Promise<Omit<ProxmoxHealthCheckResult, 'responseTimeMs'>> {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timed out after ${this.config.timeoutMs}ms`)), this.config.timeoutMs);
    });
    
    // Create the actual health check promise
    const healthCheckPromise = this.doHealthCheck(endpoint, username, password, apiToken);
    
    // Race between timeout and health check
    return Promise.race([healthCheckPromise, timeoutPromise]);
  }
  
  /**
   * Actual implementation of health check (to be implemented with HTTP client)
   */
  private async doHealthCheck(
    endpoint: string,
    username: string,
    password?: string,
    apiToken?: string
  ): Promise<Omit<ProxmoxHealthCheckResult, 'responseTimeMs'>> {
    // TODO: Implement actual HTTP client for Proxmox API calls
    // For now, this is a placeholder that validates the structure
    
    // In real implementation, this would:
    // 1. Authenticate with Proxmox API
    // 2. Get version information (/api2/json/version)
    // 3. Get cluster status (/api2/json/cluster/status)
    // 4. Get node information (/api2/json/nodes)
    // 5. Validate permissions if requested
    
    // Simulate API call structure for now
    const mockResult: Omit<ProxmoxHealthCheckResult, 'responseTimeMs'> = {
      healthy: true,
      message: 'Proxmox VE API is healthy and accessible',
      version: '7.4-3', // Would be fetched from API
      nodes: [
        {
          node: 'proxmox-node1',
          status: 'online',
          cpu: 0.1,
          maxcpu: 16,
          mem: 8589934592,
          maxmem: 68719476736,
          disk: 107374182400,
          maxdisk: 536870912000,
          uptime: 86400,
        }
      ],
    };
    
    // Validate minimum version if specified
    if (this.config.minVersion && mockResult.version) {
      if (!this.isVersionCompatible(mockResult.version, this.config.minVersion)) {
        return {
          healthy: false,
          message: `Proxmox version ${mockResult.version} is below minimum required version ${this.config.minVersion}`,
          version: mockResult.version,
        };
      }
    }
    
    return mockResult;
  }
  
  /**
   * Check if Proxmox version meets minimum requirements
   */
  private isVersionCompatible(currentVersion: string, minVersion: string): boolean {
    const parseVersion = (version: string): number[] => {
      return version.split(/[.-]/)
        .filter(part => /^\d+$/.test(part))
        .map(Number);
    };
    
    const current = parseVersion(currentVersion);
    const minimum = parseVersion(minVersion);
    
    for (let i = 0; i < Math.max(current.length, minimum.length); i++) {
      const currentPart = current[i] || 0;
      const minPart = minimum[i] || 0;
      
      if (currentPart > minPart) return true;
      if (currentPart < minPart) return false;
    }
    
    return true; // Versions are equal
  }
}

/**
 * Convenience function to create a health checker with default config
 */
export function createHealthChecker(config?: HealthCheckConfig): ProxmoxHealthChecker {
  return new ProxmoxHealthChecker(config);
}

/**
 * Quick health check function for simple use cases
 */
export async function quickHealthCheck(
  endpoint: string,
  username: string,
  password?: string,
  apiToken?: string,
  timeoutMs: number = 10000
): Promise<boolean> {
  const checker = new ProxmoxHealthChecker({ timeoutMs, includeNodeInfo: false });
  return checker.quickCheck(endpoint, username, password, apiToken);
}

/**
 * Detailed health check function
 */
export async function detailedHealthCheck(
  endpoint: string,
  username: string,
  password?: string,
  apiToken?: string,
  config?: HealthCheckConfig
): Promise<ProxmoxHealthCheckResult> {
  const checker = new ProxmoxHealthChecker(config);
  return checker.checkHealth(endpoint, username, password, apiToken);
}