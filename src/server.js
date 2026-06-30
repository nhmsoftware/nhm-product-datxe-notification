const config = require('./config');
const logger = require('./logger');
const { createSubscriber } = require('./redis/subscriber');
const { handleRideEvent } = require('./handlers/rideHandler');
const { handleFinanceEvent } = require('./handlers/financeHandler');
const { createHttpServer } = require('./http/healthServer');

/**
 * Dispatch message từ Redis tới đúng handler.
 *
 * @param {string} channel
 * @param {object} payload
 */
function dispatch(channel, payload) {
  if (channel === config.redisCommunicationChannel) {
    handleRideEvent(payload).catch((err) =>
      logger.error('rideHandler error', { error: err.message }),
    );
    return;
  }

  if (channel === config.redisFinanceChannel) {
    handleFinanceEvent(payload).catch((err) =>
      logger.error('financeHandler error', { error: err.message }),
    );
    return;
  }
}

async function start() {
  if (!config.backendJwtSecret) {
    logger.error('BACKEND_JWT_SECRET is not configured. Exiting.');
    process.exit(1);
  }

  // Health check HTTP server
  const server = createHttpServer();
  server.listen(config.port, config.host, () => {
    logger.info('🚀 Notification service started', {
      host: config.host,
      port: config.port,
    });
  });

  // Redis subscriber
  try {
    await createSubscriber((channel, payload) => dispatch(channel, payload));
  } catch (err) {
    logger.error('Redis subscriber failed to start', { error: err.message });
    process.exit(1);
  }
}

module.exports = { start };
