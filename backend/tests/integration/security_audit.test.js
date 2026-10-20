const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Admin, Driver, Booking, Customer, syncDatabase } = require('../../src/models');
const validateEnv = require('../../src/config/validateEnv');

describe('Security Audit & Hardening Verification Suite', () => {
  let superadminToken;
  let driver1Token;
  let driver2Token;
  let customerToken;
  let driver1Id;
  let driver2Id;
  let secondaryAdminId;

  beforeAll(async () => {
    await syncDatabase();

    const jwtSecret = process.env.JWT_SECRET || 'eminence_security_audit_test_secret_key_32_chars!';
    process.env.JWT_SECRET = jwtSecret;

    // 1. Seed or find Superadmin
    const hashedPassword = await bcrypt.hash('AdminSecurePass123!', 10);
    const [adminUser] = await Admin.findOrCreate({
      where: { email: 'superadmin.audit@eminence.com' },
      defaults: {
        name: 'Super Admin Audit',
        password: hashedPassword,
        role: 'Superadmin',
        isPrimary: true
      }
    });

    // Create a secondary admin with a unique secret password
    const secondaryHash = await bcrypt.hash('CustomAdminSecret987!', 10);
    const [secondaryAdmin] = await Admin.findOrCreate({
      where: { email: 'secondary.admin@eminence.com' },
      defaults: {
        name: 'Secondary Admin',
        password: secondaryHash,
        role: 'Support Admin',
        isPrimary: false
      }
    });
    secondaryAdminId = secondaryAdmin.id;

    // 2. Create two test drivers
    const driverPassHash = await bcrypt.hash('DriverSecretPass123!', 10);
    const [d1] = await Driver.findOrCreate({
      where: { phone: '9822990001' },
      defaults: {
        name: 'Audit Driver One',
        licenseNumber: 'MH12-AUDIT-001',
        email: 'audit.driver1@eminence.com',
        password: driverPassHash,
        status: 'active'
      }
    });
    driver1Id = d1.id;

    const [d2] = await Driver.findOrCreate({
      where: { phone: '9822990002' },
      defaults: {
        name: 'Audit Driver Two',
        licenseNumber: 'MH12-AUDIT-002',
        email: 'audit.driver2@eminence.com',
        password: driverPassHash,
        status: 'active'
      }
    });
    driver2Id = d2.id;

    // 3. Create a test customer
    const [cust] = await Customer.findOrCreate({
      where: { phone: '9822990003' },
      defaults: {
        name: 'Audit Customer',
        email: 'audit.customer@eminence.com'
      }
    });

    superadminToken = jwt.sign(
      { id: adminUser.id, role: 'admin', adminRole: 'Superadmin', isPrimary: true },
      jwtSecret,
      { expiresIn: '1h' }
    );

    driver1Token = jwt.sign(
      { id: driver1Id, role: 'driver' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    driver2Token = jwt.sign(
      { id: driver2Id, role: 'driver' },
      jwtSecret,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { id: cust.id, role: 'customer' },
      jwtSecret,
      { expiresIn: '1h' }
    );
  }, 30000);

  describe('1. Admin Authentication Hardening', () => {
    it('must reject backdoor default passwords for secondary admins', async () => {
      // Attempting to log into secondary admin using former backdoor password 'adminpassword123'
      const res1 = await request(app)
        .post('/api/admin/login')
        .send({ email: 'secondary.admin@eminence.com', password: 'adminpassword123' });
      expect(res1.status).toBe(401);
      expect(res1.body.success).toBe(false);

      // Attempting with 'password123'
      const res2 = await request(app)
        .post('/api/admin/login')
        .send({ email: 'secondary.admin@eminence.com', password: 'password123' });
      expect(res2.status).toBe(401);
      expect(res2.body.success).toBe(false);

      // Must succeed with the real password
      const res3 = await request(app)
        .post('/api/admin/login')
        .send({ email: 'secondary.admin@eminence.com', password: 'CustomAdminSecret987!' });
      expect(res3.status).toBe(200);
      expect(res3.body.success).toBe(true);
    });
  });

  describe('2. Object-Level Authorization (IDOR) on Payslip Download', () => {
    it('must forbid Driver 1 from downloading Driver 2 payslip PDF (403)', async () => {
      const res = await request(app)
        .get(`/api/drivers/${driver2Id}/payslip/download`)
        .set('Authorization', `Bearer ${driver1Token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Unauthorized access/i);
    });

    it('must allow Driver 1 to download their own payslip PDF (200)', async () => {
      const res = await request(app)
        .get(`/api/drivers/${driver1Id}/payslip/download`)
        .set('Authorization', `Bearer ${driver1Token}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });

    it('must allow Superadmin to download any driver payslip PDF (200)', async () => {
      const res = await request(app)
        .get(`/api/drivers/${driver1Id}/payslip/download`)
        .set('Authorization', `Bearer ${superadminToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
    });
  });

  describe('3. Vehicle Cargo Capacity Enforcement', () => {
    it('must reject booking if weight exceeds small tempo capacity (750kg)', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupAddress: 'Shivajinagar, Pune',
          dropAddress: 'Kothrud, Pune',
          tempoType: 'small',
          weight: 1200, // 1200kg exceeds 750kg small capacity
          goodsType: 'Electronics',
          estimatedFare: 450,
          date: '2026-10-25',
          time: '14:00',
          paymentMethod: 'cash'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/exceeds maximum capacity/i);
    });

    it('must accept booking within valid vehicle weight capacity', async () => {
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          pickupAddress: 'Shivajinagar, Pune',
          dropAddress: 'Kothrud, Pune',
          tempoType: 'medium',
          weight: 1200, // 1200kg fits within 1500kg medium capacity
          goodsType: 'Machinery Parts',
          estimatedFare: 650,
          date: '2026-10-25',
          time: '14:00',
          paymentMethod: 'cash'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking).toBeDefined();
    });
  });

  describe('4. Production Environment Validation Helper', () => {
    const origEnv = process.env.NODE_ENV;
    const origDb = process.env.DATABASE_URL;
    const origJwt = process.env.JWT_SECRET;
    const origCors = process.env.CORS_ORIGIN;

    afterEach(() => {
      process.env.NODE_ENV = origEnv;
      process.env.DATABASE_URL = origDb;
      process.env.JWT_SECRET = origJwt;
      process.env.CORS_ORIGIN = origCors;
    });

    it('must throw in production if DATABASE_URL is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.DATABASE_URL;
      process.env.JWT_SECRET = 'a_very_secure_long_random_jwt_secret_32_chars';
      process.env.CORS_ORIGIN = 'https://app.example.com';

      expect(() => validateEnv()).toThrow(/Production environment validation failed/);
    });

    it('must throw in production if JWT_SECRET is an insecure placeholder', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-xyz.neon.tech/eminence_db';
      process.env.JWT_SECRET = 'your_super_secret_jwt_key_here';
      process.env.CORS_ORIGIN = 'https://app.example.com';

      expect(() => validateEnv()).toThrow(/Production environment validation failed/);
    });

    it('must pass in production with valid PostgreSQL URI and strong secret', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-xyz.neon.tech/eminence_db';
      process.env.JWT_SECRET = 'a_very_secure_long_random_jwt_secret_32_chars';
      process.env.CORS_ORIGIN = 'https://app.example.com';
      process.env.RAZORPAY_KEY_ID = 'rzp_live_configured_for_test';
      process.env.RAZORPAY_KEY_SECRET = 'configured-payment-secret-for-test';

      expect(() => validateEnv()).not.toThrow();
    });

    it('must reject missing or loopback CORS origins in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = 'postgresql://user:pass@ep-xyz.neon.tech/eminence_db';
      process.env.JWT_SECRET = 'a_very_secure_long_random_jwt_secret_32_chars';
      delete process.env.CORS_ORIGIN;

      expect(() => validateEnv()).toThrow(/Production environment validation failed/);

      process.env.CORS_ORIGIN = 'http://localhost:5173';
      expect(() => validateEnv()).toThrow(/Production environment validation failed/);
    });
  });
});
