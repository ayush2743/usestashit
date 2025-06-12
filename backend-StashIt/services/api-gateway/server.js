const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.API_GATEWAY_PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Gateway is running',
    timestamp: new Date().toISOString(),
    services: {
      auth: `http://localhost:${process.env.AUTH_SERVICE_PORT || 3001}`,
      user: `http://localhost:${process.env.USER_SERVICE_PORT || 3002}`,
      product: `http://localhost:${process.env.PRODUCT_SERVICE_PORT || 3003}`,
      search: `http://localhost:${process.env.SEARCH_SERVICE_PORT || 3004}`,
      messaging: `http://localhost:${process.env.MESSAGING_SERVICE_PORT || 3005}`,
      wishlist: `http://localhost:${process.env.WISHLIST_SERVICE_PORT || 3006}`
    }
  });
});

// Service proxy configurations
const isDevelopment = process.env.NODE_ENV === 'development';

const getServiceUrl = (port, service) => {
  if (isDevelopment) {
    return `http://localhost:${port}`;
  }
  // In production, all services run in the same process
  return `http://localhost:${process.env.PORT || 3000}`;
};

const services = {
  auth: {
    target: getServiceUrl(process.env.AUTH_SERVICE_PORT || 3001, 'auth'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/auth': '/auth'
    }
  },
  user: {
    target: getServiceUrl(process.env.USER_SERVICE_PORT || 3002, 'user'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/users': '/users'
    }
  },
  product: {
    target: getServiceUrl(process.env.PRODUCT_SERVICE_PORT || 3003, 'product'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/products': '/products'
    }
  },
  search: {
    target: getServiceUrl(process.env.SEARCH_SERVICE_PORT || 3004, 'search'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/search': '/search'
    }
  },
  messaging: {
    target: getServiceUrl(process.env.MESSAGING_SERVICE_PORT || 3005, 'messaging'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/messages': '/messages'
    }
  },
  wishlist: {
    target: getServiceUrl(process.env.WISHLIST_SERVICE_PORT || 3006, 'wishlist'),
    changeOrigin: true,
    pathRewrite: {
      '^/api/wishlist': '/wishlist'
    }
  }
};

// Error handling for proxy
const onError = (err, req, res) => {
  console.error('Proxy Error:', err);
  res.status(503).json({
    success: false,
    message: 'Service temporarily unavailable',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

const onProxyReq = (proxyReq, req, res) => {
  // Forward the authorization header
  if (req.headers.authorization) {
    proxyReq.setHeader('Authorization', req.headers.authorization);
  }
  
  // Forward user ID if available
  if (req.headers['x-user-id']) {
    proxyReq.setHeader('X-User-ID', req.headers['x-user-id']);
  }
};

// Setup proxy routes
app.use('/api/auth', createProxyMiddleware({ ...services.auth, onError, onProxyReq }));
app.use('/api/users', createProxyMiddleware({ ...services.user, onError, onProxyReq }));
app.use('/api/products', createProxyMiddleware({ ...services.product, onError, onProxyReq }));
app.use('/api/search', createProxyMiddleware({ ...services.search, onError, onProxyReq }));
app.use('/api/messages', createProxyMiddleware({ ...services.messaging, onError, onProxyReq }));

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API documentation',
    data: {
      auth: {
        base: '/api/auth',
        endpoints: [
          'POST /register - Register new user',
          'POST /login - Login user',
          'GET /profile - Get user profile',
          'PUT /profile - Update user profile'
        ]
      },
      products: {
        base: '/api/products',
        endpoints: [
          'GET / - Get all products',
          'POST / - Create new product',
          'GET /:id - Get product by id',
          'PUT /:id - Update product',
          'DELETE /:id - Delete product'
        ]
      },
      messages: {
        base: '/api/messages',
        endpoints: [
          'GET /conversations - Get user conversations',
          'GET /conversations/:id - Get conversation messages',
          'POST / - Send message'
        ]
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableRoutes: [
      '/api/auth',
      '/api/users', 
      '/api/products',
      '/api/search',
      '/api/messages'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway is running on port ${PORT}`);
});

module.exports = app;