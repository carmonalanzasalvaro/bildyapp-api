class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);

    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Unauthorized', details = null) {
    return new AppError(message, 401, details);
  }

  static forbidden(message = 'Forbidden', details = null) {
    return new AppError(message, 403, details);
  }

  static notFound(message = 'Resource not found', details = null) {
    return new AppError(message, 404, details);
  }

  static conflict(message = 'Conflict', details = null) {
    return new AppError(message, 409, details);
  }

  static tooManyRequests(message = 'Too many requests', details = null) {
    return new AppError(message, 429, details);
  }

  static internal(message = 'Internal server error', details = null) {
    return new AppError(message, 500, details);
  }
}

export default AppError;