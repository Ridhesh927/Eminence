const { Driver, Customer, Vehicle, Booking, sequelize } = require('../models');

// --- DRIVER CRUD ---

// Get all drivers
const getDrivers = async (req, res) => {
  try {
    const drivers = await Driver.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, drivers });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a driver
const createDriver = async (req, res) => {
  try {
    const { name, phone, email, licenseNumber, status } = req.body;
    if (!name || !phone || !licenseNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const driver = await Driver.create({ name, phone, email, licenseNumber, status });
    res.status(201).json({ success: true, driver });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update a driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, licenseNumber, status, rating } = req.body;
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    await driver.update({ name, phone, email, licenseNumber, status, rating });
    res.status(200).json({ success: true, driver });
  } catch (error) {
    console.error('Error updating driver:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Delete a driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    await driver.destroy();
    res.status(200).json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- CUSTOMER CRUD ---

// Get all customers
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, customers });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a customer
const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, city, state, address, isPhoneVerified, isProfileComplete } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const customer = await Customer.create({
      name,
      email,
      phone,
      city,
      state,
      address,
      isPhoneVerified,
      isProfileComplete
    });
    res.status(201).json({ success: true, customer });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update a customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, city, state, address, isEmailVerified, isPhoneVerified, isProfileComplete } = req.body;
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    await customer.update({
      name,
      email,
      phone,
      city,
      state,
      address,
      isEmailVerified,
      isPhoneVerified,
      isProfileComplete
    });
    res.status(200).json({ success: true, customer });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Delete a customer
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await Customer.findByPk(id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    await customer.destroy();
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- VEHICLE CRUD ---

// Get all vehicles
const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a vehicle
const createVehicle = async (req, res) => {
  try {
    const { registrationNumber, type, model, capacityWeight, status } = req.body;
    if (!registrationNumber || !type || !capacityWeight) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    const vehicle = await Vehicle.create({ registrationNumber, type, model, capacityWeight, status });
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update a vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { registrationNumber, type, model, capacityWeight, status } = req.body;
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    await vehicle.update({ registrationNumber, type, model, capacityWeight, status });
    res.status(200).json({ success: true, vehicle });
  } catch (error) {
    console.error('Error updating vehicle:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Delete a vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    await vehicle.destroy();
    res.status(200).json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// --- ANALYTICS & REPORTING ---

// Get Overview Stats
const getOverviewStats = async (req, res) => {
  try {
    const totalRevenue = await Booking.sum('estimatedFare', { where: { status: 'completed' } }) || 0;
    const activeDrivers = await Driver.count({ where: { status: 'active' } }) || 0;
    const totalVehicles = await Vehicle.count() || 0;
    const totalCustomers = await Customer.count() || 0;

    res.status(200).json({
      success: true,
      stats: {
        revenue: `₹${parseFloat(totalRevenue).toLocaleString()}`,
        rawRevenue: parseFloat(totalRevenue) || 0,
        activeDrivers: activeDrivers.toString(),
        totalVehicles: totalVehicles.toString(),
        totalCustomers: totalCustomers.toString(),
        rawActiveDrivers: activeDrivers,
        rawTotalVehicles: totalVehicles,
        rawTotalCustomers: totalCustomers
      }
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Revenue Analytics
const getRevenueAnalytics = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      attributes: ['date', [sequelize.fn('SUM', sequelize.col('estimatedFare')), 'dailyRevenue']],
      where: { status: 'completed' },
      group: ['date'],
      order: [['date', 'ASC']]
    });

    const revenueData = bookings.map(b => ({
      date: b.date,
      revenue: parseFloat(b.getDataValue('dailyRevenue')) || 0
    }));

    if (revenueData.length === 0) {
      // Fallback mock data
      const today = new Date();
      const mockData = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i));
        const dateStr = d.toISOString().split('T')[0];
        return {
          date: dateStr,
          revenue: [12000, 15000, 18000, 14000, 22000, 25000, 30000][i]
        };
      });
      return res.status(200).json({ success: true, revenueData: mockData, isMock: true });
    }

    res.status(200).json({ success: true, revenueData });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get Route Analytics
const getRouteAnalytics = async (req, res) => {
  try {
    const routes = await Booking.findAll({
      attributes: [
        'pickupAddress',
        'dropAddress',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['pickupAddress', 'dropAddress'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit: 5
    });

    const routeData = routes.map(r => ({
      route: `${r.pickupAddress.split(',')[0]} ➔ ${r.dropAddress.split(',')[0]}`,
      trips: parseInt(r.getDataValue('count')) || 0
    }));

    if (routeData.length === 0) {
      // Fallback mock data
      const mockRoutes = [
        { route: 'Koregaon Park ➔ Kalyani Nagar', trips: 45 },
        { route: 'Viman Nagar ➔ Baner', trips: 32 },
        { route: 'Hinjewadi Phase 1 ➔ Wakad', trips: 28 },
        { route: 'Hadapsar ➔ Magarpatta City', trips: 22 },
        { route: 'Kothrud ➔ Swargate', trips: 15 }
      ];
      return res.status(200).json({ success: true, routeData: mockRoutes, isMock: true });
    }

    res.status(200).json({ success: true, routeData });
  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getOverviewStats,
  getRevenueAnalytics,
  getRouteAnalytics
};
