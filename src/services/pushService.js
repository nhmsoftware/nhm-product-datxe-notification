const admin = require('firebase-admin');
const config = require('../config');
const logger = require('../logger');
const { invalidateCache } = require('./deviceTokenService');

let _messaging = null;

function getMessaging() {
  if (_messaging) return _messaging;

  if (!config.firebaseServiceAccountPath) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH not configured');
  }

  const serviceAccount = require(config.firebaseServiceAccountPath);

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  _messaging = admin.messaging();
  return _messaging;
}

/**
 * Gửi push notification tới một hoặc nhiều thiết bị qua FCM HTTP v1.
 *
 * @param {object} options
 * @param {Array<{user_id: string, platform: string, token: string}>} options.recipients
 * @param {string} options.title
 * @param {string} options.body
 * @param {object} [options.data]
 * @param {string} [options.eventName]
 */
async function sendPush({ recipients, title, body, data = {}, eventName = '' }) {
  if (!recipients || recipients.length === 0) {
    logger.warn('sendPush: no recipients, skipping', { eventName });
    return;
  }

  if (!config.firebaseServiceAccountPath) {
    logger.warn('sendPush: FIREBASE_SERVICE_ACCOUNT_PATH not set, skipping', { eventName });
    return;
  }

  const tokens = recipients.map((r) => r.token).filter(Boolean);
  if (tokens.length === 0) {
    logger.warn('sendPush: no valid device tokens, skipping', { eventName });
    return;
  }

  // FCM data payload requires all values to be strings
  const stringData = Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, String(v)])
  );

  try {
    const messaging = getMessaging();

    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body },
      data: stringData,
      android: { priority: 'high' },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default' } },
      },
    });

    logger.info('Push notification sent via FCM v1', {
      event: eventName,
      total: tokens.length,
      success: response.successCount,
      failure: response.failureCount,
    });

    // Invalidate cache for expired/invalid tokens
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code ?? '';
        logger.warn('FCM token error', { event: eventName, error: resp.error?.message, code });

        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidateCache(recipients[idx].user_id);
        }
      }
    });
  } catch (err) {
    logger.error('Push notification failed', { event: eventName, error: err.message });
  }
}

module.exports = { sendPush };
