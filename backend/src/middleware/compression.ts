import compression from 'compression';
import { Request, Response } from 'express';

/**
 * Compression middleware configuration
 * Reduces API response sizes by 50%+ through gzip/deflate compression
 */
export const compressionMiddleware = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,
  
  // Compression level (1-9, 6 is default - good balance between speed and compression)
  level: 6,
  
  // Filter function to determine what to compress
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't accept it
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Use default filter for everything else
    return compression.filter(req, res);
  },
});

export default compressionMiddleware;
