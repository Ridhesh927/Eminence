const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;
let pool;
const socketConnectionAttempts = new Map();
const socketEventTimestamps = new Map();

const getSocketLimit = (envName, productionDefault, nonProductionDefault) => {
  const configured = Number.parseInt(process.env[envName], 10);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return process.env.NODE_ENV === 'production' ? productionDefault : nonProductionDefault;
};

const getSocketClientKey = (socket) => (
  socket.handshake.address ||
  socket.handshake.headers?.['x-real-ip'] ||
  socket.conn?.remoteAddress ||
  'unknown'
);

const consumeSocketEvent = (socket, eventName, max, windowMs) => {
  const key = `${socket.id}:${eventName}`;
  const now = Date.now();
  const recent = (socketEventTimestamps.get(key) || []).filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  socketEventTimestamps.set(key, recent);
  return true;
};

setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [key, timestamps] of socketConnectionAttempts.entries()) {
    const recent = timestamps.filter((timestamp) => timestamp > cutoff);
    if (recent.length === 0) socketConnectionAttempts.delete(key);
    else socketConnectionAttempts.set(key, recent);
  }
}, 5 * 60 * 1000).unref();

const initSocket = (httpServer) => {
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

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('CORS blocked: Origin not allowed for Socket.io'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Per-instance connection-attempt guard. Shared storage is required for exact limits across replicas.
  io.use((socket, next) => {
    const key = getSocketClientKey(socket);
    const now = Date.now();
    const recent = (socketConnectionAttempts.get(key) || [])
      .filter((timestamp) => now - timestamp < 15 * 60 * 1000);
    const maxAttempts = getSocketLimit('SOCKET_CONNECTION_MAX', 30, 1000);
    if (recent.length >= maxAttempts) {
      return next(new Error('Too many connection attempts. Please try again later.'));
    }
    recent.push(now);
    socketConnectionAttempts.set(key, recent);
    return next();
  });

  const dbUrl = process.env.DATABASE_URL;
  const useSqlite = process.env.NODE_ENV === 'test' || process.env.USE_SQLITE === 'true' || process.env.DB_DIALECT === 'sqlite' || !dbUrl || dbUrl.startsWith('sqlite:');

  if (!useSqlite && dbUrl) {
    try {
      const { createAdapter } = require('@socket.io/postgres-adapter');
      const { Pool } = require('pg');
      const sanitizedUrl = dbUrl.replace(/([?&])channel_binding=[^&]*(&|$)/, '$1').replace(/[?&]$/, '');
      const isLocalhost = sanitizedUrl.includes('localhost') || sanitizedUrl.includes('127.0.0.1');
      
      const sslConfig = !isLocalhost ? {
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true,
        ...(process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : {})
      } : false;

      pool = new Pool({
        connectionString: sanitizedUrl,
        ssl: sslConfig
      });

      pool.query(`
        CREATE TABLE IF NOT EXISTS socket_io_attachments (
            id          bigserial UNIQUE,
            created_at  timestamptz DEFAULT NOW(),
            payload     bytea
        );
      `).then(() => {
        io.adapter(createAdapter(pool));
        console.log('[Socket] Postgres Adapter initialized');
      }).catch(err => {
        console.error('[Socket] Failed to initialize Postgres Adapter table:', err);
      });
    } catch (err) {
      console.error('[Socket] Could not load @socket.io/postgres-adapter:', err);
    }
  }


  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    if (socket.user) return next();

    // Check auth object, Authorization header, or cookie
    let cookieToken = null;
    if (socket.handshake.headers?.cookie) {
      const match = socket.handshake.headers.cookie.match(/(?:^|;\s*)(?:accessToken|token)=([^;]*)/);
      if (match) cookieToken = decodeURIComponent(match[1]);
    }

    const token = socket.handshake.auth?.token || 
                  socket.handshake.headers?.authorization?.split(' ')[1] || 
                  cookieToken;

    if (!token) {
      if (process.env.NODE_ENV === 'development' && process.env.TEST_FIXTURES === 'true') {
        socket.user = { id: 'dev-user', role: 'customer' };
        return next();
      }
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const jwtSecret = process.env.JWT_SECRET;

      if (!jwtSecret) {
        return next(new Error('Server misconfigured: JWT_SECRET is required'));
      }

      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      if (process.env.NODE_ENV === 'development' && process.env.TEST_FIXTURES === 'true') {
        socket.user = { id: 'dev-user', role: 'customer' };
        return next();
      }
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Automatically join user personal notifications room
    if (socket.user?.id) {
      socket.join(`user_${socket.user.id}`);
    }
    // Automatically join admin notifications room
    if (socket.user?.role === 'admin') {
      socket.join('admin_notifications');
      socket.join('admin_inbox');
    }

    // Explicit join listener for client resilience
    socket.on('join_notifications', () => {
      if (socket.user?.id) {
        socket.join(`user_${socket.user.id}`);
      }
      if (socket.user?.role === 'admin') {
        socket.join('admin_notifications');
        socket.join('admin_inbox');
      }
      socket.emit('joined_notifications');
    });

    // Driver or Customer joins their trip room with authorization checks
    socket.on('join_trip', async (bookingId) => {
      if (!socket.user) {
        return socket.emit('error', { message: 'Unauthorized: Authentication required' });
      }

      if (!bookingId) {
        return socket.emit('error', { message: 'Booking ID required' });
      }

      // Admin has global visibility across all trips
      if (socket.user.role === 'admin') {
        socket.join(`trip_${bookingId}`);
        console.log(`[Socket] Admin ${socket.id} joined trip_${bookingId}`);
        return socket.emit('joined_trip', { bookingId });
      }

      // Local development bypass
      if (process.env.NODE_ENV === 'development' && process.env.TEST_FIXTURES === 'true' && socket.user.id === 'dev-user') {
        socket.join(`trip_${bookingId}`);
        console.log(`[Socket] Dev user ${socket.id} joined trip_${bookingId}`);
        return socket.emit('joined_trip', { bookingId });
      }

      try {
        const { Booking } = require('./models');
        let booking;
        try {
          booking = await Booking.findByPk(bookingId);
        } catch (dbErr) {
          return socket.emit('error', { message: 'Unauthorized: Booking not found' });
        }

        if (!booking) {
          return socket.emit('error', { message: 'Unauthorized: Booking not found' });
        }

        const isCustomer = booking.customerId && booking.customerId === socket.user.id;
        const isDriver = booking.driverId && booking.driverId === socket.user.id;

        if (!isCustomer && !isDriver) {
          return socket.emit('error', { message: 'Unauthorized: Cannot join trip room for another user' });
        }

        socket.join(`trip_${bookingId}`);
        console.log(`[Socket] Client ${socket.id} (${socket.user.role}) joined trip_${bookingId}`);
        socket.emit('joined_trip', { bookingId });
      } catch (err) {
        console.error(`[Socket] Error verifying access for trip_${bookingId}:`, err);
        return socket.emit('error', { message: 'Unauthorized: Unable to verify trip access' });
      }
    });

    // Driver sends location update — only drivers or admins are authorised
    socket.on('driver:location_update', async (data) => {
      if (!socket.user || (socket.user.role !== 'driver' && socket.user.role !== 'admin')) {
        return socket.emit('error', { message: 'Unauthorized: Driver role required to send location updates' });
      }
      if (!consumeSocketEvent(socket, 'driver:location_update', getSocketLimit('SOCKET_LOCATION_MAX_PER_MINUTE', 120, 1000), 60 * 1000)) {
        return socket.emit('error', { message: 'Location update rate limit exceeded' });
      }
      const { bookingId, lat, lng } = data;

      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        return socket.emit('error', {
          message: 'Invalid coordinates'
        });
      }

      if (socket.user.role !== 'admin') {
        try {
          const { Booking } = require('./models');
          const booking = await Booking.findOne({
            where: {
              id: bookingId,
              driverId: socket.user.id
            }
          });
          if (!booking) {
            return socket.emit('error', { message: 'Not authorized for this booking' });
          }
        } catch (err) {
          console.error(`[Socket] Error verifying booking for driver:location_update:`, err);
          return socket.emit('error', { message: 'Server error verifying booking' });
        }
      }

      // Broadcast to customer in the same trip room
      io.to(`trip_${bookingId}`).emit('trip:location_update', { lat, lng });
    });

    // Driver joins vehicle telemetry room
    socket.on('join_vehicle_telemetry', (vehicleId) => {
      if (!socket.user || (socket.user.role !== 'driver' && socket.user.role !== 'admin')) {
        return socket.emit('error', { message: 'Unauthorized: Driver or admin role required' });
      }
      if (!vehicleId) {
        return socket.emit('error', { message: 'Vehicle ID is required' });
      }
      const targetVehicle = String(vehicleId);
      socket.join(`vehicle_${targetVehicle}`);
      socket.emit('joined_vehicle_telemetry', { vehicleId: targetVehicle });
      console.log(`[Socket] Driver/Client ${socket.id} joined vehicle_${targetVehicle}`);
    });

    // Development/QA mock telemetry injection
    socket.on('qa:inject_telemetry', (data) => {
      if (process.env.NODE_ENV !== 'production' && process.env.TEST_FIXTURES === 'true' && data?.vehicleId) {
        const payload = {
          vehicleId: String(data.vehicleId),
          timestamp: new Date().toISOString(),
          temperature: Number(data.temperature) || 90,
          engineTemp: Number(data.temperature) || 90,
          speed: data.speed !== undefined ? Number(data.speed) : 45,
          rpm: data.rpm || 2000,
          coolantAlert: Number(data.temperature) >= 100 ? 'Coolant Overheating Risk' : null,
          alert: Number(data.temperature) >= 100 ? 'CRITICAL_ENGINE_FAILURE_IMMINENT' : null
        };
        io.to('admin_telemetry').emit('telemetry_update', payload);
        io.to(`vehicle_${payload.vehicleId}`).emit('telemetry_update', payload);
      }
    });

    // Admin joins telemetry room
    socket.on('join_admin_telemetry', () => {
      if (socket.user?.role !== 'admin') {
        return socket.emit('error', { message: 'Admin access required' });
      }
      
      socket.join('admin_telemetry');
      socket.emit('joined_admin_telemetry');
      console.log(`[Socket] Admin ${socket.id} joined admin_telemetry`);

      const { getTelemetryStatus } = require('./services/telemetryProvider');
      const telemetryStatus = getTelemetryStatus();
      socket.emit('telemetry_status', telemetryStatus);

      const simulationVehicleId = process.env.TELEMETRY_SIMULATION_VEHICLE_ID || 'MH-12-BP-1001';
      if (telemetryStatus.simulated && simulationVehicleId) {
        const { startTelemetrySimulation, getTelemetryHistory } = require('./services/telematicsSimulator');
        startTelemetrySimulation(simulationVehicleId);
        const history = getTelemetryHistory(simulationVehicleId);
        socket.emit('telemetry_history', history);
        if (history.length > 0) {
          socket.emit('telemetry_update', history[history.length - 1]);
        }
      }
    });

    socket.on('leave_admin_telemetry', () => {
      if (socket.user?.role !== 'admin') {
        return socket.emit('error', { message: 'Admin access required' });
      }

      socket.leave('admin_telemetry');
      console.log(`[Socket] Admin ${socket.id} left admin_telemetry`);
      const { stopTelemetrySimulation } = require('./services/telematicsSimulator');
      if (process.env.TELEMETRY_SIMULATION_VEHICLE_ID || 'MH-12-BP-1001') {
        stopTelemetrySimulation(process.env.TELEMETRY_SIMULATION_VEHICLE_ID || 'MH-12-BP-1001');
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      for (const key of socketEventTimestamps.keys()) {
        if (key.startsWith(`${socket.id}:`)) socketEventTimestamps.delete(key);
      }
      // Clean up mock simulation if admin disconnects
      try {
        const { stopTelemetrySimulation } = require('./services/telematicsSimulator');
        if (process.env.TELEMETRY_SIMULATION_VEHICLE_ID || 'MH-12-BP-1001') {
          stopTelemetrySimulation(process.env.TELEMETRY_SIMULATION_VEHICLE_ID || 'MH-12-BP-1001');
        }
      } catch (err) {}
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

const closeSocket = async () => {
  if (io) {
    try {
      io.disconnectSockets(true);
    } catch (e) {}
    await new Promise((resolve) => io.close(() => resolve()));
    io = null;
  }
  if (pool) {
    try {
      await pool.end();
    } catch (e) {}
    pool = null;
  }
};

module.exports = { initSocket, getIo, closeSocket };
