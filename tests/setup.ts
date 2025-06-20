// Jest setup file
import { jest } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests

// Mock Pulumi for unit tests
jest.mock('@pulumi/pulumi', () => ({
  Output: {
    create: jest.fn((val: unknown) => ({
      apply: jest.fn((fn: (value: unknown) => unknown) => fn(val)),
    })),
    secret: jest.fn((val: unknown) => ({
      apply: jest.fn((fn: (value: unknown) => unknown) => fn(val)),
    })),
  },
  ComponentResource: class {},
  Config: jest.fn(() => ({
    get: jest.fn(),
    require: jest.fn(),
  })),
  interpolate: jest.fn((strings: unknown[], ..._values: unknown[]) => {
    return (strings as string[])[0];
  }),
}));

// Global test timeout
jest.setTimeout(30000);
