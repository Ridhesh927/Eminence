const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { Address } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');

const addressRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

router.use(authMiddleware);
router.use(addressRateLimiter);

// Get all addresses for user
router.get('/', async (req, res) => {
  try {
    const addresses = await Address.findAll({ where: { customerId: req.user.id } });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching addresses', error: error.message });
  }
});

// Add new address
router.post('/', async (req, res) => {
  try {
    const { label, street, city, postalCode } = req.body;
    const address = await Address.create({
      customerId: req.user.id,
      label,
      street,
      city,
      postalCode
    });
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating address', error: error.message });
  }
});

// Delete address
router.delete('/:id', async (req, res) => {
  try {
    const address = await Address.findOne({ where: { id: req.params.id, customerId: req.user.id } });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    await address.destroy();
    res.json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting address', error: error.message });
  }
});

module.exports = router;
