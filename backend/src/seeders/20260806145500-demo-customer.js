const crypto = require('crypto');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Customers', [{
      id: crypto.randomUUID(),
      name: 'Demo User',
      email: 'demo@example.com',
      phone: '1234567890',
      isEmailVerified: true,
      isPhoneVerified: true,
      isProfileComplete: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Customers', null, {});
  }
};
