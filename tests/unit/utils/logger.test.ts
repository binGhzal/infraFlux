/**
 * Unit tests for Logger utility
 */

import { Logger, LogLevel } from '../../../src/utils/logger';

describe('Logger', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      const logger = new Logger(LogLevel.INFO);
      logger.info('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('INFO: test message')
      );
    });

    it('should include context in log messages', () => {
      const logger = new Logger(LogLevel.INFO, { service: 'test' });
      logger.info('test message', { user: 'admin' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"service":"test","user":"admin"}')
      );
    });
  });

  describe('log levels', () => {
    it('should respect log level filtering', () => {
      const logger = new Logger(LogLevel.ERROR);
      logger.info('should not log');
      logger.error('should log');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should create logger with context', () => {
      const baseLogger = new Logger(LogLevel.INFO, { service: 'base' });
      const contextLogger = baseLogger.withContext({ module: 'test' });
      
      contextLogger.info('test message');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"service":"base","module":"test"}')
      );
    });
  });
});