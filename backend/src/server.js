const http = require('http');
const app = require('./app');
const { syncDatabase } = require('./models');
const process = require('node:process');
const { handleSupportMessage } = require('./services/supportBotService');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronJobs');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = initSocket(server);

// Store active chat messages in memory
// Structure: { customerId: { customerId, customerName, messages: [{ sender: 'customer'|'admin', text, time, name }] } }
const activeChats = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Admin joins the global admin inbox channel
  socket.on('join_admin', () => {
    socket.join('admin_inbox');
    socket.emit('chat_list', Object.values(activeChats));
  });

  // Admin selects a customer conversation thread
  socket.on('admin_select_chat', ({ customerId, previousCustomerId }) => {
    if (previousCustomerId) {
      socket.leave(`chat_${previousCustomerId}`);
    }
    if (customerId) {
      socket.join(`chat_${customerId}`);
      const history = activeChats[customerId]?.messages || [];
      socket.emit('chat_history', { customerId, messages: history });
    }
  });

  // Join a room for a customer chat (supports customer or direct admin entry)
  socket.on('join_room', ({ customerId, name, role }) => {
    if (role === 'admin') {
      socket.join('admin_inbox');
      if (customerId) {
        socket.join(`chat_${customerId}`);
        socket.emit('chat_history', { customerId, messages: activeChats[customerId]?.messages || [] });
      }
    } else {
      socket.join(`chat_${customerId}`);
      if (!activeChats[customerId]) {
        activeChats[customerId] = {
          customerId,
          customerName: name || 'Customer',
          messages: []
        };
      }
      // Send chat history to customer
      socket.emit('chat_history', { customerId, messages: activeChats[customerId]?.messages || [] });
      // Notify admins of updated active chats list
      io.to('admin_inbox').emit('chat_list_update', Object.values(activeChats));
    }
  });

  // Handle sending a message with explicit room scoping
  socket.on('send_message', ({ customerId, sender, text, name }) => {
    if (!customerId || !text) return;

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      customerId,
      sender,
      text,
      name: name || (sender === 'admin' ? 'Admin' : 'Customer'),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    if (!activeChats[customerId]) {
      activeChats[customerId] = {
        customerId,
        customerName: sender === 'customer' ? (name || 'Customer') : 'Customer',
        messages: []
      };
    }
    
    activeChats[customerId].messages.push(message);
    
    // Broadcast message ONLY to the specific conversation room
    io.to(`chat_${customerId}`).emit('receive_message', message);
    
    // Broadcast updated chat list ONLY to admin inbox channel
    io.to('admin_inbox').emit('chat_list_update', Object.values(activeChats));

    // Automated bot reply only if message originated from customer
    if (sender === 'customer') {
      setTimeout(async () => {
        try {
          const botResponseText = await handleSupportMessage(customerId, text);
          const botMessage = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            customerId,
            sender: 'support_bot',
            text: botResponseText,
            name: 'Support Bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          if (activeChats[customerId]) {
            activeChats[customerId].messages.push(botMessage);
          }
          
          io.to(`chat_${customerId}`).emit('receive_message', botMessage);
          io.to('admin_inbox').emit('chat_list_update', Object.values(activeChats));
        } catch (error) {
          console.error('Error in support bot response:', error);
        }
      }, 1000); // 1 second delay
    }
  });

  // Admin fetch active chats list
  socket.on('get_chat_list', () => {
    socket.emit('chat_list', Object.values(activeChats));
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
  });
});

syncDatabase().then(() => {
  initCronJobs();
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
