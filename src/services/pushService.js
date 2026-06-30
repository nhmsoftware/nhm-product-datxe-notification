const axios = require('axios');
const config = require('../config');
const logger = require('../logger');
const { invalidateCache } = require('./deviceTokenService');

/**
 * Gửi push notification tới một hoặc nhiều device token qua provider HTTP API.
 *
 * Provider nhận payload dạng:
 * {
 *   tokens: string[],
 *   title: string,
 *   body: string,
 *   data: object    // custom data cho app xử lý khi nhận push
 * }
 *
 * @param {object} options
 * @param {Array<{user_id: string, platform: string, token: string}>} options.recipients
 * @param {string} options.title
 * @param {string} options.body
 * @param {object} [options.data]       custom data gắn kèm push
 * @param {string} [options.eventName]  tên sự kiện (dùng cho log)
 */
async function sendPush({ recipients, title, body, data = {}, eventName = '' }) {
  if (!recipients || recipients.length === 0) {
    logger.warn('sendPush: no recipients, skipping', { eventName });
    return;
  }

  if (!config.pushProviderUrl) {
    logger.warn('sendPush: PUSH_PROVIDER_URL not configured, skipping', { eventName });
    return;
  }

  const tokens = recipients.map((r) => r.token).filter(Boolean);
  if (tokens.length === 0) {
    logger.warn('sendPush: no valid device tokens, skipping', { eventName });
    return;
  }

  const payload = { tokens, title, body, data };

  try {
    const response = await axios.post(config.pushProviderUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.pushProviderApiKey}`,
      },
      timeout: 8000,
    });

    logger.info('Push notification sent', {
      event: eventName,
      recipient_count: tokens.length,
      provider_status: response.status,
    });

    // Xử lý invalid token từ response nếu provider trả về danh sách lỗi
    const failedTokens = response.data?.failed_tokens || [];
    if (failedTokens.length > 0) {
      logger.warn('Push notification: some tokens invalid', {
        failed: failedTokens.length,
      });
      // Xóa cache để lần sau fetch lại token mới
      for (const recipient of recipients) {
        if (failedTokens.includes(recipient.token)) {
          invalidateCache(recipient.user_id);
        }
      }
    }
  } catch (err) {
    logger.error('Push notification failed', {
      event: eventName,
      error: err.message,
      tokens_count: tokens.length,
    });
    // Best-effort: không throw để không block luồng chính
  }
}

module.exports = { sendPush };
