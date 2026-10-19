const http = require('http');
const app = require('./app');
const validateEnv = require('./config/validateEnv');
validateEnv();
const { syncDatabase } = require('./models');
const process = require('node:process');
const { handleSupportMessage } = require('./services/supportBotService');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronJobs');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = initSocket(server);
app.set('io', io);

// Attach PeerJS Signaling Server for WebRTC Voice Calls
const { ExpressPeerServer } = require('peer');
const { WebSocketServer } = require('ws');
let peerWss;
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: '/',
  createWebSocketServer: (options) => {
    peerWss = new WebSocketServer({ ...options, server: undefined, noServer: true });
    return peerWss;
  }
});
app.use('/peerjs', peerServer);

server.on('upgrade', (req, socket, head) => {
  if (req.url && req.url.startsWith('/peerjs') && peerWss) {
    peerWss.handleUpgrade(req, socket, head, (ws) => {
      peerWss.emit('connection', ws, req);
    });
  }
});

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sanitizeChatMessage, sanitizeString } = require('./middleware/requestValidator');

const { SupportChat, SupportTicket } = require('./models');
const { getAllSupportItems } = require('./controllers/supportController');

// Chat message rate limiting tracker per socket (prevents spam and DoS)
const socketMessageTimestamps = new Map();
const socketSosTimestamps = new Map();
setInterval(() => {
  const cutoff = Date.now() - 30000;
  for (const [socketId, timestamps] of socketMessageTimestamps.entries()) {
    const valid = timestamps.filter(t => t > cutoff);
    if (valid.length === 0) {
      socketMessageTimestamps.delete(socketId);
    } else {
      socketMessageTimestamps.set(socketId, valid);
    }
  }
  for (const [socketId, timestamps] of socketSosTimestamps.entries()) {
    const recent = timestamps.filter((timestamp) => Date.now() - timestamp < 60 * 1000);
    if (recent.length === 0) socketSosTimestamps.delete(socketId);
    else socketSosTimestamps.set(socketId, recent);
  }
}, 30000).unref();

const cookie = require('cookie');

