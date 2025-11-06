// Load environment variables first, before any other imports
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { connectDB, checkDBHealth } = require('./src/utils/database');
const { passport } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const enableLimiter = (process.env.NODE_ENV === 'production') || (process.env.RATE_LIMIT_ENABLED === 'true');
if (enableLimiter) {
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || `${15 * 60 * 1000}`, 10); // default 15m
  const max = parseInt(process.env.RATE_LIMIT_MAX || '100', 10); // default 100 req/window
  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.',
    handler: (req, res, next, options) => {
      // Set a Retry-After header (seconds)
      const secs = Math.ceil((options.windowMs || windowMs) / 1000);
      res.set('Retry-After', String(secs));
      res.status(options.statusCode || 429).json({
        error: options.message || 'Too many requests from this IP, please try again later.',
        windowMs,
        max
      });
    },
    skip: (req) => {
      // Skip rate limiting for health and static resources
      const url = req.originalUrl || req.url || '';
      return url.startsWith('/health') || url.startsWith('/uploads');
    }
  });
  // Apply limiter only to API routes to reduce noise in development
  app.use('/api', limiter);
}

// CORS configuration
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:5173', // Vite dev server default
    'http://localhost:5174',
    'http://localhost:5175'
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cookie parser to read cookies (used for OAuth cookie tokens)
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
connectDB();

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🏠 Welcome to ApnaParivar API',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      auth: '/api/auth',
      families: '/api/families',
      members: '/api/members',
      photos: '/api/photos',
      events: '/api/events',
      payments: '/api/payments',
      uploads: '/api/uploads'
    }
  });
});

// Health check endpoint with database status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'unhealthy',
        error: error.message
      }
    });
  }
});

// Database test endpoint
app.get('/test-db', async (req, res) => {
  try {
    const { User } = require('./src/models');
    
    // Test database connection by counting users
    const userCount = await User.countDocuments();
    
    res.json({
      message: '✅ Database connection successful',
      userCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test family creation endpoint
app.get('/test-family', async (req, res) => {
  try {
    const { Family, User } = require('./src/models');
    
    // Find the first user to test with
    const user = await User.findOne();
    if (!user) {
      return res.status(404).json({
        message: '❌ No users found for testing'
      });
    }

    // Try to create a test family
    const family = new Family({
      familyName: 'Test Family ' + Date.now(),
      description: 'Test family for validation',
      createdBy: user._id,
      admins: {
        admin1: {
          userId: user._id,
          assignedAt: new Date()
        }
      }
    });

    await family.save();
    
    res.json({
      message: '✅ Family creation test successful',
      family: {
        id: family._id,
        familyName: family.familyName,
        familyId: family.familyId,
        createdBy: user.name
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ Family creation test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/families', require('./src/routes/families'));
app.use('/api/members', require('./src/routes/members'));
app.use('/api/photos', require('./src/routes/photos'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/payments', require('./src/routes/payments'));
// app.use('/api/payments', require('./src/routes/payments'));
// app.use('/api/uploads', require('./src/routes/uploads'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// Global process handlers to log unhandled errors (nodemon will restart the app)
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('🚨 Uncaught Exception:', err);
  // Let the process crash so nodemon can restart with a clean state
  process.exit(1);
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    message: 'Route not found',
    availableRoutes: ['/', '/health', '/api/auth', '/api/families', '/api/members', '/api/photos', '/api/events', '/api/payments']
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ApnaParivar Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
});

module.exports = app;