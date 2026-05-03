import mongoose from 'mongoose';
import { MulterError } from 'multer';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';
import { loggerService } from '../services/logger.service.js';

export const notFound = (req, _res, next) => {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

const logServerError = (req, statusCode, message, stack) => {
  void loggerService.logServerError({
    timestamp: new Date().toISOString(),
    method: req?.method || 'UNKNOWN',
    route: req?.originalUrl || req?.url || 'unknown',
    status: statusCode,
    message,
    ...(config.isProduction ? {} : { stack: stack || undefined })
  }).catch(() => undefined);
};

export const errorHandler = (err, req, res, _next) => {
  if (err instanceof AppError || err?.isOperational) {
    if (err.statusCode >= 500) {
      logServerError(req, err.statusCode, err.message, err?.stack);
    }

    return res.status(err.statusCode).json(err.toJSON());
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((error) => ({
      field: error.path,
      message: error.message
    }));

    return res.status(400).json(AppError.validation(details).toJSON());
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json(
      AppError.badRequest(`Valor inválido para '${err.path}': ${err.value}`).toJSON()
    );
  }

  if (err?.code === 11000) {
    const duplicatedField = Object.keys(err.keyValue || {})[0] || 'resource';
    return res.status(409).json({
      error: true,
      message: `Ya existe un registro con '${duplicatedField}'`,
      code: 'DUPLICATE_KEY'
    });
  }

  if (err?.name === 'ZodError') {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    return res.status(400).json(AppError.validation(details).toJSON());
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'La firma no puede superar los 5 MB'
      : 'Error al procesar el archivo adjunto';

    return res.status(400).json(AppError.badRequest(message).toJSON());
  }

  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  if (statusCode >= 500) {
    logServerError(req, statusCode, message, err?.stack);
  }

  return res.status(statusCode).json({
    error: true,
    message,
    code: 'INTERNAL_ERROR'
  });
};
