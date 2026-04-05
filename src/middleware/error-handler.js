import AppError from '../utils/AppError.js';

const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'CastError') {
    const appError = AppError.badRequest('Invalid resource id');
    return res.status(appError.statusCode).json({
      ok: false,
      message: appError.message
    });
  }

  if (error.code === 11000) {
    const duplicatedField = Object.keys(error.keyPattern ?? {})[0];
    const appError = AppError.conflict(
      duplicatedField
        ? `${duplicatedField} already exists`
        : 'Duplicated value'
    );

    return res.status(appError.statusCode).json({
      ok: false,
      message: appError.message
    });
  }

  if (error.name === 'MulterError') {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'File size exceeds the maximum allowed size'
        : error.message;

    return res.status(400).json({
      ok: false,
      message
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      ok: false,
      message: error.message,
      ...(error.details && { details: error.details })
    });
  }

  console.error(error);

  const appError = AppError.internal();

  return res.status(appError.statusCode).json({
    ok: false,
    message: appError.message
  });
};

export default errorHandler;