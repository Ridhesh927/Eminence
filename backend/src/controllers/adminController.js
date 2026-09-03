const { Driver, Customer, Vehicle, Booking, AuditLog, PlatformConfig, sequelize } = require('../models');
const { Op } = require('sequelize');
const cache = require('../services/cacheService');
const startTime = Date.now();

// --- DRIVER CRUD ---

// Get all drivers with pagination and search
const getDrivers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const { search, status } = req.query;

    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { licenseNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: drivers } = await Driver.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      drivers,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
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

// Get all customers with pagination and search
const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const { search } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: customers } = await Customer.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      customers,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
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

// Get all vehicles with pagination and search
const getVehicles = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;
    const { search, status, type } = req.query;

    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where[Op.or] = [
        { registrationNumber: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: vehicles } = await Vehicle.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      success: true,
      vehicles,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });
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

// Get Revenue Analytics with date filtering
const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where = { status: 'completed' };

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const bookings = await Booking.findAll({
      attributes: ['date', [sequelize.fn('SUM', sequelize.col('estimatedFare')), 'dailyRevenue']],
      where,
      group: ['date'],
      order: [['date', 'ASC']]
    });

    const revenueData = bookings.map(b => ({
      date: b.date,
      revenue: parseFloat(b.getDataValue('dailyRevenue')) || 0
    }));

    if (revenueData.length === 0) {
      // In production, return empty array rather than mock data unless mock is explicitly enabled
      if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_ANALYTICS !== 'true') {
        return res.status(200).json({ success: true, revenueData: [] });
      }

      // Fallback mock data for development demonstration
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

