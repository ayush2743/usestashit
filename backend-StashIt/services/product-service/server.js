const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { prisma, connectDatabase, healthCheck } = require('../../config/database');
const { redis, connectRedis } = require('../../config/redis');
const { authenticateToken } = require('../../shared/middleware/auth');
const { productSchemas } = require('../../shared/utils/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.PRODUCT_SERVICE_PORT || 3003;

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
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 3 // Maximum 3 files
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
        folder: 'stashit/products',
        transformation: [
          { width: 800, height: 600, crop: 'limit' },
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

const uploadMultipleImages = async (files) => {
  if (!files || files.length === 0) return [];
  
  const uploadPromises = files.map((file, index) => 
    uploadToCloudinary(file.buffer, {
      public_id: `product_${Date.now()}_${index}`
    })
  );
  
  const results = await Promise.all(uploadPromises);
  return results.map(result => result.secure_url);
};

// Product routes
app.post('/products', authenticateToken, upload.array('images', 3), async (req, res) => {
  try {
    const { error, value } = productSchemas.create.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const { title, description, price, condition, category } = value;

    // Upload images to Cloudinary
    const imageUrls = await uploadMultipleImages(req.files);

    // Create product
    const product = await prisma.product.create({
      data: {
        sellerId: req.userId,
        title,
        description,
        price,
        condition,
        category,
        images: imageUrls
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true
          }
        }
      }
    });

    // Clear relevant cache entries
    await redis.del('products:recent');
    await redis.del(`products:category:${category}`);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/products', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      condition, 
      minPrice, 
      maxPrice, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Build where clause
    const where = {
      isAvailable: true
    };

    if (category) {
      where.category = category;
    }

    if (condition) {
      where.condition = condition;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Build orderBy
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // Get products with seller info
    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              college: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      message: 'Products retrieved successfully',
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: take,
          total: totalCount,
          pages: Math.ceil(totalCount / take)
        }
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/products/:productId', async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true,
            createdAt: true
          }
        }
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product retrieved successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.put('/products/:productId', authenticateToken, upload.array('images', 3), async (req, res) => {
  try {
    const { productId } = req.params;
    const { error, value } = productSchemas.update.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (existingProduct.sellerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own products'
      });
    }

    // Handle image updates
    let imageUrls = existingProduct.images;
    if (req.files && req.files.length > 0) {
      imageUrls = await uploadMultipleImages(req.files);
    }

    // Update product
    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...value,
        images: imageUrls
      },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true
          }
        }
      }
    });

    // Clear relevant cache entries
    await redis.del(`product:${productId}`);
    await redis.del('products:recent');

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.delete('/products/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (existingProduct.sellerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own products'
      });
    }

    // Delete product (will cascade delete related records)
    await prisma.product.delete({
      where: { id: productId }
    });

    // Clear relevant cache entries
    await redis.del(`product:${productId}`);
    await redis.del('products:recent');

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/products/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 12, available } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    const where = { sellerId: userId };
    if (available !== undefined) {
      where.isAvailable = available === 'true';
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          seller: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              college: true
            }
          }
        }
      }),
      prisma.product.count({ where })
    ]);

    res.json({
      success: true,
      message: 'User products retrieved successfully',
      data: {
        products,
        pagination: {
          page: parseInt(page),
          limit: take,
          total: totalCount,
          pages: Math.ceil(totalCount / take)
        }
      }
    });

  } catch (error) {
    console.error('Get user products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user products',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/products/categories/list', async (req, res) => {
  try {
    const categories = await prisma.product.groupBy({
      by: ['category'],
      where: { isAvailable: true },
      _count: {
        category: true
      },
      orderBy: {
        _count: {
          category: 'desc'
        }
      }
    });

    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: categories.map(cat => ({
          name: cat.category,
          count: cat._count.category
        }))
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.patch('/products/:productId/availability', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean value'
      });
    }

    // Check if product exists and user owns it
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (existingProduct.sellerId !== req.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own products'
      });
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: { isAvailable },
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            college: true
          }
        }
      }
    });

    // Clear relevant cache entries
    await redis.del(`product:${productId}`);

    res.json({
      success: true,
      message: `Product ${isAvailable ? 'marked as available' : 'marked as sold'}`,
      data: { product }
    });

  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update product availability',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/products/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const redisHealth = await redis.ping();
    
    res.json({
      success: true,
      message: 'Product service is healthy',
      data: {
        service: 'product-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        redis: redisHealth === 'PONG' ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Product service is unhealthy',
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
        message: 'File too large. Maximum size is 5MB per file'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 3 images per product'
      });
    }
  }
  
  console.error('Product service error:', error);
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
    message: 'Product endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`📦 Product service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start product service:', error);
    process.exit(1);
  }
};

startServer(); 