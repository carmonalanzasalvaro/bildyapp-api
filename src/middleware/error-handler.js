import mongoose from 'mongoose';
import { MulterError } from 'multer';
import AppError from '../utils/AppError.js';

export const notFound = (req, _res, next) => {
  next(AppError.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof AppError || err?.isOperational) {
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

  return res.status(statusCode).json({
    error: true,
    message,
    code: 'INTERNAL_ERROR'
  });
};
