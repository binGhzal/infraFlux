/**
 * Talos Image Factory Integration Utility
 * 
 * Provides utilities for integrating with the Talos Image Factory API
 * to generate custom Talos images with specific configurations and extensions.
 */

import { logger } from './logger';

/**
 * Talos schematic configuration for custom system extensions
 */
export interface TalosSchematicConfig {
  /** Customization settings */
  customization: {
    /** System extensions configuration */
    systemExtensions: {
      /** Official Talos system extensions */
      officialExtensions: string[];
    };
  };
}

/**
 * Talos image configuration
 */
export interface TalosImageConfig {
  /** Talos version (e.g., "v1.10.1") */
  version: string;
  
  /** Schematic configuration for customizations */
  schematic: TalosSchematicConfig;
  
  /** Target platform */
  platform: 'nocloud' | 'proxmox' | 'vmware' | 'aws' | 'gcp' | 'azure';
  
  /** Target architecture */
  architecture: 'amd64' | 'arm64';
  
  /** Override the image factory endpoint */
  factoryEndpoint?: string;
}

/**
 * Talos Image Factory API response for schematic creation
 */
export interface SchematicResponse {
  /** Generated schematic ID */
  id: string;
  
  /** Schematic creation timestamp */
  created?: string;
  
  /** Schematic configuration */
  configuration?: TalosSchematicConfig;
}

/**
 * Image information with metadata
 */
export interface TalosImageInfo {
  /** Image download URL */
  url: string;
  
  /** Schematic ID used to generate the image */
  schematicId: string;
  
  /** Talos version */
  version: string;
  
  /** Platform identifier */
  platform: string;
  
  /** Architecture identifier */
  architecture: string;
  
  /** Generated timestamp */
  generated: string;
  
  /** Expected file size (if available) */
  expectedSize?: number;
  
  /** Checksum for verification */
  checksum?: string;
}

/**
 * Options for image factory operations
 */
export interface ImageFactoryOptions {
  /** Request timeout in milliseconds */
  timeout?: number;
  
  /** Maximum retry attempts */
  maxRetries?: number;
  
  /** Base delay for exponential backoff (ms) */
  baseDelay?: number;
  
  /** Whether to verify SSL certificates */
  verifySsl?: boolean;
  
  /** Custom headers for requests */
  headers?: Record<string, string>;
  
  /** Cache TTL in seconds */
  cacheTtl?: number;
}

/**
 * Default configuration for Image Factory operations
 */
export const DEFAULT_FACTORY_OPTIONS: Required<ImageFactoryOptions> = {
  timeout: 30000,      // 30 seconds
  maxRetries: 3,
  baseDelay: 1000,     // 1 second
  verifySsl: true,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'InfraFlux-v2.0',
  },
  cacheTtl: 3600,      // 1 hour
};

/**
 * Default Talos Image Factory endpoint
 */
export const DEFAULT_FACTORY_ENDPOINT = 'https://factory.talos.dev';

/**
 * Default schematic configuration for Proxmox with common extensions
 */
export const DEFAULT_PROXMOX_SCHEMATIC: TalosSchematicConfig = {
  customization: {
    systemExtensions: {
      officialExtensions: [
        'siderolabs/qemu-guest-agent',     // VM status reporting to Proxmox
        'siderolabs/intel-ucode',          // Intel microcode updates
        'siderolabs/i915-ucode',           // Intel GPU drivers for Quick Sync
      ],
    },
  },
};

/**
 * Error types for Image Factory operations
 */
export class ImageFactoryError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: any,
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'ImageFactoryError';
  }
}

/**
 * Talos Image Factory client
 */
export class TalosImageFactory {
  private readonly endpoint: string;
  private readonly options: Required<ImageFactoryOptions>;
  private readonly schematicCache = new Map<string, { id: string; expires: number }>();
  
