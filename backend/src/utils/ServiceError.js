/**
 * Base error class for all service-level errors.
 * Provides consistent error handling across all services.
 * 
 * Usage:
 *   throw new ServiceError('User not found', 404, 'NOT_FOUND');
 * 
 * In routes, catch and handle:
 *   if (error instanceof ServiceError) {
 *     return res.status(error.statusCode).json({ ... });
 *   }
 */
class ServiceError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code (default: 500)
   * @param {string} code - Machine-readable error code (default: 'INTERNAL_ERROR')
   */
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'ServiceError';
    this.statusCode = statusCode;
    this.code = code;

    // Maintains proper stack trace in V8 environments (Node.js)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ServiceError);
    }
  }

  /**
   * Factory method for common "not found" errors
   */
  static notFound(resource = 'Resource') {
    return new ServiceError(`${resource} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Factory method for common "unauthorized" errors
   */
  static unauthorized(message = 'Unauthorized') {
    return new ServiceError(message, 401, 'UNAUTHORIZED');
  }

  /**
   * Factory method for common "forbidden" errors
   */
  static forbidden(message = 'Forbidden') {
    return new ServiceError(message, 403, 'FORBIDDEN');
  }

  /**
   * Factory method for common "conflict" errors (e.g., duplicate)
   */
  static conflict(message = 'Resource already exists') {
    return new ServiceError(message, 409, 'CONFLICT');
  }

  /**
   * Factory method for common "bad request" errors
   */
  static badRequest(message = 'Bad request') {
    return new ServiceError(message, 400, 'BAD_REQUEST');
  }
}

module.exports = ServiceError;
