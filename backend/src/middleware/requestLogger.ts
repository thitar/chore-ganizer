import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const correlationId = req.headers['x-correlation-id'] as string || 
    req.headers['x-request-id'] as string || 
    crypto.randomUUID();
  
  req.headers['x-correlation-id'] = correlationId;

  // Log request
  logger.info({
    type: 'REQUEST',
    method: req.method,
    path: req.path,
    query: req.query,
    correlationId
  });

  // Capture response
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = Date.now() - start;
    logger.info({
      type: 'RESPONSE',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      correlationId
    });
    return originalSend.call(this, body);
  };

  next();
};
