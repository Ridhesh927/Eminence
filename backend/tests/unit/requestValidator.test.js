const {
  isValidEmail,
  sanitizeChatMessage,
  validateDriver,
  validateVehicle
} = require('../../src/middleware/requestValidator');

const runMiddleware = (middleware, body) => {
  const req = { body: { ...body } };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn()
  };
  const next = jest.fn();
  middleware(req, res, next);
  return { req, res, next };
};

describe('request validation and sanitization', () => {
  it('accepts valid email addresses and rejects malformed or oversized values', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
    expect(isValidEmail('person@example')).toBe(false);
    expect(isValidEmail('person@@example.com')).toBe(false);
    expect(isValidEmail(`${'a'.repeat(250)}@example.com`)).toBe(false);
  });

  it('sanitizes chat content and caps its length', () => {
    const sanitized = sanitizeChatMessage('<img src="x" onerror="alert(1)">hello');
    expect(sanitized).toContain('&lt;img');
    expect(sanitized).not.toContain('<img');
    expect(sanitizeChatMessage('x'.repeat(1200))).toHaveLength(1000);
  });

  it('rejects invalid driver payloads before reaching the controller', () => {
    const { res, next } = runMiddleware(validateDriver, {
      name: 'A',
      phone: '123',
      licenseNumber: 'x'
    });

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('sanitizes valid driver payloads before continuing', () => {
    const { req, next } = runMiddleware(validateDriver, {
      name: ' <b>Driver</b> ',
      phone: '9876543210',
      email: 'person@example.com',
      licenseNumber: ' MH12-1234 '
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.name).toBe('&lt;b&gt;Driver&lt;&#x2F;b&gt;');
    expect(req.body.licenseNumber).toBe('MH12-1234');
  });

  it('rejects unsupported vehicle types and non-positive capacity', () => {
    const invalidType = runMiddleware(validateVehicle, {
      registrationNumber: 'MH12AB1234',
      type: 'motorcycle'
    });
    const invalidCapacity = runMiddleware(validateVehicle, {
      registrationNumber: 'MH12AB1234',
      capacityWeight: 0
    });

    expect(invalidType.res.status).toHaveBeenCalledWith(400);
    expect(invalidCapacity.res.status).toHaveBeenCalledWith(400);
  });
});
