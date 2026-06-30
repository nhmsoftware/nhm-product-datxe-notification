const Redis = require('ioredis');
const config = require('../config');
const logger = require('../logger');

function createRedisClient() {
  const client = new Redis({
    host: config.redisHost,
    port: config.redisPort,
    password: config.redisPassword,
    db: config.redisDb,
    lazyConnect: true,
    maxRetriesPerRequest: null,
  });

  client.on('error', (err) => logger.error('Redis error', { error: err.message }));
  client.on('connect', () => logger.info('Redis connected'));
  client.on('reconnecting', () => logger.warn('Redis reconnecting...'));

  return client;
}

module.exports = { createRedisClient };
