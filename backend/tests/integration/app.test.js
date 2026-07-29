const request = require('supertest');
const app = require('../../src/app');

describe('App Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return 200 and success message', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'EMINENCE API is running');
    });
  });
});
