import { Router } from 'express';
import { getMetrics, getHealth } from '../controllers/metrics.controller.js';

const router = Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Prometheus metrics endpoint
 *     description: Returns Prometheus-compatible metrics. Access restricted to localhost only for security.
 *     operationId: getMetrics
 *     responses:
 *       '200':
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *       '403':
 *         description: Access denied - only available from localhost
 *         content:
 *           application/json:
 *             schema:
 *               $ref: #/components/schemas/ErrorResponse
 */
/**
 * @swagger
 * /metrics:
 *   get:
 *     tags: [Metrics]
 *     summary: Prometheus metrics endpoint
 *     description: Returns Prometheus-compatible metrics. Access restricted to localhost only for security.
 *     operationId: getMetrics
 *     responses:
 *       '200':
 *         description: Prometheus metrics
 *         content:
 *           text/plain:
 *             schema:
 *       '403':
 *         description: Access denied - only available from localhost
 *         content:
 *           application/json:
 *             schema:
 *               $ref: #/components/schemas/ErrorResponse
 */
router.get('/metrics', getMetrics);
router.get('/health', getHealth);

export default router;
