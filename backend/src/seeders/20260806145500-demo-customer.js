const crypto = require('crypto');

module.exports = {
  up: (queryInterface, _Sequelize) => {
    if (process.env.NODE_ENV === 'production') return Promise.resolve();
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

  down: (queryInterface, _Sequelize) => {
    if (process.env.NODE_ENV === 'production') return Promise.resolve();
    return queryInterface.bulkDelete('Customers', { email: 'demo@example.com' }, {});
  }
};
