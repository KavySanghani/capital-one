import { Router } from 'express';
import { checkDatabaseConnection } from '../config/database.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    await checkDatabaseConnection();

    return res.status(200).json({
      status: 'ok',
      service: 'expense-tracker-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: 'error',
      service: 'expense-tracker-api',
      database: 'unavailable',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
