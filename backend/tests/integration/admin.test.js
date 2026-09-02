const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const { Admin, Driver, Customer, Vehicle, syncDatabase } = require('../../src/models');
const bcrypt = require('bcrypt');

describe('Admin & Analytics Integration Tests', () => {
  let adminToken;
  let customerToken;

  beforeAll(async () => {
    await syncDatabase();

    // Ensure test admin exists
    const hashedPassword = await bcrypt.hash('adminpassword123', 10);
    const [adminUser] = await Admin.findOrCreate({
      where: { email: 'admin@eminence.com' },
      defaults: {
        name: 'Test Admin',
        password: hashedPassword
      }
    });

    // Create admin token
    adminToken = jwt.sign(
      { id: adminUser.id, role: 'admin' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    // Create a customer token for authorization testing
    customerToken = jwt.sign(
      { id: 'customer-123', role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
  });

  describe('POST /api/admin/login', () => {
    it('should authenticate admin with valid credentials', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin@eminence.com', password: 'adminpassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.role).toBe('admin');
    });

    it('should reject login with invalid password', async () => {
      const res = await request(app)
        .post('/api/admin/login')
        .send({ email: 'admin@eminence.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authorization checks for admin routes', () => {
    it('should reject requests without a token (401)', async () => {
      const res = await request(app).get('/api/admin/drivers');
      expect(res.status).toBe(401);
    });

    it('should reject requests from customer token (403)', async () => {
      const res = await request(app)
        .get('/api/admin/drivers')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Access denied/i);
    });
  });

  describe('Driver CRUD Endpoints', () => {
    it('should list drivers with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/admin/drivers?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.drivers)).toBe(true);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 5);
    });

    it('should create and delete a driver', async () => {
      const newDriver = {
        name: 'Test Driver',
        phone: '9998887776',
        licenseNumber: 'TEST-DL-999',
        status: 'active'
      };

      const createRes = await request(app)
        .post('/api/admin/drivers')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newDriver);

      expect(createRes.status).toBe(201);
      expect(createRes.body.success).toBe(true);
      expect(createRes.body.driver.name).toBe('Test Driver');

      const driverId = createRes.body.driver.id;

      const deleteRes = await request(app)
        .delete(`/api/admin/drivers/${driverId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
    });
  });

  describe('Analytics Endpoints', () => {
    it('should return overview stats with valid admin token', async () => {
      const res = await request(app)
        .get('/api/analytics/overview')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.stats).toHaveProperty('revenue');
      expect(res.body.stats).toHaveProperty('activeDrivers');
      expect(res.body.stats).toHaveProperty('totalVehicles');
      expect(res.body.stats).toHaveProperty('totalCustomers');
    });

    it('should return revenue analytics data', async () => {
      const res = await request(app)
        .get('/api/analytics/revenue')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.revenueData)).toBe(true);
    });

    it('should return popular route analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/routes')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.routeData)).toBe(true);
    });
  });
});
