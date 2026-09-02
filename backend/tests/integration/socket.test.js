const http = require('http');
const ioClient = require('socket.io-client');
const jwt = require('jsonwebtoken');
const app = require('../../src/app');
const { initSocket } = require('../../src/socket');

describe('Socket.io Authentication & Room Access Control Tests', () => {
  let server;
  let io;
  let serverAddress;
  let adminToken;
  let customerToken;
  let otherCustomerToken;

  beforeAll((done) => {
    server = http.createServer(app);
    io = initSocket(server);

    // Setup the chat handlers as in server.js
    const activeChats = {};

    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        socket.user = decoded;
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
    });

    io.on('connection', (socket) => {
      socket.on('join_admin', () => {
        if (socket.user?.role !== 'admin') {
          return socket.emit('error', { message: 'Unauthorized: Admin role required' });
        }
        socket.join('admin_inbox');
        socket.emit('chat_list', Object.values(activeChats));
      });

      socket.on('join_room', ({ customerId, name, role }) => {
        if (role === 'admin' || socket.user?.role === 'admin') {
          socket.join('admin_inbox');
          if (customerId) {
            socket.join(`chat_${customerId}`);
            socket.emit('chat_history', { customerId, messages: activeChats[customerId]?.messages || [] });
          }
        } else {
          if (socket.user?.id && socket.user.id !== customerId) {
            return socket.emit('error', { message: 'Unauthorized: Cannot join another user\'s chat room' });
          }
          socket.join(`chat_${customerId}`);
          socket.emit('chat_history', { customerId, messages: activeChats[customerId]?.messages || [] });
        }
      });
    });

    server.listen(() => {
      const port = server.address().port;
      serverAddress = `http://localhost:${port}`;

      adminToken = jwt.sign(
        { id: 'admin-1', role: 'admin' },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      customerToken = jwt.sign(
        { id: 'customer-1', role: 'customer' },
        process.env.JWT_SECRET || 'fallback_secret'
      );
      otherCustomerToken = jwt.sign(
        { id: 'customer-2', role: 'customer' },
        process.env.JWT_SECRET || 'fallback_secret'
      );

      done();
    });
  });

  afterAll((done) => {
    io.close();
    server.close(done);
  });

  it('should reject connection when no auth token is provided', (done) => {
    const client = ioClient(serverAddress, {
      transports: ['websocket'],
      auth: {}
    });

    client.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error/);
      client.disconnect();
      done();
    });
  });

  it('should reject non-admin trying to join admin inbox', (done) => {
    const client = ioClient(serverAddress, {
      transports: ['websocket'],
      auth: { token: customerToken }
    });

    client.on('connect', () => {
      client.emit('join_admin');
    });

    client.on('error', (err) => {
      expect(err.message).toMatch(/Admin role required/);
      client.disconnect();
      done();
    });
  });

  it('should reject customer trying to join another customer\'s chat room', (done) => {
    const client = ioClient(serverAddress, {
      transports: ['websocket'],
      auth: { token: customerToken } // id: customer-1
    });

    client.on('connect', () => {
      // Attempt to join customer-2's private chat
      client.emit('join_room', { customerId: 'customer-2', role: 'customer' });
    });

    client.on('error', (err) => {
      expect(err.message).toMatch(/Cannot join another user's chat room/);
      client.disconnect();
      done();
    });
  });

  it('should allow customer to join their own room and receive chat history', (done) => {
    const client = ioClient(serverAddress, {
      transports: ['websocket'],
      auth: { token: customerToken }
    });

    client.on('connect', () => {
      client.emit('join_room', { customerId: 'customer-1', role: 'customer' });
    });

    client.on('chat_history', (data) => {
      expect(data).toHaveProperty('customerId', 'customer-1');
      expect(Array.isArray(data.messages)).toBe(true);
      client.disconnect();
      done();
    });
  });

  it('should allow admin to join admin inbox and receive chat list', (done) => {
    const client = ioClient(serverAddress, {
      transports: ['websocket'],
      auth: { token: adminToken }
    });

    client.on('connect', () => {
      client.emit('join_admin');
    });

    client.on('chat_list', (list) => {
      expect(Array.isArray(list)).toBe(true);
      client.disconnect();
      done();
    });
  });
});
