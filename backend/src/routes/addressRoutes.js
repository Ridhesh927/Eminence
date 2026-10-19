const express = require('express');
const router = express.Router();
const { Address } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const { addressRateLimiter } = require('../middleware/rateLimiter');

router.use(addressRateLimiter);
router.use(authMiddleware);

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
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: User not found in session' });
    }
    const address = await Address.create({
      customerId: req.user.id,
      label: label || 'Home',
      street,
      city,
      postalCode
    });
    res.status(201).json(address);
  } catch (error) {
    console.error('Failed to create address:', error);
    res.status(500).json({ 
      message: error.name === 'SequelizeForeignKeyConstraintError' || (error.message && error.message.includes('FOREIGN KEY'))
        ? 'Addresses can only be saved for customer accounts. Please log in as a customer.' 
        : (error.message || 'Server error creating address'), 
      error: error.message 
    });
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
