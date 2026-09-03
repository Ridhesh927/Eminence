/**
 * Audit Logger Middleware
 * Automatically records all admin/driver state-changing actions
 * (POST, PUT, PATCH, DELETE) to the AuditLog table.
 */
const AuditLog = require('../models/AuditLog');

const auditLogger = (resourceType) => async (req, res, next) => {
  // Only log state-changing methods
  const loggableMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (!loggableMethods.includes(req.method)) {
    return next();
  }

  const originalJson = res.json.bind(res);
  
  res.json = async (body) => {
    // Only log successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      try {
        const user = req.user || {};
        const action = `${req.method}_${resourceType || req.path.replace(/\//g, '_').toUpperCase()}`.replace(/^_/, '');
        
        await AuditLog.create({
          action,
          performedBy: user.id || user.email || 'ANONYMOUS',
          performedByRole: user.role || 'unknown',
          resourceType,
          resourceId: req.params.id || (body && body.id) || null,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
          metadata: {
            path: req.path,
            body: req.body
          }
        });
      } catch (err) {
        // Never let audit logging break the main request
        console.error('[AuditLog] Failed to log action:', err.message);
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = auditLogger;
