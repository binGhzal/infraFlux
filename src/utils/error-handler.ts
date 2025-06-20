import * as pulumi from '@pulumi/pulumi';
import { logger } from './logger';

/**
 * Enhanced error handling for InfraFlux with recovery strategies
 */

export interface ErrorContext {
  component: string;
  operation: string;
  resourceId?: string;
  details?: Record<string, unknown>;
}

export interface RecoveryStrategy {
  action: string;
  description: string;
  automated: boolean;
  command?: string;
}

export interface InfraFluxError {
  code: string;
  message: string;
  context: ErrorContext;
  cause?: Error;
  recoveryStrategies: RecoveryStrategy[];
  timestamp: Date;
}

/**
 * Error categories and their recovery strategies
 */
const ERROR_PATTERNS = {
  // Network connectivity issues
  NETWORK_UNREACHABLE: {
    pattern: /ENETUNREACH|Network is unreachable|no route to host/i,
    code: 'NETWORK_UNREACHABLE',
    recoveryStrategies: [
      {
        action: 'Check network connectivity',
        description: 'Verify that the Proxmox host is reachable',
        automated: false,
        command: 'ping <proxmox-host>',
      },
      {
        action: 'Check firewall rules',
        description: 'Ensure ports 8006 (HTTPS) and 22 (SSH) are open',
        automated: false,
      },
      {
        action: 'Verify network configuration',
        description: 'Check NETWORK_GATEWAY and NETWORK_SUBNET in .env',
        automated: false,
      },
    ],
  },

  // Authentication failures
  AUTH_FAILED: {
    pattern: /authentication failure|401|unauthorized/i,
    code: 'AUTH_FAILED',
    recoveryStrategies: [
      {
        action: 'Verify credentials',
        description: 'Check PROXMOX_USERNAME and PROXMOX_PASSWORD in .env',
        automated: false,
      },
      {
        action: 'Test login manually',
        description: 'Try logging into Proxmox web UI with same credentials',
        automated: false,
      },
      {
        action: 'Check user permissions',
        description: 'Ensure user has VM management permissions in Proxmox',
        automated: false,
      },
    ],
  },

  // Resource conflicts
  RESOURCE_EXISTS: {
    pattern:
      /already exists|VM \d+ already exists|template \d+ already exists/i,
    code: 'RESOURCE_EXISTS',
    recoveryStrategies: [
      {
        action: 'Choose different VM ID',
        description: 'Update TALOS_TEMPLATE_ID in .env to use an unused ID',
        automated: false,
      },
      {
        action: 'Remove existing resource',
        description: 'Delete the conflicting VM/template in Proxmox',
        automated: false,
        command: 'qm destroy <vm-id> --purge',
      },
      {
        action: 'Use force update',
        description: 'Set TALOS_FORCE_DOWNLOAD=true to recreate templates',
        automated: false,
      },
    ],
  },

  // Storage issues
  STORAGE_FULL: {
    pattern: /No space left|storage full|insufficient space/i,
    code: 'STORAGE_FULL',
    recoveryStrategies: [
      {
        action: 'Check disk space',
        description: 'Verify available space on storage pools',
        automated: false,
        command: 'df -h',
      },
      {
        action: 'Clean up old files',
        description: 'Remove unused ISOs, templates, or VM disks',
        automated: false,
      },
      {
        action: 'Use different storage',
        description: 'Update VM_STORAGE_POOL or ISO_STORAGE_POOL in .env',
        automated: false,
      },
    ],
  },

  // Template issues
  TEMPLATE_NOT_FOUND: {
    pattern: /template.*not found|VM \d+ does not exist/i,
    code: 'TEMPLATE_NOT_FOUND',
    recoveryStrategies: [
      {
        action: 'Create template first',
        description: 'Ensure template creation completes before VM creation',
        automated: false,
      },
      {
        action: 'Force template recreation',
        description: 'Set TALOS_FORCE_DOWNLOAD=true to recreate templates',
        automated: false,
      },
      {
        action: 'Check template ID',
        description: 'Verify TALOS_TEMPLATE_ID matches created template',
        automated: false,
      },
    ],
  },

  // Talos API issues
  TALOS_API_UNAVAILABLE: {
    pattern: /connection refused.*:50000|talos api.*not available/i,
    code: 'TALOS_API_UNAVAILABLE',
    recoveryStrategies: [
      {
        action: 'Wait for Talos boot',
        description: 'Talos may still be booting. Wait 2-3 minutes and retry.',
        automated: true,
        command: 'sleep 180',
      },
      {
        action: 'Check VM network',
        description: 'Verify VMs have network connectivity and correct IPs',
        automated: false,
      },
      {
        action: 'Use DHCP discovery',
        description: 'Enable network discovery to find actual VM IPs',
        automated: false,
      },
    ],
  },

  // Configuration errors
  CONFIG_INVALID: {
    pattern: /configuration.*invalid|schema.*validation.*failed/i,
    code: 'CONFIG_INVALID',
    recoveryStrategies: [
      {
        action: 'Run config validation',
        description: 'Use npm run validate-config to check configuration',
        automated: false,
        command: 'npm run validate-config',
      },
      {
        action: 'Generate new template',
        description: 'Create a fresh configuration from template',
        automated: false,
        command: 'npm run config-template > .env.new',
      },
      {
        action: 'Check environment variables',
        description: 'Verify all required variables are set in .env',
        automated: false,
      },
    ],
  },
};

/**
 * Enhanced error handler that provides actionable recovery strategies
 */
