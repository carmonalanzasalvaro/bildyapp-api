import AppError from '../utils/AppError.js';

const validate = (schema, property = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[property]);

  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message
    }));

    return next(AppError.badRequest('Validation error', details));
  }

  req[property] = result.data;
  next();
};

export default validate;