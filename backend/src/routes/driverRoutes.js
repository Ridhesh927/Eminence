const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { getSurgeHeatmap } = require('../services/aiForecasting');
const protect = require('../middleware/authMiddleware');
const adminOnly = require('../middleware/adminMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Rate limit all driver endpoints
router.use(apiLimiter);

// Add heatmap route
router.get('/heatmap', (req, res) => {
  try {
    const data = getSurgeHeatmap();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching heatmap' });
  }
});

// Mock inventory scanning route for WMS
router.all('/scan-inventory', async (req, res) => {
  try {
    const barcode = req.body.barcode || req.query.barcode || 'MOCK-BOX-001';
    res.status(200).json({ 
      success: true, 
      message: 'Item scanned successfully',
      item: {
        barcode,
        itemName: 'Simulated Cargo Box',
        status: 'Loaded'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error scanning barcode' });
  }
});

router.get('/', driverController.getAllDrivers);
router.post('/', driverController.createDriver);
router.patch('/:id/toggle', driverController.toggleAvailability);
router.get('/:id/payslip', protect, driverController.generatePayslip);

module.exports = router;