  constructor(
    endpoint: string = DEFAULT_FACTORY_ENDPOINT,
    options: ImageFactoryOptions = {}
  ) {
    this.endpoint = endpoint.replace(/\/$/, ''); // Remove trailing slash
    this.options = { ...DEFAULT_FACTORY_OPTIONS, ...options };
    
    logger.info('Talos Image Factory client initialized', {
      endpoint: this.endpoint,
      timeout: this.options.timeout,
      maxRetries: this.options.maxRetries,
    });
  }
  
  /**
   * Create or retrieve a schematic ID for the given configuration
   */
  async createSchematic(schematic: TalosSchematicConfig): Promise<string> {
    const schematicKey = this.getSchematicCacheKey(schematic);
    
    // Check cache first
    const cached = this.schematicCache.get(schematicKey);
    if (cached && cached.expires > Date.now()) {
      logger.debug('Using cached schematic ID', { id: cached.id });
      return cached.id;
    }
    
    logger.info('Creating new Talos schematic', {
      extensions: schematic.customization.systemExtensions.officialExtensions,
    });
    
    try {
      const response = await this.makeRequest<SchematicResponse>(
        '/schematics',
        'POST',
        schematic
      );
      
      // Cache the result
      this.schematicCache.set(schematicKey, {
        id: response.id,
        expires: Date.now() + (this.options.cacheTtl * 1000),
      });
      
      logger.info('Schematic created successfully', { id: response.id });
      return response.id;
      
    } catch (error) {
      logger.error('Failed to create Talos schematic', { error: String(error) });
      throw error;
    }
  }
  
  /**
   * Generate image URL for the given configuration
   */
  async generateImageUrl(config: TalosImageConfig): Promise<string> {
    const schematicId = await this.createSchematic(config.schematic);
    
    const imageUrl = `${config.factoryEndpoint || this.endpoint}/image/${schematicId}/${config.version}/${config.platform}-${config.architecture}.raw.gz`;
    
    logger.info('Generated Talos image URL', {
      schematicId,
      version: config.version,
      platform: config.platform,
      architecture: config.architecture,
      url: imageUrl,
    });
    
    return imageUrl;
  }
  
  /**
   * Generate complete image information including metadata
   */
  async generateImageInfo(config: TalosImageConfig): Promise<TalosImageInfo> {
    const url = await this.generateImageUrl(config);
    const schematicId = await this.createSchematic(config.schematic);
    
    return {
      url,
      schematicId,
      version: config.version,
      platform: config.platform,
      architecture: config.architecture,
      generated: new Date().toISOString(),
    };
  }
  
  /**
   * Validate image availability (optional - checks if URL is accessible)
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      logger.debug('Validating image URL accessibility', { url });
      
      // HEAD request to check if image exists without downloading
      await this.makeRequest<void>(
        url.replace(this.endpoint, ''),
        'HEAD'
      );
      
      logger.debug('Image URL validation successful', { url });
      return true;
      
    } catch (error) {
      logger.warn('Image URL validation failed', { url, error: String(error) });
      return false;
    }
  }
  
  /**
   * Clear the schematic cache
   */
  clearCache(): void {
    this.schematicCache.clear();
    logger.debug('Schematic cache cleared');
  }
  
  /**
   * Generate cache key for schematic configuration
   */
  private getSchematicCacheKey(schematic: TalosSchematicConfig): string {
    // Create a deterministic hash of the schematic configuration
    const extensions = schematic.customization.systemExtensions.officialExtensions.sort();
    return Buffer.from(JSON.stringify({ extensions })).toString('base64');
  }
  
