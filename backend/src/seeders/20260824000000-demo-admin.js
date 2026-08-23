const crypto = require('crypto');
const bcrypt = require('bcrypt');

module.exports = {
  up: async (queryInterface, _Sequelize) => {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('admin123', saltRounds);

    return queryInterface.bulkInsert('Admins', [{
      id: crypto.randomUUID(),
      name: 'Super Admin',
      email: 'admin@eminence.com',
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  down: (queryInterface, _Sequelize) => {
    return queryInterface.bulkDelete('Admins', null, {});
  }
};
