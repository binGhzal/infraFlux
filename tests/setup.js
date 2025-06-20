"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Jest setup file
const globals_1 = require("@jest/globals");
// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce noise in tests
// Mock Pulumi for unit tests
globals_1.jest.mock('@pulumi/pulumi', () => ({
    Output: {
        create: globals_1.jest.fn((val) => ({
            apply: globals_1.jest.fn((fn) => fn(val)),
        })),
        secret: globals_1.jest.fn((val) => ({
            apply: globals_1.jest.fn((fn) => fn(val)),
        })),
    },
    ComponentResource: class {
    },
    Config: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        require: globals_1.jest.fn(),
    })),
    interpolate: globals_1.jest.fn((strings, ..._values) => {
        return strings[0];
    }),
}));
// Global test timeout
globals_1.jest.setTimeout(30000);
//# sourceMappingURL=setup.js.map