  /**
   * Make HTTP request with retry logic and error handling
   */
  private async makeRequest<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' = 'GET',
    body?: any
  ): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.endpoint}${path}`;
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.options.maxRetries; attempt++) {
      try {
        logger.debug(`HTTP ${method} request attempt ${attempt}`, { url, timeout: this.options.timeout });
        
        // Create request configuration
        const requestConfig: RequestInit = {
          method,
          headers: this.options.headers,
          signal: AbortSignal.timeout(this.options.timeout),
        };
        
        if (body && method !== 'GET' && method !== 'HEAD') {
          requestConfig.body = JSON.stringify(body);
        }
        
        // Make the request
        const response = await fetch(url, requestConfig);
        
        // Handle HTTP errors
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          const isRetryable = response.status >= 500 || response.status === 429;
          
          throw new ImageFactoryError(
            `HTTP ${response.status}: ${errorText}`,
            response.status,
            errorText,
            isRetryable
          );
        }
        
        // Parse response for non-HEAD requests
        if (method === 'HEAD') {
          return undefined as T;
        }
        
        const responseText = await response.text();
        if (responseText.trim() === '') {
          return undefined as T;
        }
        
        try {
          return JSON.parse(responseText) as T;
        } catch {
          // Return text response if not JSON
          return responseText as T;
        }
        
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        const isRetryable = error instanceof ImageFactoryError ? 
          error.retryable : 
          (error as any).name === 'TimeoutError' || 
          (error as any).code === 'ECONNRESET';
        
        if (!isRetryable || attempt === this.options.maxRetries) {
          logger.error(`HTTP ${method} request failed (attempt ${attempt}/${this.options.maxRetries})`, {
            url,
            error: String(error),
            final: attempt === this.options.maxRetries,
          });
          break;
        }
        
        // Calculate exponential backoff delay with jitter
        const delay = this.options.baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.random() * 0.1 * delay; // 10% jitter
        const totalDelay = delay + jitter;
        
        logger.warn(`HTTP ${method} request failed, retrying in ${Math.round(totalDelay)}ms`, {
          url,
          attempt,
          maxRetries: this.options.maxRetries,
          error: String(error),
        });
        
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }
    
    throw lastError!;
  }
}

/**
 * Utility function to create a Talos Image Factory client
 */
export function createImageFactory(
  endpoint?: string,
  options?: ImageFactoryOptions
): TalosImageFactory {
  return new TalosImageFactory(endpoint, options);
}

/**
 * Utility function to generate a Proxmox-optimized Talos image URL
 */
export async function generateProxmoxTalosImageUrl(
  version: string,
  architecture: 'amd64' | 'arm64' = 'amd64',
  customExtensions: string[] = [],
  factoryEndpoint?: string
): Promise<string> {
  const factory = createImageFactory(factoryEndpoint);
  
  const schematic: TalosSchematicConfig = {
    customization: {
      systemExtensions: {
        officialExtensions: [
          ...DEFAULT_PROXMOX_SCHEMATIC.customization.systemExtensions.officialExtensions,
          ...customExtensions,
        ],
      },
    },
  };
  
  const config: TalosImageConfig = {
    version,
    schematic,
    platform: 'nocloud', // nocloud is appropriate for Proxmox
    architecture,
    ...(factoryEndpoint && { factoryEndpoint }),
  };
  
  return factory.generateImageUrl(config);
}

/**
 * Utility function to generate complete Talos image information for Proxmox
 */
export async function generateProxmoxTalosImageInfo(
  version: string,
  architecture: 'amd64' | 'arm64' = 'amd64',
  customExtensions: string[] = [],
  factoryEndpoint?: string
): Promise<TalosImageInfo> {
  const factory = createImageFactory(factoryEndpoint);
  
  const schematic: TalosSchematicConfig = {
    customization: {
      systemExtensions: {
        officialExtensions: [
          ...DEFAULT_PROXMOX_SCHEMATIC.customization.systemExtensions.officialExtensions,
          ...customExtensions,
        ],
      },
    },
  };
  
  const config: TalosImageConfig = {
    version,
    schematic,
    platform: 'nocloud',
    architecture,
    ...(factoryEndpoint && { factoryEndpoint }),
  };
  
  return factory.generateImageInfo(config);
}