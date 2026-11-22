const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  }

  res.status(404).render('errors/404', {
    title: '404 - Page Not Found',
    path: req.originalUrl,
    statusInfo: { status: 'disconnected' }
  });
}

function globalErrorHandler(err, req, res, next) {
  logger.error(`Unhandled error during ${req.method} ${req.originalUrl}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const errorMessage = err.message || 'An unexpected internal server error occurred.';

  if (req.originalUrl.startsWith('/api/')) {
    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
    });
  }

  res.status(statusCode).render('errors/500', {
    title: '500 - Server Error',
    error: errorMessage,
    stack: process.env.NODE_ENV === 'development' ? err.stack : null,
    statusInfo: { status: 'disconnected' }
  });
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
