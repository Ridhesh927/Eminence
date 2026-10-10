const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/models');
const { Customer } = require('../../src/models');
const bcrypt = require('bcryptjs');

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // Seed a test user
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('SecurePass123!', salt);
    
    await Customer.create({
      name: 'johndoe',
      email: 'john@example.com',
      phone: '9876543210',
      password: hashedPassword,
      isBusiness: false
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /api/auth/login', () => {
    it('should login using email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'john@example.com',
          password: 'SecurePass123!',
          role: 'customer'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should login using phone number', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: '9876543210',
          password: 'SecurePass123!',
          role: 'customer'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should login using username', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'johndoe',
          password: 'SecurePass123!',
          role: 'customer'
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it('should fail with invalid identifier', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'wronguser',
          password: 'SecurePass123!',
          role: 'customer'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          identifier: 'johndoe',
          password: 'WrongPassword!',
          role: 'customer'
        });
      
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
