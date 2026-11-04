export function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  console.error('Request error:', error.message);

  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.issues,
    });
  }

  const statusCode = error.statusCode || error.status || 500;

  return res.status(statusCode).json({
    error: statusCode >= 500
      ? 'Internal server error'
      : error.message,
  });
}
