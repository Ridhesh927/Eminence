const { Driver } = require('../models');

// Get all drivers
const getAllDrivers = async (_req, res) => {
  try {
    const drivers = await Driver.findAll();
    res.status(200).json({ success: true, drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a driver
const createDriver = async (req, res) => {
  try {
    const driver = await Driver.create(req.body);
    res.status(201).json({ success: true, driver });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDrivers,
  createDriver
};
