const logger = require('../logger');
const { getDeviceTokens } = require('../services/deviceTokenService');
const { sendPush } = require('../services/pushService');

/**
 * Bảng ánh xạ sự kiện ride → nội dung push notification.
 * user_id_field: tên field trong payload chứa user_id của người nhận push.
 */
const RIDE_EVENT_MAP = {
  'ride.new_offer': {
    user_id_field: 'user_id', // tài xế được mời
    title: 'Có chuyến mới gần bạn',
    body: 'Nhấn để xem chi tiết và nhận chuyến.',
  },
  'ride.accepted': {
    user_id_field: 'customer_id',
    title: 'Tài xế đã nhận chuyến',
    body: 'Tài xế đã nhận chuyến của bạn và đang trên đường đến.',
  },
  'ride.driver_arrived': {
    user_id_field: 'customer_id',
    title: 'Tài xế đã đến điểm đón',
    body: 'Tài xế đã đến điểm đón, vui lòng ra xe.',
  },
  'ride.started': {
    user_id_field: 'customer_id',
    title: 'Chuyến đi đã bắt đầu',
    body: 'Chuyến đi đã bắt đầu. Chúc bạn đi vui vẻ!',
  },
  'ride.completed': {
    // Gửi cho cả 2: customer và driver (xử lý ở dưới)
    user_id_field: 'customer_id',
    title: 'Chuyến đi đã hoàn thành',
    body: 'Cảm ơn bạn đã sử dụng dịch vụ!',
    also_notify_driver: true,
    driver_title: 'Chuyến đi hoàn thành',
    driver_body: 'Thu nhập đã được cộng vào ví của bạn.',
  },
  'ride.cancelled': {
    user_id_field: 'user_id', // tài xế đang được mời (offered)
    title: 'Đơn đã bị thu hồi',
    body: 'Khách hàng đã hủy đơn. Chờ đơn tiếp theo nhé!',
  },
  'ride.driver_cancelled': {
    user_id_field: 'customer_id',
    title: 'Tài xế đã hủy chuyến',
    body: 'Tài xế đã hủy chuyến. Hệ thống đang tìm tài xế khác cho bạn.',
  },
  'ride.no_driver_found': {
    user_id_field: 'customer_id',
    title: 'Không tìm thấy tài xế',
    body: 'Hiện không có tài xế phù hợp. Vui lòng thử lại sau.',
  },
};

/**
 * Xử lý sự kiện ride.* từ kênh Redis ride.communication.events.
 *
 * @param {object} payload
 */
async function handleRideEvent(payload) {
  const eventName = payload?.event;
  if (!eventName) return;

  const mapping = RIDE_EVENT_MAP[eventName];
  if (!mapping) {
    // Sự kiện chưa có trong bảng ánh xạ — bỏ qua (silent)
    return;
  }

  logger.info('rideHandler: processing event', {
    event: eventName,
    ride_id: payload.ride_id,
    user_id: payload.user_id,
    customer_id: payload.customer_id,
  });

  // Gửi cho user chính (customer hoặc driver)
  const targetUserId = payload[mapping.user_id_field];
  if (targetUserId) {
    const recipients = await getDeviceTokens([String(targetUserId)]);
    await sendPush({
      recipients,
      title: mapping.title,
      body: mapping.body,
      eventName,
      data: {
        event: eventName,
        ride_id: payload.ride_id ? String(payload.ride_id) : undefined,
      },
    });
  }

  // Gửi thêm cho driver nếu cần (ride.completed)
  if (mapping.also_notify_driver && payload.driver_id) {
    const driverRecipients = await getDeviceTokens([String(payload.driver_id)]);
    await sendPush({
      recipients: driverRecipients,
      title: mapping.driver_title,
      body: mapping.driver_body,
      eventName: `${eventName}:driver`,
      data: {
        event: eventName,
        ride_id: payload.ride_id ? String(payload.ride_id) : undefined,
      },
    });
  }
}

module.exports = { handleRideEvent };
