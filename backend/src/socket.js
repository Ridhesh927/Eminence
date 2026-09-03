const { Server } = require('socket.io');

let io;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Driver joins their own room or a trip room
    socket.on('join_trip', (bookingId) => {
      socket.join(`trip_${bookingId}`);
      console.log(`[Socket] Client ${socket.id} joined trip_${bookingId}`);
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
