/**
 * Proxmox Provider Component for InfraFlux v2.0
 * 
 * This component manages the Proxmox VE provider configuration and authentication
 * for all Proxmox-based infrastructure resources.
 */

import * as pulumi from "@pulumi/pulumi";
import * as proxmoxve from "@muhlba91/pulumi-proxmoxve";

/**
 * Configuration interface for Proxmox VE provider
 */
export interface ProxmoxProviderConfig {
  /** Proxmox VE API endpoint (e.g., https://proxmox.example.com:8006) */
  endpoint: string;
  
  /** Username for authentication (e.g., root@pam or user@realm) */
  username: string;
  
  /** Password for authentication (alternative to API token) */
  password?: string;
  
  /** API token for authentication (preferred over password) */
  apiToken?: string;
  
  /** Allow insecure SSL connections (for development/self-signed certs) */
  insecure?: boolean;
  
  /** Connection timeout in seconds */
  timeout?: number;
  
  /** Maximum parallel operations */
  parallelism?: number;
  
  /** Minimum TLS version (1.0, 1.1, 1.2, 1.3) */
  minTls?: string;
}

/**
 * Environment variable names for Proxmox configuration
 */
export const PROXMOX_ENV_VARS = {
  ENDPOINT: 'PROXMOX_VE_ENDPOINT',
  USERNAME: 'PROXMOX_VE_USERNAME', 
  PASSWORD: 'PROXMOX_VE_PASSWORD',
  API_TOKEN: 'PROXMOX_VE_API_TOKEN',
  INSECURE: 'PROXMOX_VE_INSECURE',
  TIMEOUT: 'PROXMOX_VE_TIMEOUT',
  PARALLELISM: 'PROXMOX_VE_PARALLELISM',
  MIN_TLS: 'PROXMOX_VE_MIN_TLS'
} as const;

/**
 * Default configuration values
 */
export const PROXMOX_DEFAULTS = {
  timeout: 300,
  parallelism: 4,
  insecure: false,
  minTls: '1.2'
} as const;

/**
 * Proxmox Provider Component
 * 
 * Manages the Proxmox VE provider instance with proper configuration
 * and connection validation.
 */
export class ProxmoxProviderComponent extends pulumi.ComponentResource {
  /** The configured Proxmox VE provider instance */
  public readonly provider: proxmoxve.Provider;
  
  /** Provider configuration used */
  public readonly config: ProxmoxProviderConfig;
  
  /**
   * Create a new Proxmox Provider Component
   * 
   * @param name Resource name
   * @param config Provider configuration (will be merged with env vars and defaults)
   * @param opts Pulumi component resource options
   */
  constructor(
    name: string, 
    config: Partial<ProxmoxProviderConfig> = {},
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("infraflux:core:ProxmoxProvider", name, {}, opts);
    
    // Merge configuration from environment variables, passed config, and defaults
    this.config = this.buildConfiguration(config);
    
    // Validate the configuration
    this.validateConfiguration(this.config);
    
    // Create the Proxmox VE provider
    this.provider = new proxmoxve.Provider(`${name}-provider`, {
      endpoint: this.config.endpoint,
      username: this.config.username,
      password: this.config.password,
      apiToken: this.config.apiToken,
      insecure: this.config.insecure,
      // Note: timeout, parallelism, minTls may not be supported by provider
      // Keep them in config for future use or custom implementation
    }, { parent: this });
    
    // Register outputs
    this.registerOutputs({
      providerId: this.provider.id,
      endpoint: this.config.endpoint,
      username: this.config.username,
    });
  }
  
