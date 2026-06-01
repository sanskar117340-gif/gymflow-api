const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient;

function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL;

  if (redisUrl) {
    redisClient = new Redis(redisUrl, { maxRetriesPerRequest: 3 });
  } else {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: 3,
    });
  }

  redisClient.on('error', (err) => logger.error('Redis error:', err.message));
  return redisClient;
}

async function connectRedis() {
  const client = getRedisClient();
  try {
    await client.ping();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.error('❌ Redis connection failed:', error.message);
    throw error;
  }
}

module.exports = { connectRedis, getRedisClient };