// Socket.io JWT Authentication Middleware
io.use((socket, next) => {
  if (socket.user) return next();
  const cookies = socket.handshake.headers.cookie ? cookie.parse(socket.handshake.headers.cookie) : {};
  const token = cookies.accessToken || socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
  
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
  console.log('Socket connected:', socket.id, 'User:', socket.user?.id, 'Role:', socket.user?.role);
  if (socket.user?.id) {
    socket.join(`user_${socket.user.id}`);
  }
  if (socket.user?.role === 'admin') {
    socket.join('admin_notifications');
    socket.join('admin_inbox');
  }

  // Admin joins the global admin inbox channel
  socket.on('join_admin', async () => {
    if (socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Admin role required' });
    }
    socket.join('admin_inbox');
    try {
      const allItems = await getAllSupportItems();
      socket.emit('chat_list', allItems);
    } catch (err) {
      console.error('Failed to fetch chat list:', err);
    }
  });

  // Admin selects a customer conversation thread or ticket
  socket.on('admin_select_chat', async ({ customerId, previousCustomerId }) => {
    if (socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Admin role required' });
    }
    if (previousCustomerId) {
      socket.leave(`chat_${previousCustomerId}`);
      socket.leave(`ticket_${previousCustomerId}`);
    }
    if (customerId) {
      socket.join(`chat_${customerId}`);
      socket.join(`ticket_${customerId}`);
      try {
        let chat = await SupportTicket.findByPk(customerId);
        if (!chat) {
          chat = await SupportChat.findByPk(customerId);
        }
        socket.emit('chat_history', { customerId, messages: chat ? (chat.messages || []) : [] });
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    }
  });

  // Join a room for a customer chat or ticket
  socket.on('join_room', async ({ customerId, name }) => {
    if (socket.user?.role === 'admin') {
      socket.join('admin_inbox');
      if (customerId) {
        socket.join(`chat_${customerId}`);
        socket.join(`ticket_${customerId}`);
        try {
          let chat = await SupportTicket.findByPk(customerId);
          if (!chat) {
            chat = await SupportChat.findByPk(customerId);
          }
          socket.emit('chat_history', { customerId, messages: chat ? (chat.messages || []) : [] });
        } catch (err) {}
      }
    } else {
      // Restrict customers to only their own chat room
      if (socket.user?.id && socket.user.id !== 'dev-user' && socket.user.id !== customerId) {
        return socket.emit('error', { message: 'Unauthorized: Cannot join another user\'s chat room' });
      }

      socket.join(`chat_${customerId}`);
      socket.join(`ticket_${customerId}`);
      try {
        let chat = await SupportTicket.findByPk(customerId);
        if (!chat) {
          chat = await SupportChat.findByPk(customerId);
        }
        if (!chat) {
          chat = await SupportChat.create({
            customerId,
            customerName: name || 'Customer',
            messages: []
          });
        }
        // Send chat history to customer
        socket.emit('chat_history', { customerId, messages: chat.messages || [] });
        // Notify admins of updated active items list
        const allItems = await getAllSupportItems();
        io.to('admin_inbox').emit('chat_list_update', allItems);
      } catch (err) {
        console.error('Error joining room:', err);
      }
    }
  });

  // Handle sending a message with explicit room scoping, rate limiting, and sanitization
  socket.on('send_message', async ({ customerId, sender, text, name }) => {
    if (!customerId || !text) return;

    // Rate limiting: max 5 messages per 3 seconds per socket to prevent spam/DoS
    const now = Date.now();
    const timestamps = socketMessageTimestamps.get(socket.id) || [];
    const recentTimestamps = timestamps.filter(t => now - t < 3000);
    if (recentTimestamps.length >= 5) {
      return socket.emit('error', { message: 'Rate limit exceeded: Please wait a moment before sending more messages' });
    }
    recentTimestamps.push(now);
    socketMessageTimestamps.set(socket.id, recentTimestamps);

    // Verify sender identity against authenticated socket user
    if (sender === 'admin' && socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Cannot send as admin' });
    }
    if (sender === 'customer' && socket.user?.role !== 'admin' && socket.user?.id && socket.user.id !== 'dev-user' && socket.user.id !== customerId) {
      return socket.emit('error', { message: 'Unauthorized: Cannot send on behalf of another user' });
    }

    // Sanitize message content to prevent stored XSS
    const cleanText = sanitizeChatMessage(text);
    if (!cleanText) return;

    const message = {
      id: crypto.randomUUID(),
      customerId,
      sender,
      text: cleanText,
      name: sanitizeString(name) || (sender === 'admin' ? 'Admin' : 'Customer'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    try {
      let ticket = await SupportTicket.findByPk(customerId);
      if (ticket) {
        const updatedMessages = [...(ticket.messages || []), message];
        await ticket.update({ messages: updatedMessages });
        io.to(`chat_${customerId}`).emit('receive_message', message);
        io.to(`ticket_${customerId}`).emit('receive_message', message);
        const allItems = await getAllSupportItems();
        io.to('admin_inbox').emit('chat_list_update', allItems);
      } else {
        let chat = await SupportChat.findByPk(customerId);
        if (!chat) {
          chat = await SupportChat.create({
            customerId,
            customerName: sender === 'customer' ? (sanitizeString(name) || 'Customer') : 'Customer',
            messages: []
          });
        }
        const updatedMessages = [...(chat.messages || []), message];
        await chat.update({ messages: updatedMessages });
        io.to(`chat_${customerId}`).emit('receive_message', message);
        const allItems = await getAllSupportItems();
        io.to('admin_inbox').emit('chat_list_update', allItems);
      }

      if (sender === 'customer') {
        const { createAndEmitNotification } = require('./services/notificationService');
        createAndEmitNotification({
          recipientRole: 'admin',
          title: `Support Chat: ${message.name}`,
          message: `${cleanText.slice(0, 80)}${cleanText.length > 80 ? '...' : ''}`,
          type: 'support',
          metadata: { customerId }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }

    // Automated bot reply only if message originated from customer and not a ticket
    if (sender === 'customer') {
      setTimeout(async () => {
        try {
          const isTicket = await SupportTicket.findByPk(customerId);
          if (isTicket) return; // Don't auto-bot reply to official support tickets

          const botResponseText = await handleSupportMessage(customerId, cleanText);
          const botMessage = {
            id: crypto.randomUUID(),
            customerId,
            sender: 'support_bot',
            text: botResponseText,
            name: 'Support Bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          let chatToUpdate = await SupportChat.findByPk(customerId);
          if (chatToUpdate) {
            const botUpdatedMsgs = [...(chatToUpdate.messages || []), botMessage];
            await chatToUpdate.update({ messages: botUpdatedMsgs });
          }
          
          io.to(`chat_${customerId}`).emit('receive_message', botMessage);
          const currentChats = await getAllSupportItems();
          io.to('admin_inbox').emit('chat_list_update', currentChats);
        } catch (error) {
          console.error('Error in support bot response:', error);
        }
      }, 1000);
    }
  });

  // Driver SOS Emergency Alert socket handler
  socket.on('driver_sos', async (sosData) => {
    try {
      if (!socket.user || (socket.user.role !== 'driver' && socket.user.role !== 'admin')) {
        return socket.emit('error', { message: 'Unauthorized: Driver account required for driver SOS alert' });
      }
      const now = Date.now();
      const recentSos = (socketSosTimestamps.get(socket.id) || []).filter((timestamp) => now - timestamp < 60 * 1000);
      const maxSosPerMinute = Number.parseInt(process.env.SOCKET_SOS_MAX_PER_MINUTE || '3', 10);
      if (recentSos.length >= (Number.isInteger(maxSosPerMinute) && maxSosPerMinute > 0 ? maxSosPerMinute : 3)) {
        return socket.emit('error', { message: 'SOS rate limit exceeded' });
      }
      recentSos.push(now);
      socketSosTimestamps.set(socket.id, recentSos);
      const { triggerDriverSos } = require('./controllers/supportController');
      const reqUser = socket.user.role === 'driver' ? socket.user : { id: sosData?.driverId || socket.user.id, role: 'driver', name: sosData?.driverName };
      const fakeReq = {
        user: reqUser,
        body: sosData,
        app
      };
      let resultTicket = null;
      const fakeRes = {
        status: () => ({
          json: (data) => { resultTicket = data?.ticket; }
        })
      };
      await triggerDriverSos(fakeReq, fakeRes);
      socket.emit('driver_sos_confirmed', { success: true, ticket: resultTicket });
    } catch (sosErr) {
      console.error('Error handling driver_sos socket:', sosErr);
      socket.emit('error', { message: 'Failed to process driver SOS alert' });
    }
  });

  // Admin fetch active chats and tickets list
  socket.on('get_chat_list', async () => {
    if (socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Admin role required' });
    }
    try {
      const allItems = await getAllSupportItems();
      socket.emit('chat_list', allItems);
    } catch (err) {
      console.error('Error getting chat list:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    socketMessageTimestamps.delete(socket.id);
    socketSosTimestamps.delete(socket.id);
  });
});

syncDatabase().then(() => {
  initCronJobs();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
