const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../logger');

/**
 * Cache đơn giản trong memory để giảm số request tới backend.
 * TTL mặc định 5 phút — đủ thời gian cho 1 chuyến xe ngắn.
 */
const tokenCache = new Map(); // userId -> { tokens: [...], cachedAt: number }
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Tạo JWT token để authenticate với internal API của backend.
 * Backend sẽ verify chữ ký JWT bằng cùng secret (BACKEND_JWT_SECRET).
 *
 * @returns {string}
 */
function buildInternalJwt() {
  return jwt.sign(
    { service: 'nhm-notification', iat: Math.floor(Date.now() / 1000) },
    config.backendJwtSecret,
    { expiresIn: '60s' },
  );
}

/**
 * Lấy danh sách device token của một hoặc nhiều user từ backend.
 * Có cache trong memory để tránh gọi API lặp đi lặp lại trong cùng 1 chuyến.
 *
 * @param {string[]} userIds
 * @returns {Promise<Array<{user_id: string, platform: string, token: string}>>}
 */
async function getDeviceTokens(userIds) {
  if (!userIds || userIds.length === 0) return [];

  const now = Date.now();

  // Kiểm tra cache
  const cached = [];
  const uncachedIds = [];
  for (const id of userIds) {
    const entry = tokenCache.get(id);
    if (entry && now - entry.cachedAt < CACHE_TTL_MS) {
      cached.push(...entry.tokens);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) {
    return cached;
  }

  try {
    const params = new URLSearchParams();
    uncachedIds.forEach((id) => params.append('user_ids[]', id));

    const response = await axios.get(
      `${config.backendApiUrl}/api/internal/device-tokens?${params}`,
      {
        headers: { Authorization: `Bearer ${buildInternalJwt()}` },
        timeout: 5000,
      },
    );

    const fetched = response.data?.data || [];

    // Cập nhật cache
    const groupedByUser = {};
    for (const item of fetched) {
      if (!groupedByUser[item.user_id]) groupedByUser[item.user_id] = [];
      groupedByUser[item.user_id].push(item);
    }
    for (const [uid, tokens] of Object.entries(groupedByUser)) {
      tokenCache.set(uid, { tokens, cachedAt: now });
    }

    logger.info('Device tokens fetched from backend', {
      requested: uncachedIds.length,
      returned: fetched.length,
    });

    return [...cached, ...fetched];
  } catch (err) {
    logger.error('Failed to fetch device tokens from backend', {
      error: err.message,
      userIds: uncachedIds,
    });
    return cached; // Trả cached nếu có, không block flow
  }
}

/**
 * Xóa cache device token cho user (sau khi nhận lỗi invalid token từ provider).
 *
 * @param {string} userId
 */
function invalidateCache(userId) {
  tokenCache.delete(userId);
}

module.exports = { getDeviceTokens, invalidateCache };
