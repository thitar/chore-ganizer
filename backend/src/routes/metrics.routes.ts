import { Router } from 'express';
import { getMetrics, getHealth } from '../controllers/metrics.controller.js';

const router = Router();

router.get('/metrics', getMetrics);
router.get('/health', getHealth);

export default router;
