const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');

function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

async function blacklistToken(token, expiresIn = 900) {
  const redis = getRedisClient();
  await redis.setex(`blacklist:${token}`, expiresIn, '1');
}

async function isTokenBlacklisted(token) {
  const redis = getRedisClient();
  const result = await redis.get(`blacklist:${token}`);
  return result !== null;
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, blacklistToken, isTokenBlacklisted };
