const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token or user not found'
      });
    }
    
    // Update last active timestamp
    user.lastActive = new Date();
    await user.save({ validateBeforeSave: false });
    
    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token has expired'
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

// Middleware for optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
        
        // Update last active timestamp
        user.lastActive = new Date();
        await user.save({ validateBeforeSave: false });
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without authentication for optional auth
    next();
  }
};

// Middleware to check if user is admin (assuming admin role exists)
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  
  if (!req.user.isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  next();
};

// Middleware to check if user owns the resource or is admin
const requireOwnershipOrAdmin = (resourceIdField = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const resourceId = req.params[resourceIdField];
    
    // Allow if user is admin or owns the resource
    if (req.user.isAdmin || req.user._id.toString() === resourceId) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      error: 'Access denied: You can only access your own resources'
    });
  };
};

// Middleware to validate user ownership of a resource
const validateResourceOwnership = (Model, resourceIdField = 'id', ownerField = 'author') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }
      
      const resourceId = req.params[resourceIdField];
      const resource = await Model.findById(resourceId);
      
      if (!resource) {
        return res.status(404).json({
          success: false,
          error: 'Resource not found'
        });
      }
      
      // Check if user owns the resource or is admin
      const isOwner = resource[ownerField].toString() === req.user._id.toString();
      const isAdmin = req.user.isAdmin;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied: You can only modify your own resources'
        });
      }
      
      // Attach resource to request for use in controller
      req.resource = resource;
      next();
    } catch (error) {
      console.error('Resource ownership validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate resource ownership'
      });
    }
  };
};

// Rate limiting middleware for authentication endpoints
const authRateLimit = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;
    
    // Clean old entries
    attempts.forEach((value, key) => {
      if (now - value.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    });
    
    const userAttempts = attempts.get(ip);
    
    if (userAttempts) {
      if (userAttempts.count >= maxAttempts) {
        const timeLeft = Math.ceil((windowMs - (now - userAttempts.firstAttempt)) / 1000 / 60);
        return res.status(429).json({
          success: false,
          error: `Too many attempts. Try again in ${timeLeft} minutes.`
        });
      }
      userAttempts.count++;
    } else {
      attempts.set(ip, {
        count: 1,
        firstAttempt: now
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireOwnershipOrAdmin,
  validateResourceOwnership,
  authRateLimit
};