const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables (.env.local first, overriding any parent process variables)
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });

const app = express();

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
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked: Origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({
  verify: (req, res, buf) => {
    if (req.originalUrl.includes('webhook')) {
      req.rawBody = buf.toString();
    }
  }
}));
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/api/health', (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({ 
    success: true, 
    message: 'EMINENCE API is running',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMb: (mem.heapUsed / 1024 / 1024).toFixed(2)
  });
});

// Public white-label config (no auth required)
app.get('/api/config', async (_req, res) => {
  try {
    const { PlatformConfig } = require('./models');
    let config = await PlatformConfig.findOne();
    if (!config) config = await PlatformConfig.create({});
    res.status(200).json({ success: true, config });
  } catch {
    res.status(200).json({ success: true, config: { brandName: 'Eminence Logistics', primaryColor: '#b87333' } });
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

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/b2b', b2bRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/bookings', bookingRoutes);

module.exports = app;