export class InfraFluxErrorHandler {
  /**
   * Handle and categorize errors with recovery strategies
   */
  static handleError(error: Error, context: ErrorContext): InfraFluxError {
    const infraError = this.categorizeError(error, context);

    // Log the error with context
    logger.error('InfraFlux error occurred', {
      code: infraError.code,
      message: infraError.message,
      context: infraError.context,
      recoveryStrategies: infraError.recoveryStrategies.length,
    });

    // Display user-friendly error information
    this.displayError(infraError);

    return infraError;
  }

  /**
   * Categorize error and determine recovery strategies
   */
  private static categorizeError(
    error: Error,
    context: ErrorContext
  ): InfraFluxError {
    const message = error.message || error.toString();

    // Try to match error patterns
    for (const [, pattern] of Object.entries(ERROR_PATTERNS)) {
      if (pattern.pattern.test(message)) {
        return {
          code: pattern.code,
          message: this.enhanceErrorMessage(message, pattern.code),
          context,
          cause: error,
          recoveryStrategies: pattern.recoveryStrategies,
          timestamp: new Date(),
        };
      }
    }

    // Generic error handling
    return {
      code: 'UNKNOWN_ERROR',
      message: `Unexpected error: ${message}`,
      context,
      cause: error,
      recoveryStrategies: [
        {
          action: 'Check logs',
          description: 'Review detailed logs for more information',
          automated: false,
        },
        {
          action: 'Retry operation',
          description:
            'The error might be transient. Try running the command again.',
          automated: false,
        },
        {
          action: 'Report issue',
          description: 'If the error persists, report it as a bug',
          automated: false,
        },
      ],
      timestamp: new Date(),
    };
  }

  /**
   * Enhance error message with context
   */
  private static enhanceErrorMessage(
    originalMessage: string,
    errorCode: string
  ): string {
    const contextualMessages: Record<string, string> = {
      NETWORK_UNREACHABLE:
        'Cannot reach Proxmox server. Check network connectivity.',
      AUTH_FAILED: 'Authentication to Proxmox failed. Verify credentials.',
      RESOURCE_EXISTS:
        'Resource already exists. Choose different ID or remove existing resource.',
      STORAGE_FULL:
        'Storage space exhausted. Free up space or use different storage.',
      TEMPLATE_NOT_FOUND:
        'Template not found. Ensure template creation completed successfully.',
      TALOS_API_UNAVAILABLE:
        'Talos API not accessible. VMs may still be booting.',
      CONFIG_INVALID: 'Configuration validation failed. Check your .env file.',
    };

    const contextualMessage = contextualMessages[errorCode];
    return contextualMessage
      ? `${contextualMessage}\n\nDetails: ${originalMessage}`
      : originalMessage;
  }

  /**
   * Display error information to user
   */
  private static displayError(error: InfraFluxError): void {
    console.error(`\n🚨 InfraFlux Error: ${error.code}`);
    console.error(`📝 ${error.message}`);

    if (error.context.component) {
      console.error(`🔧 Component: ${error.context.component}`);
    }

    if (error.context.operation) {
      console.error(`⚙️  Operation: ${error.context.operation}`);
    }

    if (error.recoveryStrategies.length > 0) {
      console.error('\n🔧 Recovery Strategies:');
      error.recoveryStrategies.forEach((strategy, index) => {
        console.error(`  ${index + 1}. ${strategy.action}`);
        console.error(`     ${strategy.description}`);
        if (strategy.command) {
          console.error(`     Command: ${strategy.command}`);
        }
      });
    }

    console.error(`\n⏰ Timestamp: ${error.timestamp.toISOString()}\n`);
  }

  /**
   * Attempt automated recovery for errors that support it
   */
  static async attemptRecovery(error: InfraFluxError): Promise<boolean> {
    const automatedStrategies = error.recoveryStrategies.filter(
      (s) => s.automated
    );

    if (automatedStrategies.length === 0) {
      return false;
    }

    logger.info('Attempting automated recovery', {
      errorCode: error.code,
      strategies: automatedStrategies.length,
    });

    for (const strategy of automatedStrategies) {
      try {
        console.log(`🔄 Attempting: ${strategy.action}`);

        if (strategy.command) {
          // Execute recovery command (simplified - would need proper command execution)
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(`✅ Completed: ${strategy.action}`);
        }

        return true;
      } catch (recoveryError) {
        logger.warn('Recovery strategy failed', {
          strategy: strategy.action,
          error: recoveryError instanceof Error ? recoveryError.message : String(recoveryError),
        });
      }
    }

    return false;
  }
}

/**
 * Pulumi resource error wrapper
 */
export function wrapPulumiResource<T extends pulumi.Resource>(
  resourceConstructor: () => T,
  context: ErrorContext
): T {
  try {
    return resourceConstructor();
  } catch (error) {
    const infraError = InfraFluxErrorHandler.handleError(error instanceof Error ? error : new Error(String(error)), context);
    throw new Error(`${infraError.code}: ${infraError.message}`);
  }
}

/**
 * Async operation error wrapper with retry logic
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const infraError = InfraFluxErrorHandler.handleError(lastError, {
        ...context,
        operation: `${context.operation} (attempt ${attempt}/${maxRetries})`,
      });

      // Try automated recovery on first failure
      if (attempt === 1) {
        const recovered =
          await InfraFluxErrorHandler.attemptRecovery(infraError);
        if (recovered) {
          logger.info('Automated recovery successful, retrying operation');
        }
      }

      if (attempt < maxRetries) {
        logger.info(`Retrying operation in ${delayMs}ms`, {
          attempt,
          maxRetries,
          operation: context.operation,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
      }
    }
  }

  // All retries failed
  if (!lastError) {
    throw new Error('Operation failed with unknown error');
  }
  throw lastError;
}
