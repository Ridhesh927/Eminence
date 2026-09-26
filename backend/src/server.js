const http = require('http');
const app = require('./app');
const { syncDatabase } = require('./models');
const process = require('node:process');
const { handleSupportMessage } = require('./services/supportBotService');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronJobs');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = initSocket(server);

const jwt = require('jsonwebtoken');
const { sanitizeChatMessage, sanitizeString } = require('./middleware/requestValidator');

const { SupportChat } = require('./models');

// Chat message rate limiting tracker per socket (prevents spam and DoS)
const socketMessageTimestamps = new Map();

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
  console.log('Socket connected:', socket.id, 'User:', socket.user?.id, 'Role:', socket.user?.role);

  // Admin joins the global admin inbox channel
  socket.on('join_admin', async () => {
    if (socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Admin role required' });
    }
    socket.join('admin_inbox');
    try {
      const allChats = await SupportChat.findAll();
      socket.emit('chat_list', allChats);
    } catch (err) {
      console.error('Failed to fetch chat list:', err);
    }
  });

  // Admin selects a customer conversation thread
  socket.on('admin_select_chat', async ({ customerId, previousCustomerId }) => {
    if (socket.user?.role !== 'admin') {
      return socket.emit('error', { message: 'Unauthorized: Admin role required' });
    }
    if (previousCustomerId) {
      socket.leave(`chat_${previousCustomerId}`);
    }
    if (customerId) {
      socket.join(`chat_${customerId}`);
      try {
        const chat = await SupportChat.findByPk(customerId);
        socket.emit('chat_history', { customerId, messages: chat ? chat.messages : [] });
      } catch (err) {
        console.error('Error fetching history:', err);
      }
    }
  });

  // Join a room for a customer chat (enforce room ownership or admin role)
  socket.on('join_room', async ({ customerId, name, role }) => {
    if (role === 'admin' || socket.user?.role === 'admin') {
      socket.join('admin_inbox');
      if (customerId) {
        socket.join(`chat_${customerId}`);
        try {
          const chat = await SupportChat.findByPk(customerId);
          socket.emit('chat_history', { customerId, messages: chat ? chat.messages : [] });
        } catch (err) {}
      }
    } else {
      // Restrict customers to only their own chat room
      if (socket.user?.id && socket.user.id !== 'dev-user' && socket.user.id !== customerId) {
        return socket.emit('error', { message: 'Unauthorized: Cannot join another user\'s chat room' });
      }

      socket.join(`chat_${customerId}`);
      try {
        let chat = await SupportChat.findByPk(customerId);
        if (!chat) {
          chat = await SupportChat.create({
            customerId,
            customerName: name || 'Customer',
            messages: []
          });
        }
        // Send chat history to customer
        socket.emit('chat_history', { customerId, messages: chat.messages || [] });
        // Notify admins of updated active chats list
        const allChats = await SupportChat.findAll();
        io.to('admin_inbox').emit('chat_list_update', allChats);
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
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customerId,
      sender,
      text: cleanText,
      name: sanitizeString(name) || (sender === 'admin' ? 'Admin' : 'Customer'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    try {
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
      
      // Broadcast message ONLY to the specific conversation room
      io.to(`chat_${customerId}`).emit('receive_message', message);
      
      // Broadcast updated chat list ONLY to admin inbox channel
      const allChats = await SupportChat.findAll();
      io.to('admin_inbox').emit('chat_list_update', allChats);
    } catch (err) {
      console.error('Error saving message:', err);
    }

    // Automated bot reply only if message originated from customer
    if (sender === 'customer') {
      setTimeout(async () => {
        try {
          const botResponseText = await handleSupportMessage(customerId, cleanText);
          const botMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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
          const currentChats = await SupportChat.findAll();
          io.to('admin_inbox').emit('chat_list_update', currentChats);
        } catch (error) {
          console.error('Error in support bot response:', error);
        }
      }, 1000); // 1 second delay
    }
  });

  // Admin fetch active chats list
  socket.on('get_chat_list', async () => {
    try {
      const allChats = await SupportChat.findAll();
      socket.emit('chat_list', allChats);
    } catch (err) {
      console.error('Error getting chat list:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    socketMessageTimestamps.delete(socket.id);
  });
});

syncDatabase().then(() => {
  initCronJobs();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
