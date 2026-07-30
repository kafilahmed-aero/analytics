const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const corsConfig = require('./config/cors.config');
const loggerMiddleware = require('./middleware/logger.middleware');
const requestTimeoutMiddleware = require('./middleware/timeout.middleware');
const apiRateLimiter = require('./middleware/rateLimiter.middleware');
const notFoundHandler = require('./middleware/notFound.middleware');
const errorHandler = require('./middleware/error.middleware');
const routes = require('./routes');

const app = express();

// Trust reverse proxy (e.g., Render, Cloudflare, Nginx) for accurate client IP rate limiting
app.set('trust proxy', 1);

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(cors(corsConfig));

// Compression middleware
app.use(compression());

// Request timeout middleware (15 seconds)
app.use(requestTimeoutMiddleware(15000));

// Body parser middlewares
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// HTTP request logging
app.use(loggerMiddleware);

// Rate limiting for API endpoints
app.use('/api', apiRateLimiter);

// API Routes
app.use('/api', routes);

// 404 Route Not Found Handler
app.use(notFoundHandler);

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
