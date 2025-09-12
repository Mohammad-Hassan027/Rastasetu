require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import database connection
const connectDB = require('./src/config/database');

// Import routes
const authRoutes = require('./src/routes/auth');
const postRoutes = require('./src/routes/posts');
const userRoutes = require('./src/routes/users');
const commentRoutes = require('./src/routes/comments');
const placesRoutes = require('./src/routes/places');
const rewardsRoutes = require('./src/routes/rewards');
const uploadRoutes = require('./src/routes/upload');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:19006'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Logging middleware
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Kerala Connect API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/upload', uploadRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Kerala Connect API',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      posts: '/api/posts',
      comments: '/api/comments',
      places: '/api/places',
      rewards: '/api/rewards',
      upload: '/api/upload'
    }
  });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
  
  res.json({
    success: true,
    message: 'Kerala Connect API Documentation',
    version: '1.0.0',
    baseUrl,
    authentication: {
      type: 'Bearer Token (JWT)',
      header: 'Authorization: Bearer <your-token>',
      tokenExpiration: '7 days',
      note: 'Include JWT token in Authorization header for protected endpoints'
    },
    responseFormat: {
      success: {
        success: true,
        message: 'Operation successful',
        data: 'Response data object'
      },
      error: {
        success: false,
        error: 'Error message',
        details: 'Additional error details (for validation errors)'
      }
    },
    rateLimits: {
      general: '1000 requests per 15 minutes per IP',
      authentication: '5-10 requests per 15 minutes per IP (varies by endpoint)'
    },
    endpoints: {
      authentication: {
        baseUrl: `${baseUrl}/api/auth`,
        routes: [
          {
            method: 'POST',
            path: '/signup',
            description: 'Register new user',
            access: 'Public',
            body: {
              username: 'string (3-30 chars, alphanumeric + underscore)',
              email: 'string (valid email)',
              password: 'string (min 6 chars, mixed case + number)',
              fullName: 'string (2-100 chars, letters + spaces)'
            }
          },
          {
            method: 'POST',
            path: '/login',
            description: 'Login user',
            access: 'Public',
            body: {
              email: 'string (valid email)',
              password: 'string'
            }
          },
          {
            method: 'POST',
            path: '/logout',
            description: 'Logout user',
            access: 'Private'
          },
          {
            method: 'GET',
            path: '/me',
            description: 'Get current user profile',
            access: 'Private'
          },
          {
            method: 'POST',
            path: '/refresh-token',
            description: 'Refresh JWT token',
            access: 'Private'
          }
        ]
      },
      users: {
        baseUrl: `${baseUrl}/api/users`,
        routes: [
          {
            method: 'GET',
            path: '/:id',
            description: 'Get user profile by ID',
            access: 'Public',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'PUT',
            path: '/me',
            description: 'Update own profile',
            access: 'Private',
            body: {
              username: 'string (optional)',
              fullName: 'string (optional)',
              bio: 'string (optional, max 500 chars)'
            }
          },
          {
            method: 'POST',
            path: '/:id/follow',
            description: 'Follow user',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'DELETE',
            path: '/:id/follow',
            description: 'Unfollow user',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'GET',
            path: '/me/points',
            description: 'Get current user points and transactions',
            access: 'Private'
          }
        ]
      },
      posts: {
        baseUrl: `${baseUrl}/api/posts`,
        routes: [
          {
            method: 'GET',
            path: '/feed',
            description: 'Get personalized user feed',
            access: 'Private',
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'POST',
            path: '/',
            description: 'Create new post',
            access: 'Private',
            body: {
              content: 'string (1-1000 chars)',
              images: 'array of URLs (optional, max 5)',
              'location.name': 'string (optional, max 100 chars)',
              'location.coordinates.latitude': 'number (optional, -90 to 90)',
              'location.coordinates.longitude': 'number (optional, -180 to 180)'
            }
          },
          {
            method: 'GET',
            path: '/:id',
            description: 'Get post by ID',
            access: 'Public',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'PUT',
            path: '/:id',
            description: 'Update post (owner only)',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' },
            body: {
              content: 'string (optional, 1-1000 chars)',
              visibility: 'string (optional: public, followers, private)'
            }
          },
          {
            method: 'DELETE',
            path: '/:id',
            description: 'Delete post (owner only)',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'POST',
            path: '/:id/like',
            description: 'Like post',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'DELETE',
            path: '/:id/like',
            description: 'Unlike post',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          }
        ]
      },
      comments: {
        baseUrl: `${baseUrl}/api/comments`,
        routes: [
          {
            method: 'GET',
            path: '/post/:postId',
            description: 'Get comments for a specific post',
            access: 'Public (enhanced with auth)',
            parameters: { postId: 'MongoDB ObjectId' },
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'POST',
            path: '/post/:postId',
            description: 'Add comment to post',
            access: 'Private',
            parameters: { postId: 'MongoDB ObjectId' },
            body: {
              content: 'string (1-500 chars)',
              parentComment: 'MongoDB ObjectId (optional, for replies)'
            }
          },
          {
            method: 'GET',
            path: '/:id/replies',
            description: 'Get replies for specific comment',
            access: 'Public (enhanced with auth)',
            parameters: { id: 'MongoDB ObjectId' },
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'PUT',
            path: '/:id',
            description: 'Update comment (owner only)',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' },
            body: { content: 'string (1-500 chars)' }
          },
          {
            method: 'DELETE',
            path: '/:id',
            description: 'Delete comment (owner only)',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'POST',
            path: '/:id/like',
            description: 'Like comment',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'DELETE',
            path: '/:id/like',
            description: 'Unlike comment',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          }
        ]
      },
      places: {
        baseUrl: `${baseUrl}/api/places`,
        routes: [
          {
            method: 'GET',
            path: '/',
            description: 'Get all places with filters',
            access: 'Public',
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'GET',
            path: '/trending',
            description: 'Get trending places',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/popular',
            description: 'Get popular destinations',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/nearby',
            description: 'Get places nearby a location',
            access: 'Public',
            query: {
              latitude: 'number (-90 to 90)',
              longitude: 'number (-180 to 180)',
              radius: 'number (1 to 100000 meters)'
            }
          },
          {
            method: 'GET',
            path: '/categories',
            description: 'Get place categories with count',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/districts',
            description: 'Get place districts with count',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/:id',
            description: 'Get place by ID',
            access: 'Public',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'GET',
            path: '/:id/posts',
            description: 'Get posts for specific place',
            access: 'Public (enhanced with auth)',
            parameters: { id: 'MongoDB ObjectId' },
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'POST',
            path: '/:id/rate',
            description: 'Rate a place',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' },
            body: {
              rating: 'number (1-5)',
              review: 'string (optional, max 500 chars)'
            }
          },
          {
            method: 'POST',
            path: '/:id/checkin',
            description: 'Check in at a place',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          }
        ]
      },
      rewards: {
        baseUrl: `${baseUrl}/api/rewards`,
        routes: [
          {
            method: 'GET',
            path: '/coupons',
            description: 'Get available coupons for user',
            access: 'Private'
          },
          {
            method: 'GET',
            path: '/coupons/featured',
            description: 'Get featured coupons',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/coupons/categories',
            description: 'Get coupon categories with count',
            access: 'Public'
          },
          {
            method: 'GET',
            path: '/coupons/:id',
            description: 'Get specific coupon by ID',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'POST',
            path: '/coupons/:id/redeem',
            description: 'Redeem a coupon',
            access: 'Private',
            parameters: { id: 'MongoDB ObjectId' }
          },
          {
            method: 'GET',
            path: '/my-redemptions',
            description: 'Get user\'s redeemed coupons',
            access: 'Private',
            query: { page: 'number (optional)', limit: 'number (optional, max 100)' }
          },
          {
            method: 'GET',
            path: '/redemptions/:code',
            description: 'Get redemption by code',
            access: 'Private',
            parameters: { code: 'string (redemption code)' }
          },
          {
            method: 'PATCH',
            path: '/redemptions/:code/use',
            description: 'Mark redemption as used (for partners)',
            access: 'Private',
            parameters: { code: 'string (redemption code)' },
            body: {
              usedBy: 'string (optional, 2-100 chars)',
              notes: 'string (optional, max 200 chars)'
            }
          },
          {
            method: 'GET',
            path: '/points/opportunities',
            description: 'Get ways to earn points',
            access: 'Public'
          }
        ]
      },
      upload: {
        baseUrl: `${baseUrl}/api/upload`,
        routes: [
          {
            method: 'POST',
            path: '/',
            description: 'Upload image file',
            access: 'Private',
            body: 'multipart/form-data with image file',
            note: 'Returns Cloudinary URL for uploaded image'
          }
        ]
      }
    },
    pointsSystem: {
      description: 'Users earn points through various activities',
      activities: {
        'Welcome bonus': '10 points',
        'Daily login': '1 point',
        'Create post': '5 points',
        'Receive like': '2 points',
        'Receive comment': '3 points'
      }
    },
    categories: {
      places: ['Beach', 'Mountains', 'Backwaters', 'Wildlife', 'Heritage', 'Adventure', 'Religious', 'Cultural', 'Nature', 'Urban'],
      coupons: ['accommodation', 'dining', 'transportation', 'activities', 'shopping', 'tours', 'general']
    },
    notes: [
      'All timestamps are in ISO 8601 format',
      'Pagination: Use page (starting from 1) and limit parameters',
      'ObjectId format: 24-character hexadecimal string',
      'All request/response bodies use JSON format',
      'File uploads use multipart/form-data',
      'Rate limits reset every 15 minutes'
    ]
  });
});

// Handle 404 for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      error: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Token expired'
    });
  }
  
  // Default server error
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
🚀 Kerala Connect API Server is running!
📍 Port: ${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Base URL: http://localhost:${PORT}
📚 API Documentation: http://localhost:${PORT}/api/docs
🏥 Health Check: http://localhost:${PORT}/health
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Promise Rejection:', err.message);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('Uncaught Exception:', err.message);
  console.log('Shutting down...');
  process.exit(1);
});

module.exports = app;