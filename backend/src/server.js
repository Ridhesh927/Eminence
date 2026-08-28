const app = require('./app');
const { syncDatabase } = require('./models');
const process = require('node:process');

const http = require('http');
const { initSocket } = require('./socket');
const { initCronJobs } = require('./cronJobs');

const PORT = process.env.PORT || 3000;

syncDatabase().then(() => {
  const server = http.createServer(app);
  initSocket(server);
  initCronJobs();
  
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
});
// Trigger nodemon restart
