/**
 * Jest test setup for InfraFlux v2.0
 */

import { logger, LogLevel } from '../src/utils/logger';

// Set up test environment
beforeAll(() => {
  // Set log level to ERROR to reduce test output noise
  logger.setLogLevel(LogLevel.ERROR);

  // Set test timeout to 30 seconds
  jest.setTimeout(30000);
});

// Global test configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: console.error, // Keep errors visible
};
