const jwt = require('jsonwebtoken');
const { redisUtils } = require('../../config/redis');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }

    // Check if token is blacklisted in Redis
    const isBlacklisted = await redisUtils.exists(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has been invalidated.' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId; // Add userId for easier access
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired.' 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Token verification failed.' 
    });
  }
};

// Optional auth middleware (for endpoints that work with or without auth)
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const isBlacklisted = await redisUtils.exists(`blacklist:${token}`);
      if (!isBlacklisted) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      }
    }
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Blacklist token in Redis
const blacklistToken = async (token) => {
  try {
    const decoded = jwt.decode(token);
    const expirationTime = decoded.exp - Math.floor(Date.now() / 1000);
    
    if (expirationTime > 0) {
      await redisUtils.setEx(`blacklist:${token}`, true, expirationTime);
    }
  } catch (error) {
    console.error('Error blacklisting token:', error);
  }
};

module.exports = {
  verifyToken,
  authenticateToken: verifyToken, // Alias for consistency
  optionalAuth,
  generateToken,
  blacklistToken
}; 