import 'dotenv/config';

import app from './app.js';
import { closeDatabaseConnection } from './config/database.js';

const port = Number(process.env.PORT ?? 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

const server = app.listen(port, () => {
  console.log(`Expense Tracker API running on port ${port}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down gracefully...`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10000);

  forceExit.unref();

  server.close(async (error) => {
    try {
      await closeDatabaseConnection();

      if (error) {
        console.error('HTTP server shutdown error:', error.message);
        process.exitCode = 1;
      }
    } catch (databaseError) {
      console.error(
        'Database shutdown error:',
        databaseError.message,
      );
      process.exitCode = 1;
    } finally {
      clearTimeout(forceExit);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.on('error', (error) => {
  console.error('HTTP server error:', error.message);
  process.exitCode = 1;
});
