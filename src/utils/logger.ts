import winston from 'winston';

const logLevel = process.env.LOG_LEVEL ?? 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'infraflux' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Helper functions for common logging patterns
export const logResource = (
  resource: string,
  action: string,
  details?: Record<string, unknown>
): void => {
  logger.info(`${action} ${resource}`, details);
};

export const logError = (error: Error, context?: string): void => {
  logger.error(`Error in ${context ?? 'unknown context'}`, error);
};
