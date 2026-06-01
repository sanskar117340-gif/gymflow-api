const { verifyAccessToken, isTokenBlacklisted } = require('../utils/jwt');
const { User } = require('../models');
const { createError } = require('./errorHandler');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(createError('No token provided', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    if (await isTokenBlacklisted(token)) {
      return next(createError('Token has been revoked', 401));
    }
    const decoded = verifyAccessToken(token);
    const user = await User.findByPk(decoded.userId);
    if (!user || !user.is_active) {
      return next(createError('User not found or inactive', 401));
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    next(err);
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    next();
  };
}

function requireTier(...tiers) {
  return (req, res, next) => {
    if (!tiers.includes(req.user?.subscription_tier)) {
      return next(createError('This feature requires a Pro or Elite subscription', 403));
    }
    next();
  };
}

module.exports = { authenticate, requireRole, requireTier };
