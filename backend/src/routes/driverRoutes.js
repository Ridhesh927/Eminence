const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { getSurgeHeatmap } = require('../services/aiForecasting');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter } = require('../middleware/rateLimiter');

// Rate limit all driver endpoints
router.use(apiLimiter);

// Add heatmap route (protected for driver or admin)
router.get('/heatmap', protect, authorize('driver', 'admin'), (req, res) => {
  try {
    const data = getSurgeHeatmap();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching heatmap' });
  }
});

// Mock inventory scanning route for WMS (protected)
router.all('/scan-inventory', protect, authorize('driver', 'admin'), async (req, res) => {
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

router.get('/', protect, authorize('driver', 'admin'), driverController.getAllDrivers);
router.post('/', protect, authorize('admin'), driverController.createDriver);
router.patch('/:id/toggle', protect, authorize('driver', 'admin'), driverController.toggleAvailability);
router.get('/:id/payslip', protect, authorize('driver', 'admin'), driverController.generatePayslip);

module.exports = router;
