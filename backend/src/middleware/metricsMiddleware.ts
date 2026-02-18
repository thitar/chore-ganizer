import { Request, Response, NextFunction } from 'express';
import { httpRequestDuration, httpRequestTotal, activeConnections } from '../utils/metrics.js';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Track active connections
  activeConnections.inc({ type: 'http' });

  // Record when request completes
  const originalSend = res.send;
  res.send = function(body: any) {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    // Record histogram
    httpRequestDuration.observe({
      method: req.method,
      route,
      status_code: res.statusCode
    }, duration);
    
    // Increment counter
    httpRequestTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode
    });
    
    // Decrement active connections
    activeConnections.dec({ type: 'http' });
    
    return originalSend.call(this, body);
  };

  next();
};
