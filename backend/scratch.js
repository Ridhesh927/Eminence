const { Customer, Otp, syncDatabase } = require('./src/models');
const sequelize = require('./src/config/database');

(async () => {
  try {
    await syncDatabase();
    
    await Customer.destroy({ where: { phone: '9876543210' } });
    const testCustomer = await Customer.create({ phone: '9876543210' });
    
    console.log("Customer created:", testCustomer.id);
    
    await Otp.create({
      customerId: testCustomer.id,
      type: 'phone',
      code: '1234',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    
    console.log("OTP created successfully!");
  } catch (err) {
    console.error("FAILED!", err);
  } finally {
    await sequelize.close();
  }
})();
