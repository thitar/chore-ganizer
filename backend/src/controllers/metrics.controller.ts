import { Request, Response } from 'express';
import { register } from '../utils/metrics.js';
import { getVersion } from '../version.js';

export const getMetrics = async (_req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
};

export const getHealth = async (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: getVersion()
  });
};
