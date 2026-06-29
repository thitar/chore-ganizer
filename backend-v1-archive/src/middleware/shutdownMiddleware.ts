import { Request, Response, NextFunction } from 'express';

// Shared state for in-flight requests
let inFlightRequests = 0;
let isShuttingDown = false;

/**
 * Middleware that tracks in-flight requests and rejects new requests during shutdown.
 * This should be added early in the middleware chain to prevent new requests
 * from being accepted when the server is shutting down.
 */
export const shutdownMiddleware = (_req: Request, res: Response, next: NextFunction) => {
  // If we're shutting down, reject new requests with a 503 status
  if (isShuttingDown) {
    res.status(503).json({
      success: false,
      error: {
        message: 'Service is shutting down',
        code: 'SERVICE_UNAVAILABLE'
      }
    });
    return;
  }

  // Track the request
  inFlightRequests++;

  // Decrement on response finish or close
  const decrementRequest = () => {
    inFlightRequests--;
  };

  res.on('finish', decrementRequest);
  res.on('close', decrementRequest);

  next();
};

/**
 * Initiate the shutdown process.
 * This sets the flag to reject new incoming requests.
 */
export const initiateShutdown = () => {
  isShuttingDown = true;
};

/**
 * Get the current count of in-flight requests.
 */
export const getInFlightRequests = () => inFlightRequests;

/**
 * Check if the server is in shutdown mode.
 */
export const isShuttingDownState = () => isShuttingDown;
