const dangerousKeyPattern = /^\$|\./;

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (dangerousKeyPattern.test(key)) {
        return accumulator;
      }

      accumulator[key] = sanitizeValue(nestedValue);
      return accumulator;
    }, {});
  }

  return value;
};

const sanitizeContainer = (container) => {
  if (!container || typeof container !== 'object') {
    return container;
  }

  for (const key of Object.keys(container)) {
    if (dangerousKeyPattern.test(key)) {
      delete container[key];
      continue;
    }

    container[key] = sanitizeValue(container[key]);
  }

  return container;
};

export const sanitizeNoSql = (req, _res, next) => {
  if (req.body && typeof req.body === 'object') {
    sanitizeContainer(req.body);
  } else if (req.body === undefined) {
    req.body = {};
  }

  sanitizeContainer(req.query);
  sanitizeContainer(req.params);

  next();
};
