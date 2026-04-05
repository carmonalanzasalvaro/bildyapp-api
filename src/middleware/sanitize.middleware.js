const sanitizeObject = (value) => {
  if (!value || typeof value !== 'object') {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach(sanitizeObject);
    return;
  }

  for (const key of Object.keys(value)) {
    const currentValue = value[key];
    sanitizeObject(currentValue);

    const sanitizedKey = key.replace(/\$/g, '').replace(/\./g, '');

    if (sanitizedKey !== key) {
      delete value[key];
      value[sanitizedKey] = currentValue;
    }
  }
};

const sanitizeRequest = (req, res, next) => {
  sanitizeObject(req.body);
  sanitizeObject(req.params);
  sanitizeObject(req.query);
  next();
};

export default sanitizeRequest;