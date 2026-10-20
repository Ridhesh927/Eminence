const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

// Load environment variables (.env.local first, overriding any parent process variables)
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const helmet = require('helmet');
const { apiLimiter, publicReadLimiter } = require('./middleware/rateLimiter');

const app = express();

// Trust reverse proxy (e.g. Render, Vercel, Cloudflare, ALB) for accurate client IP rate limiting
const trustProxyEnv = process.env.TRUST_PROXY;
if (trustProxyEnv !== undefined) {
  const parsed = parseInt(trustProxyEnv, 10);
  app.set('trust proxy', isNaN(parsed) ? trustProxyEnv : parsed);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cookieParser());

// Middleware - Secure Origin-Restricted CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : [
      'http://localhost:3000',
      'http://localhost:5000',
      'http://localhost:5173',
      'http://localhost:8081',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:8081'
    ];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked: Origin not allowed'));
  },
  credentials: true
}));

const csrfProtection = require('./middleware/csrfMiddleware');
app.use(csrfProtection);
app.use(express.json({
  limit: '1mb',
  verify: (req, res, buf) => {
    const urlPath = req.originalUrl.split('?')[0];
    if (
      urlPath === '/api/integrations/razorpay-webhook' || 
      urlPath === '/api/integrations/whatsapp-webhook'
    ) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Basic route
app.get('/api/health', publicReadLimiter, (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({ 
    success: true, 
    message: 'EMINENCE API is running',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: (mem.heapUsed / 1024 / 1024).toFixed(2)
  });
});

// Public white-label config (no auth required, strictly read-only without side-effects)
app.get('/api/config', publicReadLimiter, async (_req, res) => {
  try {
    const { PlatformConfig } = require('./models');
    const config = await PlatformConfig.findOne();
    if (config) {
      return res.status(200).json({ success: true, config });
    }
    return res.status(200).json({ success: true, config: { brandName: 'Eminence Logistics', primaryColor: '#b87333' } });
  } catch {
    return res.status(200).json({ success: true, config: { brandName: 'Eminence Logistics', primaryColor: '#b87333' } });
  }
});

// Routes
const authRoutes = require('./routes/authRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const driverRoutes = require('./routes/driverRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const walletRoutes = require('./routes/walletRoutes');
const b2bRoutes = require('./routes/b2bRoutes');
const addressRoutes = require('./routes/addressRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const ivrRoutes = require('./routes/ivrRoutes');
const supportRoutes = require('./routes/supportRoutes');

const customerRoutes = require('./routes/customerRoutes');

// Base API rate limiter protects all /api routes from denial-of-service
app.use('/api', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ivr', ivrRoutes);
app.use('/api/support', supportRoutes);

// Global production-safe error handler (prevents stack traces leaking to clients)
app.use((err, _req, res, _next) => {
  if (err.message && err.message.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: 'Origin not allowed by CORS' });
  }
  const isProd = process.env.NODE_ENV === 'production';
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: isProd ? 'Internal server error' : (err.message || 'Internal server error'),
    ...(isProd ? {} : { stack: err.stack })
  });
});

module.exports = app;
