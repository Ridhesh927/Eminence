const http = require('http');
const app = require('./app');
const { syncDatabase } = require('./models');
const { Server } = require('socket.io');
const process = require('node:process');
const { handleSupportMessage } = require('./services/supportBotService');

const http = require('http');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronJobs');

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store active chat messages in memory
// Structure: { customerId: { customerId, customerName, messages: [{ sender: 'customer'|'admin', text, time, name }] } }
const activeChats = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Join a room for a specific customer chat
  socket.on('join_room', ({ customerId, name, role }) => {
    socket.join(customerId);
    console.log(`User ${name} (${role}) joined room: ${customerId}`);
    
    if (role === 'customer') {
      if (!activeChats[customerId]) {
        activeChats[customerId] = {
          customerId,
          customerName: name || 'Customer',
          messages: []
        };
      }
      // Broadcast updated chat list to all admins
      io.emit('chat_list_update', Object.values(activeChats));
    } else if (role === 'admin') {
      // Send existing messages to admin when joining
      socket.emit('chat_history', activeChats[customerId]?.messages || []);
    }
  });

  // Handle sending message
  socket.on('send_message', ({ customerId, sender, text, name }) => {
    const message = {
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
    
    // Broadcast message to the specific room
    io.to(customerId).emit('receive_message', message);
    
    // Broadcast updated chat list to all admins
    io.emit('chat_list_update', Object.values(activeChats));

    // Send bot response after a brief delay if message is from the customer
    if (sender === 'customer') {
      setTimeout(async () => {
        try {
          const botResponseText = await handleSupportMessage(customerId, text);
          const botMessage = {
            sender: 'support_bot',
            text: botResponseText,
            name: 'Support Bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          
          if (activeChats[customerId]) {
            activeChats[customerId].messages.push(botMessage);
          }
          
          io.to(customerId).emit('receive_message', botMessage);
          io.emit('chat_list_update', Object.values(activeChats));
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
<<<<<<< HEAD
=======
  const server = http.createServer(app);
  initSocket(server);
  initCronJobs();
  
>>>>>>> dd2921aa53649c5bee49cc42dece61627f6f1c0b
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
