const logger = require('../utils/logger');

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
}

function errorHandler(err, req, res, next) {
  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Custom app errors
  if (err.statusCode) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack, url: req.originalUrl });
  res.status(500).json({ error: 'Internal server error' });
}

function createError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { notFoundHandler, errorHandler, createError };
