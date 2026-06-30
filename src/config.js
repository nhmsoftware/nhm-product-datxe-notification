const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  port: Number(process.env.PORT || 3003),
  host: process.env.HOST || '0.0.0.0',

  // Redis
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: Number(process.env.REDIS_PORT || 6379),
  redisPassword: process.env.REDIS_PASSWORD || undefined,
  redisDb: Number(process.env.REDIS_DB || 0),
  redisCommunicationChannel:
    process.env.REDIS_COMMUNICATION_CHANNEL || 'ride.communication.events',
  redisFinanceChannel: process.env.REDIS_FINANCE_CHANNEL || 'finance.events',

  // Backend API
  backendApiUrl: process.env.BACKEND_API_URL || 'http://localhost:8000',
  backendJwtSecret: process.env.BACKEND_JWT_SECRET || '',

  // Push provider
  pushProviderUrl: process.env.PUSH_PROVIDER_URL || '',
  pushProviderApiKey: process.env.PUSH_PROVIDER_API_KEY || '',
};
