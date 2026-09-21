const { syncDatabase, sequelize } = require('./src/models');

(async () => {
  console.log("Forcing database sync to recreate tables cleanly...");
  await sequelize.sync({ force: true });
  console.log("Database reset complete.");
  process.exit(0);
})();
