import AppError from '../utils/AppError.js';

const formatIssue = (issue) => ({
  field: issue.path.join('.'),
  message: issue.message
});

const validate = (schema) => async (req, _res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      params: req.params,
      query: req.query
    });

    req.validated = parsed;
    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      return next(AppError.validation(error.issues.map(formatIssue)));
    }

    return next(error);
  }
};

export default validate;
