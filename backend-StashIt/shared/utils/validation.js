const Joi = require('joi');

// User validation schemas
const userSchemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().min(2).max(50).required(),
    lastName: Joi.string().min(2).max(50).required(),
    college: Joi.string().min(2).max(255).required(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    college: Joi.string().min(2).max(255).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional()
  })
};

// Product validation schemas
const productSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().positive().precision(2).required(),
    condition: Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR').required(),
    category: Joi.string().valid(
      'BOOKS', 
      'ELECTRONICS', 
      'FURNITURE', 
      'CLOTHING', 
      'SPORTS', 
      'FOOD',
      'OTHER'
    ).required()
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().max(2000).optional(),
    price: Joi.number().positive().precision(2).optional(),
    condition: Joi.string().valid('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR').optional(),
    category: Joi.string().valid(
      'BOOKS', 
      'ELECTRONICS', 
      'FURNITURE', 
      'CLOTHING', 
      'SPORTS', 
      'FOOD',
      'OTHER'
    ).optional(),
    isAvailable: Joi.boolean().optional()
  }),

  search: Joi.object({
    query: Joi.string().max(255).optional(),
    category: Joi.string().optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().positive().optional(),
    condition: Joi.string().valid('new', 'like_new', 'good', 'fair', 'poor').optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    sortBy: Joi.string().valid('price', 'created_at', 'title').default('created_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

// Message validation schemas
const messageSchemas = {
  send: Joi.object({
    receiverId: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
    productId: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
    content: Joi.string().min(1).max(1000).required()
  }),

  getConversation: Joi.object({
    conversationId: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20)
  }),

  createConversation: Joi.object({
    productId: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
    receiverId: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required()
  })
};

// Generic validation schemas
const commonSchemas = {
  uuid: Joi.string().pattern(/^[a-zA-Z0-9]+$/).required(),
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10)
  })
};

// College email validation
const validateCollegeEmail = (email) => {
  const allowedDomains = process.env.ALLOWED_COLLEGE_DOMAINS?.split(',') || ['edu', 'ac.in'];
  const emailDomain = email.split('@')[1];
  
  return allowedDomains.some(domain => emailDomain.endsWith(domain));
};

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property]);
    
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    
    req[property] = value;
    next();
  };
};

// File validation for image uploads
const validateImage = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(file.mimetype)) {
    return { valid: false, message: 'Only JPEG, PNG, and WebP images are allowed' };
  }
  
  if (file.size > maxSize) {
    return { valid: false, message: 'Image size must be less than 5MB' };
  }
  
  return { valid: true };
};

module.exports = {
  userSchemas,
  productSchemas,
  messageSchemas,
  commonSchemas,
  validate,
  validateCollegeEmail,
  validateImage
}; 