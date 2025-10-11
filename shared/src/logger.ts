import winston from 'winston';

/**
 * Winston logger instance configured for the application
 * Logs to both console (with colors) and file (app.log)
 * Log level controlled by LOG_LEVEL environment variable (defaults to 'info')
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'app.log' })
  ]
});