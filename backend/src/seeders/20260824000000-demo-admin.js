const crypto = require('crypto');
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping demo admin seed in production environment.');
      return Promise.resolve();
    }

    const adminPassword = process.env.SEED_PASSWORD;
    const adminEmail = process.env.SEED_EMAIL || 'admin@eminence.com';

    if (!adminPassword) {
      throw new Error('SEED_PASSWORD environment variable is required to run the demo admin seeder.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    return queryInterface.bulkInsert('Admins', [{
      id: crypto.randomUUID(),
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, _Sequelize) => {
    if (process.env.NODE_ENV === 'production') {
      return Promise.resolve();
    }
    
    const adminEmail = process.env.SEED_EMAIL || 'admin@eminence.com';
    return queryInterface.bulkDelete('Admins', { email: adminEmail }, {});
  }
};
