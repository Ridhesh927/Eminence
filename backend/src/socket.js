const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Socket.io JWT Authentication Middleware
  io.use((socket, next) => {
    if (socket.user) return next();
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      if (process.env.NODE_ENV === 'development') {
        socket.user = { id: 'dev-user', role: 'customer' };
        return next();
      }
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const jwtSecret =
        process.env.JWT_SECRET || (['development', 'test'].includes(process.env.NODE_ENV) ? 'fallback_secret' : null);

      if (!jwtSecret) {
        return next(new Error('Server misconfigured: JWT_SECRET is required'));
      }

      const decoded = jwt.verify(token, jwtSecret);
      socket.user = decoded;
      next();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        socket.user = { id: 'dev-user', role: 'customer' };
        return next();
      }
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

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
      if (process.env.NODE_ENV === 'development' && socket.user.id === 'dev-user') {
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

    // Driver sends location update
    socket.on('driver:location_update', (data) => {
      const { bookingId, lat, lng } = data;
      // Broadcast to customer in the same trip room
      io.to(`trip_${bookingId}`).emit('trip:location_update', { lat, lng });
    });

    // Admin joins telemetry room
    socket.on('join_admin_telemetry', () => {
      socket.join('admin_telemetry');
      console.log(`[Socket] Admin ${socket.id} joined admin_telemetry`);
      
      // We start a mock simulation for a dummy vehicle ID when an admin connects
      const { startTelemetrySimulation } = require('./services/telematicsSimulator');
      startTelemetrySimulation('VEH-1234');
    });

    socket.on('leave_admin_telemetry', () => {
      socket.leave('admin_telemetry');
      console.log(`[Socket] Admin ${socket.id} left admin_telemetry`);
      const { stopTelemetrySimulation } = require('./services/telematicsSimulator');
      stopTelemetrySimulation('VEH-1234');
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
      // Clean up mock simulation if admin disconnects
      try {
        const { stopTelemetrySimulation } = require('./services/telematicsSimulator');
        stopTelemetrySimulation('VEH-1234');
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

module.exports = { initSocket, getIo };
