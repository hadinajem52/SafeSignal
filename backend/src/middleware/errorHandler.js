const logger = require('../utils/logger');
const ServiceError = require('../utils/ServiceError');

/**
 * Global standardized error handler
 * Captures, logs, and formats errors for client response
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const isProduction = process.env.NODE_ENV === 'production';

  // Structuring the log metadata
  const logMeta = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user ? req.user.userId : null,
    statusCode,
    errorCode,
  };

  // Log error based on severity
  // 5xx errors are logged as errors (and typically sent to Sentry via its own middleware)
  // 4xx errors are warnings or info
  if (statusCode >= 500) {
    logger.error(err.message, { ...logMeta, stack: err.stack });
  } else if (statusCode >= 400) {
    logger.warn(err.message, logMeta);
  } else {
    logger.info(err.message, logMeta);
  }

  // Format response
  res.status(statusCode).json({
    status: 'ERROR',
    code: errorCode,
    message: err.message || 'An unexpected error occurred',
    // Include stack trace only in non-production environments
    ...(isProduction ? {} : { stack: err.stack, errors: err.errors }),
  });
};

module.exports = errorHandler;
