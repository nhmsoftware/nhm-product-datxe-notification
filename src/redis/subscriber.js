const config = require('../config');
const logger = require('../logger');
const { createRedisClient } = require('./client');

/**
 * Khởi động subscriber Redis và chuyển mọi message đến handler.
 *
 * @param {Function} onMessage - (channel: string, payload: object) => void
 * @returns {Promise<Redis>}
 */
async function createSubscriber(onMessage) {
  const subscriber = createRedisClient();
  await subscriber.connect();

  const channels = [
    config.redisCommunicationChannel,
    config.redisFinanceChannel,
  ];

  await subscriber.subscribe(...channels);

  logger.info('Notification subscriber ready', { channels });

  subscriber.on('message', (channel, rawPayload) => {
    let payload;
    try {
      payload = JSON.parse(rawPayload);
    } catch (err) {
      logger.error('Failed to parse Redis message', {
        channel,
        error: err.message,
        raw: rawPayload?.slice(0, 200),
      });
      return;
    }

    const eventName = payload?.event || payload?.data?.event || 'unknown';
    const rideId = payload?.ride_id || payload?.data?.ride_id || null;
    const userId = payload?.user_id || payload?.data?.user_id || null;

    logger.info('Notification subscriber: message received', {
      channel,
      event: eventName,
      ride_id: rideId,
      user_id: userId,
    });

    onMessage(channel, payload);
  });

  return subscriber;
}

module.exports = { createSubscriber };
