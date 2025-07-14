// backend/src/app.js - UPDATED with better CSP
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const supplierRoutes = require('./routes/suppliers');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const dashboardRoutes = require('./routes/dashboard');

// Initialize database
require('./config/database');

const app = express();

// Security middleware with updated CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", 
        "'unsafe-eval'", 
        "https://cdn.jsdelivr.net", 
        "https://cdnjs.cloudflare.com"
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: logger.stream }));

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/categories', require('./routes/categories')); // Add categories route

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Serve pages directory
app.use('/pages', express.static(path.join(__dirname, '../../frontend/pages')));

// Catch-all route to serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
