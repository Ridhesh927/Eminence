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

const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findByPk(id);
    
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    if (driver.status === 'on_trip') {
      return res.status(400).json({ success: false, message: 'Cannot change availability while on a trip' });
    }

    // Toggle between active and inactive
    driver.status = driver.status === 'active' ? 'inactive' : 'active';
    await driver.save();

    res.status(200).json({ success: true, status: driver.status, driver });
  } catch (error) {
    console.error('Error toggling availability:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllDrivers,
  createDriver,
  toggleAvailability
};
