# Push Notification Service — NHM Dat Xe

## Mục đích

Service Node.js nhẹ, chuyên subscribe các kênh Redis của `hdgreen-ride-api` và gửi Push Notification qua provider HTTP API (FCM hoặc tương đương) khi có sự kiện vòng đời quan trọng của chuyến đi.

Hoạt động song song với `nhm-product-datxe-realtime-hd-green` theo mô hình **Dual-channel dispatch**:
- **Socket server** → gửi cho client đang mở app (WebSocket)
- **Notification service** → gửi cho client đóng app / nền (Push Notification)

---

## Kiến trúc

```
src/
├── redis/
│   ├── client.js          — Redis client factory
│   └── subscriber.js      — Subscribe channels + dispatch
├── handlers/
│   ├── rideHandler.js     — Xử lý ride.* events
│   └── financeHandler.js  — Xử lý finance events
├── services/
│   ├── pushService.js     — Gửi push qua provider HTTP API
│   └── deviceTokenService.js — Lấy device token từ backend API
└── http/
    └── healthServer.js    — Health check endpoint
```

---

## Biến môi trường (.env)

| Biến | Mô tả | Mặc định |
|---|---|---|
| `PORT` | Port HTTP health check | `3003` |
| `REDIS_HOST` | Redis host | `127.0.0.1` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | (trống) |
| `REDIS_DB` | Redis DB index | `0` |
| `REDIS_COMMUNICATION_CHANNEL` | Channel ride events | `ride.communication.events` |
| `REDIS_FINANCE_CHANNEL` | Channel finance events | `finance.events` |
| `BACKEND_API_URL` | URL backend Laravel | `http://localhost:8000` |
| `BACKEND_JWT_SECRET` | JWT secret cho internal API | (bắt buộc) |
| `PUSH_PROVIDER_URL` | URL HTTP API của provider push | (bắt buộc) |
| `PUSH_PROVIDER_API_KEY` | API key provider push | (bắt buộc) |

---

## Cài đặt & Chạy

```bash
npm install
cp .env.example .env
# Điền các biến bắt buộc vào .env
node index.js
```

---

## Backend API cần bổ sung

`GET /api/internal/device-tokens?user_ids[]=xxx&user_ids[]=yyy`

- **Header**: `Authorization: Bearer <JWT signed với BACKEND_JWT_SECRET>`
- **Response**:
```json
{
  "data": [
    { "user_id": "123", "platform": "android", "token": "FCM_TOKEN_HERE" },
    { "user_id": "456", "platform": "ios", "token": "APNS_TOKEN_HERE" }
  ]
}
```
