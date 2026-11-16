import express from 'express';
import helmet from 'helmet';

import path from 'path';
import { fileURLToPath } from 'url';

import healthRouter from './routes/health.routes.js';
import expenseRouter from './routes/expense.routes.js';
import {
  notFoundHandler,
  errorHandler,
} from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');

const app = express();

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  })
);

app.use(express.static(publicDir, { index: false }));

app.use(express.json({
  limit: '16kb',
}));

app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    return res.sendFile(path.join(publicDir, 'index.html'));
  }

  res.status(200).json({
    message: 'Expense Tracker API',
    documentation: 'API endpoints will be documented in the project README.',
  });
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use('/health', healthRouter);
app.use('/expenses', expenseRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