  /**
   * Build configuration by merging environment variables, passed config, and defaults
   */
  private buildConfiguration(config: Partial<ProxmoxProviderConfig>): ProxmoxProviderConfig {
    const pulumiConfig = new pulumi.Config("proxmox");
    
    return {
      endpoint: config.endpoint 
        || process.env[PROXMOX_ENV_VARS.ENDPOINT] 
        || pulumiConfig.get("endpoint") 
        || "",
        
      username: config.username 
        || process.env[PROXMOX_ENV_VARS.USERNAME] 
        || pulumiConfig.get("username") 
        || "",
        
      password: config.password 
        || process.env[PROXMOX_ENV_VARS.PASSWORD] 
        || pulumiConfig.getSecret("password")
        || undefined,
        
      apiToken: config.apiToken 
        || process.env[PROXMOX_ENV_VARS.API_TOKEN] 
        || pulumiConfig.getSecret("apiToken")
        || undefined,
        
      insecure: config.insecure 
        || (process.env[PROXMOX_ENV_VARS.INSECURE]?.toLowerCase() === 'true') 
        || pulumiConfig.getBoolean("insecure") 
        || PROXMOX_DEFAULTS.insecure,
        
      timeout: config.timeout 
        || parseInt(process.env[PROXMOX_ENV_VARS.TIMEOUT] || "") 
        || pulumiConfig.getNumber("timeout") 
        || PROXMOX_DEFAULTS.timeout,
        
      parallelism: config.parallelism 
        || parseInt(process.env[PROXMOX_ENV_VARS.PARALLELISM] || "") 
        || pulumiConfig.getNumber("parallelism") 
        || PROXMOX_DEFAULTS.parallelism,
        
      minTls: config.minTls 
        || process.env[PROXMOX_ENV_VARS.MIN_TLS] 
        || pulumiConfig.get("minTls") 
        || PROXMOX_DEFAULTS.minTls,
    };
  }
  
  /**
   * Validate the provider configuration
   */
  private validateConfiguration(config: ProxmoxProviderConfig): void {
    const errors: string[] = [];
    
    // Validate required fields
    if (!config.endpoint) {
      errors.push("endpoint is required (set PROXMOX_VE_ENDPOINT or pulumi config)");
    }
    
    if (!config.username) {
      errors.push("username is required (set PROXMOX_VE_USERNAME or pulumi config)");
    }
    
    // Must have either password or API token
    if (!config.password && !config.apiToken) {
      errors.push("either password or apiToken is required");
    }
    
    // Validate endpoint URL format
    if (config.endpoint && !this.isValidUrl(config.endpoint)) {
      errors.push("endpoint must be a valid URL (e.g., https://proxmox.example.com:8006)");
    }
    
    // Validate timeout
    if (config.timeout && (config.timeout < 30 || config.timeout > 3600)) {
      errors.push("timeout must be between 30 and 3600 seconds");
    }
    
    // Validate parallelism
    if (config.parallelism && (config.parallelism < 1 || config.parallelism > 20)) {
      errors.push("parallelism must be between 1 and 20");
    }
    
    // Validate TLS version
    if (config.minTls && !['1.0', '1.1', '1.2', '1.3'].includes(config.minTls)) {
      errors.push("minTls must be one of: 1.0, 1.1, 1.2, 1.3");
    }
    
    if (errors.length > 0) {
      throw new Error(`Proxmox provider configuration errors:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
  }
  
  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  }
}

/**
 * Utility function to create a Proxmox provider with environment variable configuration
 */
export function createProxmoxProvider(
  name: string,
  config: Partial<ProxmoxProviderConfig> = {},
  opts?: pulumi.ComponentResourceOptions
): ProxmoxProviderComponent {
  return new ProxmoxProviderComponent(name, config, opts);
}

/**
 * Get configuration from environment variables only (for testing)
 */
export function getConfigFromEnvironment(): Partial<ProxmoxProviderConfig> {
  return {
    endpoint: process.env[PROXMOX_ENV_VARS.ENDPOINT] || undefined,
    username: process.env[PROXMOX_ENV_VARS.USERNAME] || undefined,
    password: process.env[PROXMOX_ENV_VARS.PASSWORD] || undefined,
    apiToken: process.env[PROXMOX_ENV_VARS.API_TOKEN] || undefined,
    insecure: process.env[PROXMOX_ENV_VARS.INSECURE]?.toLowerCase() === 'true' || undefined,
    timeout: process.env[PROXMOX_ENV_VARS.TIMEOUT] ? parseInt(process.env[PROXMOX_ENV_VARS.TIMEOUT]) : undefined,
    parallelism: process.env[PROXMOX_ENV_VARS.PARALLELISM] ? parseInt(process.env[PROXMOX_ENV_VARS.PARALLELISM]) : undefined,
    minTls: process.env[PROXMOX_ENV_VARS.MIN_TLS] || undefined,
  };
}