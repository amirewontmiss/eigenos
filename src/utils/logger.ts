import * as winston from 'winston';
import * as path from 'path';
import { app } from 'electron';

export class Logger {
  private logger: winston.Logger;

  constructor(component: string = 'QuantumOS') {
    const logDir = path.join(app.getPath('userData'), 'logs');
    
    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, component: comp, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level.toUpperCase()}] [${comp || component}] ${message}${metaStr}`;
        })
      ),
      defaultMeta: { component },
      transports: [
        // Console output
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, component: comp, ...meta }) => {
              const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
              return `${timestamp} [${level}] [${comp || component}] ${message}${metaStr}`;
            })
          )
        }),
        
        // File output
        new winston.transports.File({
          filename: path.join(logDir, 'quantumos.log'),
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        
        // Error file
        new winston.transports.File({
          filename: path.join(logDir, 'error.log'),
          level: 'error',
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ],
      
      // Handle uncaught exceptions and rejections
      exceptionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'exceptions.log')
        })
      ],
      
      rejectionHandlers: [
        new winston.transports.File({
          filename: path.join(logDir, 'rejections.log')
        })
      ]
    });

    // Ensure log directory exists
    this.ensureLogDirectory(logDir);
  }

  private async ensureLogDirectory(logDir: string): Promise<void> {
    try {
      const fs = require('fs/promises');
      await fs.mkdir(logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any): void {
    if (error instanceof Error) {
      this.logger.error(message, { 
        error: error.message, 
        stack: error.stack,
        ...error
      });
    } else {
      this.logger.error(message, { error });
    }
  }

  profile(id: string): void {
    this.logger.profile(id);
  }

  startTimer(): winston.Profiler {
    return this.logger.startTimer();
  }

  child(options: any): Logger {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(options);
    return childLogger;
  }
}