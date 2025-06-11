const redis = require('redis');
require('dotenv').config();

// Redis client configuration - supports both URL and individual config
let clientConfig;

if (process.env.REDIS_URL) {
  // Use Redis URL (for cloud providers like Redis Cloud)
  clientConfig = {
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    }
  };
} else {
  // Use individual Redis config (for local/custom setup)
  clientConfig = {
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      reconnectStrategy: (retries) => Math.min(retries * 50, 500)
    },
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

// Create Redis client
const client = redis.createClient(clientConfig);

// Redis event handlers
client.on('connect', () => {
  console.log('Connected to Redis server');
});

client.on('error', (err) => {
  console.error('Redis connection error:', err);
});

client.on('ready', () => {
  console.log('Redis client ready');
});

// Connect to Redis
const connectRedis = async () => {
  try {
    await client.connect();
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
};

// Redis utility functions
const redisUtils = {
  // Set key with expiration
  setEx: async (key, value, expireTime = 3600) => {
    try {
      await client.setEx(key, expireTime, JSON.stringify(value));
    } catch (error) {
      console.error('Redis setEx error:', error);
    }
  },

  // Get key
  get: async (key) => {
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  },

  // Delete key
  del: async (key) => {
    try {
      await client.del(key);
    } catch (error) {
      console.error('Redis del error:', error);
    }
  },

  // Check if key exists
  exists: async (key) => {
    try {
      return await client.exists(key);
    } catch (error) {
      console.error('Redis exists error:', error);
      return false;
    }
  },

  // Set hash field
  hSet: async (key, field, value) => {
    try {
      await client.hSet(key, field, JSON.stringify(value));
    } catch (error) {
      console.error('Redis hSet error:', error);
    }
  },

  // Get hash field
  hGet: async (key, field) => {
    try {
      const value = await client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis hGet error:', error);
      return null;
    }
  },

  // Get all hash fields
  hGetAll: async (key) => {
    try {
      const hash = await client.hGetAll(key);
      const result = {};
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      return result;
    } catch (error) {
      console.error('Redis hGetAll error:', error);
      return {};
    }
  },

  // Add to list
  lPush: async (key, value) => {
    try {
      await client.lPush(key, JSON.stringify(value));
    } catch (error) {
      console.error('Redis lPush error:', error);
    }
  },

  // Get list range
  lRange: async (key, start = 0, stop = -1) => {
    try {
      const values = await client.lRange(key, start, stop);
      return values.map(value => JSON.parse(value));
    } catch (error) {
      console.error('Redis lRange error:', error);
      return [];
    }
  }
};

module.exports = {
  client,
  redis: client, // Alias for consistency
  connectRedis,
  redisUtils
}; 