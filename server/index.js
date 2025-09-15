const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

// Import passport configuration
require('./config/passport');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const segmentRoutes = require('./routes/segments');
const campaignRoutes = require('./routes/campaigns');
const vendorRoutes = require('./routes/vendor');
const aiRoutes = require('./routes/ai');
const swaggerRoutes = require('./routes/swagger');

const app = express();

// Prefer API_PORT, then PORT, then fallback 5000
const PORT = process.env.API_PORT || process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback_session_secret',
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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/segments', segmentRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api-docs', swaggerRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Start server and handle common listen errors gracefully
const server = app.listen(PORT, () => {
  console.log(🚀 Server running on port ${PORT});
  console.log(📚 API Documentation: http://localhost:${PORT}/api-docs);
  console.log(🏥 Health Check: http://localhost:${PORT}/health);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(⛔ Port ${PORT} is already in use. Stop the process using this port or set API_PORT in your .env to a free port.);
    console.error(Try: lsof -i :${PORT}  # then kill <PID>);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

module.exports = app;