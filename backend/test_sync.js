require('./src/models/index.js').syncDatabase().then(() => console.log('Done')).catch(console.error);
