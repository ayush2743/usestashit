const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { prisma, connectDatabase, healthCheck } = require('../../config/database');
const { redis, connectRedis } = require('../../config/redis');
const { productSchemas, validate } = require('../../shared/utils/validation');
require('dotenv').config();

const app = express();
const PORT = process.env.SEARCH_SERVICE_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Utility functions
const buildSearchWhere = (filters) => {
  const where = { isAvailable: true };

  if (filters.category) {
    where.category = filters.category;
  }

  if (filters.condition) {
    where.condition = filters.condition;
  }

  if (filters.minPrice || filters.maxPrice) {
    where.price = {};
    if (filters.minPrice) where.price.gte = parseFloat(filters.minPrice);
    if (filters.maxPrice) where.price.lte = parseFloat(filters.maxPrice);
  }

  if (filters.sellerId) {
    where.sellerId = filters.sellerId;
  }

  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } }
    ];
  }

  return where;
};

const buildOrderBy = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const orderBy = {};
  
  switch (sortBy) {
    case 'price':
      orderBy.price = sortOrder;
      break;
    case 'title':
      orderBy.title = sortOrder;
      break;
    case 'createdAt':
    default:
      orderBy.createdAt = sortOrder;
      break;
  }
  
  return orderBy;
};

// Search routes
app.get('/search', async (req, res) => {
  try {
    const {
      query = '',
      category,
      condition,
      minPrice,
      maxPrice,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    const skip = (page - 1) * limit;
    const take = parseInt(limit);

    // Generate cache key
    const cacheKey = `search:${JSON.stringify({
      query, category, condition, minPrice, maxPrice, sortBy, sortOrder, page, limit
    })}`;

    // Check cache first
    const cachedResults = await redis.get(cacheKey);
    if (cachedResults) {
      return res.json({
        success: true,
        message: 'Search results retrieved from cache',
        data: JSON.parse(cachedResults),
        cached: true
      });
    }

    // Build search filters
    const where = buildSearchWhere({
      query: query.trim(),
      category,
      condition,
      minPrice,
      maxPrice
    });

    const orderBy = buildOrderBy(sortBy, sortOrder);

    // Execute search
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

    const results = {
      products,
      pagination: {
        page: parseInt(page),
        limit: take,
        total: totalCount,
        pages: Math.ceil(totalCount / take)
      },
      filters: {
        query: query.trim(),
        category,
        condition,
        minPrice,
        maxPrice,
        sortBy,
        sortOrder
      }
    };

    // Cache results for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(results));

    // Track search query if not empty
    if (query.trim()) {
      await redis.zincrby('search:popular', 1, query.trim().toLowerCase());
    }

    res.json({
      success: true,
      message: 'Search completed successfully',
      data: results
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/search/suggestions', async (req, res) => {
  try {
    const { query = '' } = req.query;
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm || searchTerm.length < 2) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    // Get product title suggestions
    const titleSuggestions = await prisma.product.findMany({
      where: {
        isAvailable: true,
        title: {
          contains: searchTerm,
          mode: 'insensitive'
        }
      },
      select: {
        title: true
      },
      take: 5,
      distinct: ['title']
    });

    // Get category suggestions
    const categories = await prisma.product.findMany({
      where: {
        isAvailable: true
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    const categoryMatches = categories
      .filter(cat => cat.category.toLowerCase().includes(searchTerm))
      .map(cat => cat.category)
      .slice(0, 3);

    const suggestions = [
      ...titleSuggestions.map(p => p.title),
      ...categoryMatches
    ];

    res.json({
      success: true,
      message: 'Suggestions retrieved successfully',
      data: {
        suggestions: [...new Set(suggestions)].slice(0, 8)
      }
    });

  } catch (error) {
    console.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/search/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get popular search terms from Redis
    const popularTerms = await redis.zrevrange('search:popular', 0, limit - 1, 'WITHSCORES');
    
    const formattedTerms = [];
    for (let i = 0; i < popularTerms.length; i += 2) {
      formattedTerms.push({
        term: popularTerms[i],
        count: parseInt(popularTerms[i + 1])
      });
    }

    res.json({
      success: true,
      message: 'Popular searches retrieved successfully',
      data: {
        popularSearches: formattedTerms
      }
    });

  } catch (error) {
    console.error('Get popular searches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular searches',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/search/categories', async (req, res) => {
  try {
    const cacheKey = 'search:categories';
    
    // Check cache first
    const cachedCategories = await redis.get(cacheKey);
    if (cachedCategories) {
      return res.json({
        success: true,
        message: 'Categories retrieved from cache',
        data: JSON.parse(cachedCategories),
        cached: true
      });
    }

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

    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category,
      slug: cat.category.toLowerCase().replace(/[^a-z0-9]/g, '-')
    }));

    // Cache for 30 minutes
    await redis.setEx(cacheKey, 1800, JSON.stringify(formattedCategories));

    res.json({
      success: true,
      message: 'Categories retrieved successfully',
      data: {
        categories: formattedCategories
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/search/filters', async (req, res) => {
  try {
    const cacheKey = 'search:filters';
    
    // Check cache first
    const cachedFilters = await redis.get(cacheKey);
    if (cachedFilters) {
      return res.json({
        success: true,
        message: 'Filters retrieved from cache',
        data: JSON.parse(cachedFilters),
        cached: true
      });
    }

    // Get available categories
    const categories = await prisma.product.findMany({
      where: { isAvailable: true },
      select: { category: true },
      distinct: ['category']
    });

    // Get available conditions
    const conditions = await prisma.product.findMany({
      where: { isAvailable: true },
      select: { condition: true },
      distinct: ['condition']
    });

    // Get price range
    const priceStats = await prisma.product.aggregate({
      where: { isAvailable: true },
      _min: { price: true },
      _max: { price: true },
      _avg: { price: true }
    });

    const filters = {
      categories: categories.map(c => c.category).sort(),
      conditions: conditions.map(c => c.condition).sort(),
      priceRange: {
        min: priceStats._min.price || 0,
        max: priceStats._max.price || 1000,
        average: priceStats._avg.price || 0
      },
      sortOptions: [
        { value: 'createdAt', label: 'Newest First', order: 'desc' },
        { value: 'createdAt', label: 'Oldest First', order: 'asc' },
        { value: 'price', label: 'Price: Low to High', order: 'asc' },
        { value: 'price', label: 'Price: High to Low', order: 'desc' },
        { value: 'title', label: 'Name: A to Z', order: 'asc' },
        { value: 'title', label: 'Name: Z to A', order: 'desc' }
      ]
    };

    // Cache for 1 hour
    await redis.setEx(cacheKey, 3600, JSON.stringify(filters));

    res.json({
      success: true,
      message: 'Search filters retrieved successfully',
      data: { filters }
    });

  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search filters',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

app.get('/search/stats', async (req, res) => {
  try {
    const cacheKey = 'search:stats';
    
    // Check cache first
    const cachedStats = await redis.get(cacheKey);
    if (cachedStats) {
      return res.json({
        success: true,
        message: 'Search stats retrieved from cache',
        data: JSON.parse(cachedStats),
        cached: true
      });
    }

    // Get total available products
    const totalProducts = await prisma.product.count({
      where: { isAvailable: true }
    });

    // Get category breakdown
    const categoryBreakdown = await prisma.product.groupBy({
      by: ['category'],
      where: { isAvailable: true },
      _count: { category: true }
    });

    // Get condition breakdown
    const conditionBreakdown = await prisma.product.groupBy({
      by: ['condition'],
      where: { isAvailable: true },
      _count: { condition: true }
    });

    const stats = {
      totalProducts,
      categoryBreakdown: categoryBreakdown.map(c => ({
        category: c.category,
        count: c._count.category
      })),
      conditionBreakdown: conditionBreakdown.map(c => ({
        condition: c.condition,
        count: c._count.condition
      }))
    };

    // Cache for 15 minutes
    await redis.setEx(cacheKey, 900, JSON.stringify(stats));

    res.json({
      success: true,
      message: 'Search statistics retrieved successfully',
      data: { stats }
    });

  } catch (error) {
    console.error('Get search stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get search statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/search/health', async (req, res) => {
  try {
    const dbHealth = await healthCheck();
    const redisHealth = await redis.ping();
    
    res.json({
      success: true,
      message: 'Search service is healthy',
      data: {
        service: 'search-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbHealth,
        redis: redisHealth === 'PONG' ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Search service is unhealthy',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Search service error:', error);
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
    message: 'Search endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await connectRedis();
    
    app.listen(PORT, () => {
      console.log(`🔍 Search service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start search service:', error);
    process.exit(1);
  }
};

startServer(); 