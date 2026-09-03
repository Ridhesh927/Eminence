const express = require('express');
const router = express.Router();
const { Address } = require('../models');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

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
