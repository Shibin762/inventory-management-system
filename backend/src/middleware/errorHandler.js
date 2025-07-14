const logger = require('./logger');

function errorHandler(err, req, res, next) {
  logger.error(err.stack);

  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({ error: 'Database constraint violation' });
  }

  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
}

module.exports = errorHandler;
