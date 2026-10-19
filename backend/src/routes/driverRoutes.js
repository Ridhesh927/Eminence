const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');
const { getSurgeHeatmap } = require('../services/aiForecasting');
const protect = require('../middleware/authMiddleware');
const authorize = require('../middleware/roleMiddleware');
const { apiLimiter, locationTrackingLimiter } = require('../middleware/rateLimiter');

// Add heatmap route (protected for driver or admin)
router.get('/heatmap', apiLimiter, protect, authorize('driver', 'admin'), (req, res) => {
  try {
    const data = getSurgeHeatmap();
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error fetching heatmap' });
  }
});

const { Inventory } = require('../models');

// Inventory scanning route for WMS (protected)
router.all('/scan-inventory', apiLimiter, protect, authorize('driver', 'admin'), async (req, res) => {
  try {
    const barcode = req.body.barcode || req.query.barcode;

    if (!barcode && process.env.NODE_ENV === 'production') {
      return res.status(400).json({
        success: false,
        message: 'Barcode parameter is required'
      });
    }

    if (barcode) {
      const realItem = await Inventory.findOne({ where: { barcode } });
      if (realItem) {
        realItem.status = 'Loaded';
        await realItem.save();
        return res.status(200).json({
          success: true,
          message: 'Item scanned and marked Loaded successfully',
          item: realItem
        });
      }
    }

    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({
        success: false,
        message: 'Inventory item not found for the provided barcode. Mock scanning is disabled in production.'
      });
    }

    // Development/test mock fallback
    const fallbackBarcode = barcode || 'MOCK-BOX-001';
    res.status(200).json({ 
      success: true, 
      message: 'Item scanned successfully (mock mode)',
      item: {
        barcode: fallbackBarcode,
        itemName: 'Simulated Cargo Box',
        status: 'Loaded'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error scanning barcode' });
  }
});

router.get('/', apiLimiter, protect, authorize('driver', 'admin'), driverController.getAllDrivers);
router.post('/', apiLimiter, protect, authorize('admin'), driverController.createDriver);
router.patch('/:id/toggle', apiLimiter, protect, authorize('driver', 'admin'), driverController.toggleAvailability);
router.post('/location', locationTrackingLimiter, protect, authorize('driver'), driverController.updateLocation);
router.get('/:id/metrics', apiLimiter, protect, authorize('driver', 'admin'), driverController.getDriverMetrics);
router.get('/:id/queue', apiLimiter, protect, authorize('driver', 'admin'), driverController.getDriverQueue);
router.put('/:id/queue/activate/:bookingId', apiLimiter, protect, authorize('driver', 'admin'), driverController.activateQueuedTrip);
router.get('/:id/payslip', apiLimiter, protect, authorize('driver', 'admin'), driverController.generatePayslip);
router.get('/:id/payslip/download', apiLimiter, protect, authorize('driver', 'admin'), driverController.downloadPayslip);

module.exports = router;
