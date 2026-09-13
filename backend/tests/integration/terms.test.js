const request = require('supertest');
const app = require('../../src/app');
const jwt = require('jsonwebtoken');
const { Customer, Driver, UserConsent, syncDatabase } = require('../../src/models');

describe('Terms and Conditions Integration Tests', () => {
  let customer;
  let driver;
  let customerToken;
  let driverToken;

  beforeAll(async () => {
    await syncDatabase();

    customer = await Customer.create({
      name: 'Terms Test Customer',
      phone: '9876543210',
      email: 'terms.customer@test.com',
      termsAccepted: false
    });

    driver = await Driver.create({
      name: 'Terms Test Driver',
      phone: '9876543211',
      licenseNumber: 'DL-TERMS-TEST',
      termsAccepted: false
    });

    customerToken = jwt.sign(
      { id: customer.id, role: 'customer' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );

    driverToken = jwt.sign(
      { id: driver.id, role: 'driver' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1h' }
    );
  }, 30000);

  afterAll(async () => {
    if (customer) {
      await UserConsent.destroy({ where: { userId: customer.id } });
      await Customer.destroy({ where: { id: customer.id } });
    }
    if (driver) {
      await UserConsent.destroy({ where: { userId: driver.id } });
      await Driver.destroy({ where: { id: driver.id } });
    }
  });

  describe('GET /api/auth/terms', () => {
    it('should return platform terms and conditions with sections and version', async () => {
      const res = await request(app).get('/api/auth/terms');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.terms).toBeDefined();
      expect(res.body.terms.version).toBe('v1.0');
      expect(res.body.terms.sections).toBeInstanceOf(Array);
      expect(res.body.terms.sections.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('POST /api/auth/accept-terms', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/auth/accept-terms')
        .send({ version: 'v1.0' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should record user consent and update customer termsAccepted', async () => {
      const res = await request(app)
        .post('/api/auth/accept-terms')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ version: 'v1.0' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.consent).toBeDefined();
      expect(res.body.consent.termsVersion).toBe('v1.0');

      const updatedCustomer = await Customer.findByPk(customer.id);
      expect(updatedCustomer.termsAccepted).toBe(true);
      expect(updatedCustomer.termsVersion).toBe('v1.0');

      const consentRecord = await UserConsent.findOne({ where: { userId: customer.id, userType: 'customer' } });
      expect(consentRecord).not.toBeNull();
      expect(consentRecord.accepted).toBe(true);
    });

    it('should record consent for driver accounts', async () => {
      const res = await request(app)
        .post('/api/auth/accept-terms')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ version: 'v1.0' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedDriver = await Driver.findByPk(driver.id);
      expect(updatedDriver.termsAccepted).toBe(true);
    });
  });

  describe('POST /api/auth/phone-verify with acceptedTerms', () => {
    it('should record acceptance during demo login verification', async () => {
      const res = await request(app)
        .post('/api/auth/phone-verify')
        .send({
          phone: '1234567890',
          code: '123456',
          role: 'customer',
          acceptedTerms: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });
});
