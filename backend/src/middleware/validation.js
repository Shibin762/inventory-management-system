// backend/src/middleware/validation.js
const validators = require('../utils/validators');

function validateProduct(req, res, next) {
  const result = validators.validateProduct(req.body);
  if (!result.isValid) {
    return res.status(400).json({ error: result.errors.join(', ') });
  }
  next();
}

function validateSupplier(req, res, next) {
  const result = validators.validateSupplier(req.body);
  if (!result.isValid) {
    return res.status(400).json({ error: result.errors.join(', ') });
  }
  next();
}

function validateOrder(req, res, next) {
  const result = validators.validateOrder(req.body);
  if (!result.isValid) {
    return res.status(400).json({ error: result.errors.join(', ') });
  }
  next();
}

module.exports = { validateProduct, validateSupplier, validateOrder };
