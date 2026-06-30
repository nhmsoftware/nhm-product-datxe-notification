const logger = require('../logger');
const { getDeviceTokens } = require('../services/deviceTokenService');
const { sendPush } = require('../services/pushService');

/**
 * Xử lý sự kiện finance từ kênh Redis finance.events.
 * Gửi thông báo biến động số dư ví cho tài xế.
 *
 * @param {object} payload
 */
async function handleFinanceEvent(payload) {
  const eventName = payload?.event;
  const userId = payload?.user_id || payload?.driver_id;

  if (!userId) {
    logger.warn('financeHandler: no user_id in payload, skipping', { event: eventName });
    return;
  }

  logger.info('financeHandler: processing event', {
    event: eventName,
    user_id: userId,
    amount: payload.amount,
    transaction_type: payload.transaction_type,
  });

  const recipients = await getDeviceTokens([String(userId)]);

  const amountText = payload.amount
    ? new Intl.NumberFormat('vi-VN').format(payload.amount) + 'đ'
    : '';

  await sendPush({
    recipients,
    title: 'Biến động số dư ví',
    body: amountText
      ? `Số dư ví của bạn vừa thay đổi ${amountText}.`
      : 'Số dư ví của bạn vừa thay đổi.',
    eventName: eventName || 'finance',
    data: {
      event: eventName,
      transaction_type: payload.transaction_type,
      amount: payload.amount,
    },
  });
}

module.exports = { handleFinanceEvent };