// Get Route Analytics with limit and date filtering
const getRouteAnalytics = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
    const { startDate, endDate } = req.query;
    const where = {};

    if (startDate && endDate) {
      where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };
    } else if (startDate) {
      where.createdAt = { [Op.gte]: new Date(startDate) };
    } else if (endDate) {
      where.createdAt = { [Op.lte]: new Date(endDate) };
    }

    const routes = await Booking.findAll({
      attributes: [
        'pickupAddress',
        'dropAddress',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      where,
      group: ['pickupAddress', 'dropAddress'],
      order: [[sequelize.literal('count'), 'DESC']],
      limit
    });

    const routeData = routes.map(r => ({
      route: `${r.pickupAddress.split(',')[0]} ➔ ${r.dropAddress.split(',')[0]}`,
      trips: parseInt(r.getDataValue('count')) || 0
    }));

    if (routeData.length === 0) {
      // In production, return empty array rather than mock data unless mock is explicitly enabled
      if (process.env.NODE_ENV === 'production' && process.env.ENABLE_MOCK_ANALYTICS !== 'true') {
        return res.status(200).json({ success: true, routeData: [] });
      }

      // Fallback mock data for development demonstration
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

// --- ENTERPRISE SCALE & MATURITY ---

// Driver Utilization Analytics
const getDriverUtilization = async (req, res) => {
  try {
    const cacheKey = 'analytics:driver_utilization';
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

    const totalDrivers = await Driver.count();
    const activeDrivers = await Driver.count({ where: { status: 'active' } });
    const onTripDrivers = await Driver.count({ where: { status: 'on_trip' } });
    const utilizationRate = totalDrivers > 0 ? ((onTripDrivers / totalDrivers) * 100).toFixed(1) : 0;

    // Peak hours simulation (real implementation would query Booking.time)
    const peakHours = [
      { hour: '08:00', bookings: 12 }, { hour: '09:00', bookings: 18 },
      { hour: '10:00', bookings: 22 }, { hour: '11:00', bookings: 15 },
      { hour: '14:00', bookings: 20 }, { hour: '17:00', bookings: 28 },
      { hour: '18:00', bookings: 35 }, { hour: '19:00', bookings: 25 }
    ];

    const data = { totalDrivers, activeDrivers, onTripDrivers, utilizationRate, peakHours };
    cache.set(cacheKey, data, 30000); // Cache 30 seconds
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Error fetching driver utilization:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// SLA Monitoring & Health Stats
const getSlaStats = async (req, res) => {
  try {
    const uptimeMs = Date.now() - startTime;
    const uptimeHours = (uptimeMs / 1000 / 60 / 60).toFixed(2);
    const memoryUsage = process.memoryUsage();

    // DB ping
    let dbLatencyMs = null;
    try {
      const dbStart = Date.now();
      await sequelize.authenticate();
      dbLatencyMs = Date.now() - dbStart;
    } catch { dbLatencyMs = -1; }

    const sla = {
      uptimeMs,
      uptimeHours,
      uptimePercentage: '99.9%', // Simulated
      dbLatencyMs,
      memoryUsageMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
      cacheStats: cache.stats(),
      activeAlerts: dbLatencyMs > 500 ? ['HIGH_DB_LATENCY'] : []
    };
    res.status(200).json({ success: true, sla });
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Audit Logs
const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;

    const { count, rows: logs } = await AuditLog.findAndCountAll({
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({ success: true, logs, total: count, page, totalPages: Math.ceil(count / limit) });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Platform Config (White-Label)
const getPlatformConfig = async (req, res) => {
  try {
    const cacheKey = 'platform:config';
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, config: cached });

    let config = await PlatformConfig.findOne();
    if (!config) {
      config = await PlatformConfig.create({}); // Create with defaults
    }
    cache.set(cacheKey, config.toJSON(), 5 * 60 * 1000); // Cache 5 mins
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error('Error fetching platform config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const updatePlatformConfig = async (req, res) => {
  try {
    let config = await PlatformConfig.findOne();
    if (!config) config = await PlatformConfig.create({});
    await config.update(req.body);
    cache.del('platform:config');
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error('Error updating platform config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Export bookings as JSON (Expense Management)
const exportBookings = async (req, res) => {
  try {
    const { customerId, startDate, endDate } = req.query;
    const where = {};
    if (customerId) where.customerId = customerId;
    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    }

    const bookings = await Booking.findAll({
      where,
      order: [['date', 'DESC']],
      limit: 500
    });

    // Return structured data for CSV/PDF generation on the frontend
    const exportData = bookings.map(b => ({
      id: b.id,
      date: b.date,
      pickup: b.pickupAddress,
      drop: b.dropAddress,
      tempoType: b.tempoType,
      fare: b.estimatedFare,
      status: b.status,
      esgEmissions: b.esgEmissions,
      podHash: b.podHash
    }));

    res.status(200).json({ success: true, total: exportData.length, bookings: exportData });
  } catch (error) {
    console.error('Error exporting bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Dynamic Surge Pricing
const getSurgePricing = async (req, res) => {
  try {
    const cacheKey = 'pricing:surge';
    const cached = cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

    const activeBookings = await Booking.count({ where: { status: ['pending', 'driver_assigned', 'on_trip'] } });
    const availableDrivers = await Driver.count({ where: { status: 'active' } });

    let surgeMultiplier = 1.0;
    let surgeLabel = 'Normal';

    const demandRatio = availableDrivers > 0 ? activeBookings / availableDrivers : 999;
    if (demandRatio > 3) { surgeMultiplier = 2.5; surgeLabel = 'High Demand'; }
    else if (demandRatio > 2) { surgeMultiplier = 1.8; surgeLabel = 'Surge Active'; }
    else if (demandRatio > 1.5) { surgeMultiplier = 1.3; surgeLabel = 'Slightly Busy'; }

    const result = { surgeMultiplier, surgeLabel, activeBookings, availableDrivers, demandRatio: parseFloat(demandRatio.toFixed(2)) };
    cache.set(cacheKey, result, 15000); // Cache 15s
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error calculating surge pricing:', error);
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
  getRouteAnalytics,
  getDriverUtilization,
  getSlaStats,
  getAuditLogs,
  getPlatformConfig,
  updatePlatformConfig,
  exportBookings,
  getSurgePricing
};
