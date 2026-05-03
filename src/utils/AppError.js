export default class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Solicitud inválida', details = []) {
    return new AppError(message, 400, 'BAD_REQUEST', details);
  }

  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404, 'NOT_FOUND');
  }

  static unauthorized(message = 'No autenticado', code = 'UNAUTHORIZED') {
    return new AppError(message, 401, code);
  }

  static forbidden(message = 'No autorizado', code = 'FORBIDDEN') {
    return new AppError(message, 403, code);
  }

  static conflict(message = 'Conflicto de datos', code = 'CONFLICT') {
    return new AppError(message, 409, code);
  }

  static tooManyRequests(message = 'Demasiadas solicitudes', code = 'TOO_MANY_REQUESTS') {
    return new AppError(message, 429, code);
  }

  static validation(details = [], message = 'Error de validación') {
    return new AppError(message, 400, 'VALIDATION_ERROR', details);
  }

  toJSON() {
    return {
      error: true,
      message: this.message,
      code: this.code,
      ...(this.details.length > 0 ? { details: this.details } : {})
    };
  }
}
