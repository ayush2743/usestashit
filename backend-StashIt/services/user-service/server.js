const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { prisma, connectDatabase, healthCheck } = require('../../config/database');
const { redis, connectRedis } = require('../../config/redis');
const { authenticateToken } = require('../../shared/middleware/auth');
const { userSchemas } = require('../../shared/utils/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.USER_SERVICE_PORT || 3002;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Utility functions
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: 'stashit/profiles',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ],
        ...options
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

// User routes
app.get('/users/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        college: true,
        phone: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            products: true,
            wishlists: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: {
          ...user,
          productsCount: user._count.products,
          wishlistCount: user._count.wishlists
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.put('/users/profile', authenticateToken, async (req, res) => {
  try {
    const { error, value } = userSchemas.updateProfile.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: value,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        college: true,
        phone: true,
        isVerified: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.post('/users/profile/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      public_id: `user_${req.userId}_${Date.now()}`
    });

    // Update user profile image URL
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { profileImageUrl: result.secure_url },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true
      }
    });

    res.json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        user,
        imageUrl: result.secure_url
      }
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/users/:userId/public', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        college: true,
        createdAt: true,
        _count: {
          select: {
            products: { where: { isAvailable: true } }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Public profile retrieved successfully',
      data: {
        user: {
          ...user,
          activeProductsCount: user._count.products
        }
      }
    });

  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/users/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        _count: {
          select: {
            products: true,
            wishlists: true,
            sentMessages: true,
            receivedMessages: true
          }
        }
      }
    });

    const productStats = await prisma.product.groupBy({
      by: ['isAvailable'],
      where: { sellerId: req.userId },
      _count: true
    });

    const activeProducts = productStats.find(stat => stat.isAvailable)?._count || 0;
    const soldProducts = productStats.find(stat => !stat.isAvailable)?._count || 0;

    res.json({
      success: true,
      message: 'User statistics retrieved successfully',
      data: {
        stats: {
          totalProducts: stats._count.products,
          activeProducts,
          soldProducts,
          wishlistItems: stats._count.wishlists,
          messagesSent: stats._count.sentMessages,
          messagesReceived: stats._count.receivedMessages
        }
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/users/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const redisHealth = await redis.ping();
    
    res.json({
      success: true,
      message: 'User service is healthy',
      data: {
        service: 'user-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        redis: redisHealth === 'PONG' ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'User service is unhealthy',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
  }
  
  console.error('User service error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'User endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`👤 User service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start user service:', error);
    process.exit(1);
  }
};

startServer(); 