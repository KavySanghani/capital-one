import express from 'express';
import helmet from 'helmet';

import healthRouter from './routes/health.routes.js';
import expenseRouter from './routes/expense.routes.js';
import {
  notFoundHandler,
  errorHandler,
} from './middleware/error-handler.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet());

app.use(express.json({
  limit: '16kb',
}));

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Expense Tracker API',
    documentation: 'API endpoints will be documented in the project README.',
  });
});

app.use('/health', healthRouter);
app.use('/expenses', expenseRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
