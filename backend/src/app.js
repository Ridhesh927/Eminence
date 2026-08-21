const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables (.env.local first, overriding any parent process variables)
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env.local'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/api/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'EMINENCE API is running' });
});

// Routes
const authRoutes = require('./routes/authRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
app.use('/api/auth', authRoutes);
app.use('/api/integrations', integrationRoutes);

module.exports = app;
