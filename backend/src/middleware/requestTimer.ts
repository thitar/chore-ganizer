import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Threshold for slow requests (in milliseconds)
const SLOW_REQUEST_THRESHOLD = 1000;

// Extend Request to include startTime
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

export const requestTimerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Record start time
  req.startTime = Date.now();

  // Listen for response finish
  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || Date.now());
    
    // Add timing header
    res.setHeader('X-Response-Time', `${duration}ms`);

    // Log slow requests
    if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
      });
    } else {
      logger.info('Request completed', {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      });
    }
  });

  next();
};

// Helper to get request duration
export const getRequestDuration = (req: Request): number => {
  return req.startTime ? Date.now() - req.startTime : 0;
};

export default requestTimerMiddleware;
