const { Driver, Customer, Vehicle, Booking, AuditLog, PlatformConfig, B2BContract, PromoCode, Admin, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
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
      attributes: { exclude: ['password'] },
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Create a driver
const createDriver = async (req, res) => {
  try {
    const { name, phone, email, licenseNumber, status, password } = req.body;
    if (!name || !phone || !licenseNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let hashedPassword = null;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(password, salt);
    }

    const driver = await Driver.create({
      name,
      phone,
      email,
      licenseNumber,
      status: status || 'active',
      password: hashedPassword
    });

    const driverResponse = driver.toJSON();
    driverResponse.isProfileComplete = true;
    delete driverResponse.password;

    res.status(201).json({ success: true, driver: driverResponse });
  } catch (error) {
    console.error('Error creating driver:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Update a driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, licenseNumber, status, rating, password } = req.body;
    const driver = await Driver.findByPk(id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const updateData = { name, phone, email, licenseNumber, status, rating };
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    await driver.update(updateData);
    const driverResponse = driver.toJSON();
    delete driverResponse.password;

    res.status(200).json({ success: true, driver: driverResponse });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Bulk delete drivers
const bulkDeleteDrivers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of driver IDs to delete' });
    }
    const deletedCount = await Driver.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });
    res.status(200).json({ success: true, message: `Successfully deleted ${deletedCount} driver(s)`, count: deletedCount });
  } catch (error) {
    console.error('Error bulk deleting drivers:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Create a customer
const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, city, state, address, isPhoneVerified, isProfileComplete, referralCode, referredBy } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const refCode = referralCode || `EMINENCE-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const customer = await Customer.create({
      name,
      email,
      phone,
      city,
      state,
      address,
      isPhoneVerified: !!isPhoneVerified,
      isProfileComplete: !!isProfileComplete,
      referralCode: refCode,
      referredBy: referredBy || null
    });
    const { Wallet } = require('../models');
    await Wallet.findOrCreate({ where: { customerId: customer.id }, defaults: { balance: 0.00 } });
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
    const { 
      name, email, phone, city, state, address, 
      isEmailVerified, isPhoneVerified, isProfileComplete,
      b2bStatus, isBusiness, billingMode, creditLimit
    } = req.body;
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
      isProfileComplete,
      ...(b2bStatus !== undefined && { b2bStatus }),
      ...(isBusiness !== undefined && { isBusiness }),
      ...(billingMode !== undefined && { billingMode }),
      ...(creditLimit !== undefined && { creditLimit })
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Bulk delete customers
const bulkDeleteCustomers = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of customer IDs to delete' });
    }
    const { Address, Wallet, Transaction } = require('../models');
    if (Wallet) {
      const wallets = await Wallet.findAll({ where: { customerId: { [Op.in]: ids } } });
      const walletIds = wallets.map(w => w.id);
      if (walletIds.length > 0 && Transaction) {
        await Transaction.destroy({ where: { walletId: { [Op.in]: walletIds } } });
      }
      await Wallet.destroy({ where: { customerId: { [Op.in]: ids } } });
    }
    if (Address) {
      await Address.destroy({ where: { customerId: { [Op.in]: ids } } });
    }
    const deletedCount = await Customer.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });
    res.status(200).json({ success: true, message: `Successfully deleted ${deletedCount} customer(s)`, count: deletedCount });
  } catch (error) {
    console.error('Error bulk deleting customers:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};


// --- ANALYTICS & REPORTING ---

// Get Overview Stats
const getOverviewStats = async (req, res) => {
  try {
    const [totalRevenue, activeDrivers, totalVehicles, totalCustomers, recentBookings] = await Promise.all([
      Booking.sum('estimatedFare', { where: { status: 'completed' } }),
      Driver.count({ where: { status: 'active' } }),
      Vehicle.count(),
      Customer.count(),
      Booking.findAll({
        include: [{ model: Customer, as: 'customer', attributes: ['name', 'phone'] }],
        order: [['createdAt', 'DESC']],
        limit: 6
      })
    ]);

    const activities = recentBookings.map((b) => {
      const timeStr = b.createdAt ? new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';
      let eventTitle = 'Booking Created';
      if (b.status === 'completed') eventTitle = 'Trip Completed';
      else if (b.status === 'driver_assigned' || b.status === 'arrived') eventTitle = 'Driver Dispatched';
      else if (b.status === 'in_transit') eventTitle = 'Goods in Transit';
      else if (b.status === 'expired') eventTitle = 'Trip Expired';
      else if (b.status === 'cancelled') eventTitle = 'Trip Cancelled';

      let displayStatus = 'Processing';
      if (b.status === 'completed') displayStatus = 'Success';
      else if (b.status === 'expired') displayStatus = 'Expired';
      else if (b.status === 'cancelled') displayStatus = 'Cancelled';
      else if (b.status === 'pending') displayStatus = 'Pending';

      return {
        id: b.id,
        time: timeStr,
        event: `${eventTitle} (#${b.id.slice(0, 8)})`,
        user: b.customer?.name || b.customer?.phone || 'Customer',
        status: displayStatus
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        revenue: `₹${parseFloat(totalRevenue || 0).toLocaleString()}`,
        rawRevenue: parseFloat(totalRevenue || 0),
        activeDrivers: activeDrivers.toString(),
        totalVehicles: totalVehicles.toString(),
        totalCustomers: totalCustomers.toString(),
        rawActiveDrivers: activeDrivers,
        rawTotalVehicles: totalVehicles,
        rawTotalCustomers: totalCustomers,
        activities
      }
    });
  } catch (error) {
    console.error('Error fetching overview stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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

    res.status(200).json({ success: true, revenueData });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Get Route Analytics with limit, status, and date filtering
const getRouteAnalytics = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 5, 50);
    const { startDate, endDate, status } = req.query;
    const where = {};

    // Filter by status: default to 'completed' so completed trip analytics accurately reflect finished trips
    if (status && status !== 'all') {
      where.status = status;
    } else if (!status) {
      where.status = 'completed';
    }

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

    res.status(200).json({ success: true, routeData });
  } catch (error) {
    console.error('Error fetching route analytics:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// --- ENTERPRISE SCALE & MATURITY ---

// Driver Utilization Analytics
const getDriverUtilization = async (req, res) => {
  try {
    const cacheKey = 'analytics:driver_utilization';
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

    const [totalDrivers, activeDrivers, onTripDrivers, hourGroupQuery] = await Promise.all([
      Driver.count(),
      Driver.count({ where: { status: 'active' } }),
      Driver.count({ where: { status: 'on_trip' } }),
      Booking.findAll({
        attributes: [
          [sequelize.fn('substr', sequelize.col('time'), 1, 2), 'hourStr'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        where: {
          time: { [Op.not]: null }
        },
        group: [sequelize.fn('substr', sequelize.col('time'), 1, 2)],
        raw: true
      })
    ]);

    const utilizationRate = totalDrivers > 0 ? ((onTripDrivers / totalDrivers) * 100).toFixed(1) : 0;

    const peakHours = hourGroupQuery
      .map(row => ({
        hour: `${row.hourStr}:00`,
        bookings: parseInt(row.count, 10) || 0
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 8);

    const data = { totalDrivers, activeDrivers, onTripDrivers, utilizationRate, peakHours };
    await cache.set(cacheKey, data, 30000); // Cache 30 seconds
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    console.error('Error fetching driver utilization:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
      cacheStats: await cache.stats(),
      activeAlerts: dbLatencyMs > 500 ? ['HIGH_DB_LATENCY'] : []
    };
    res.status(200).json({ success: true, sla });
  } catch (error) {
    console.error('Error fetching SLA stats:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Platform Config (White-Label)
const getPlatformConfig = async (req, res) => {
  try {
    const cacheKey = 'platform:config';
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, config: cached });

    let config = await PlatformConfig.findOne();
    if (!config) {
      config = await PlatformConfig.create({}); // Create with defaults
    }
    await cache.set(cacheKey, config.toJSON(), 5 * 60 * 1000); // Cache 5 mins
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error('Error fetching platform config:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updatePlatformConfig = async (req, res) => {
  try {
    // Allowlist to prevent mass-assignment of internal DB columns
    const ALLOWED_CONFIG_FIELDS = [
      'brandName', 'primaryColor', 'secondaryColor', 'accentColor', 'logoUrl', 'tagline', 'supportEmail'
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => ALLOWED_CONFIG_FIELDS.includes(k))
    );
    let config = await PlatformConfig.findOne();
    if (!config) config = await PlatformConfig.create({});
    await config.update(updates);
    await cache.del('platform:config');
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.error('Error updating platform config:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
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
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Dynamic Surge Pricing
const getSurgePricing = async (req, res) => {
  try {
    const cacheKey = 'pricing:surge';
    const cached = await cache.get(cacheKey);
    if (cached) return res.status(200).json({ success: true, ...cached, fromCache: true });

    const activeBookings = await Booking.count({ where: { status: ['pending', 'driver_assigned', 'in_transit'] } });
    const availableDrivers = await Driver.count({ where: { status: 'active' } });

    let surgeMultiplier = 1.0;
    let surgeLabel = 'Normal';

    const demandRatio = availableDrivers > 0 ? activeBookings / availableDrivers : 999;
    if (demandRatio > 3) { surgeMultiplier = 2.5; surgeLabel = 'High Demand'; }
    else if (demandRatio > 2) { surgeMultiplier = 1.8; surgeLabel = 'Surge Active'; }
    else if (demandRatio > 1.5) { surgeMultiplier = 1.3; surgeLabel = 'Slightly Busy'; }

    const result = { surgeMultiplier, surgeLabel, activeBookings, availableDrivers, demandRatio: parseFloat(demandRatio.toFixed(2)) };
    await cache.set(cacheKey, result, 15000); // Cache 15s
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error calculating surge pricing:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// --- CONTRACTS CRUD ---

const getContracts = async (req, res) => {
  try {
    const contracts = await B2BContract.findAll({
      include: [{ model: Customer, as: 'customer', attributes: ['name', 'phone', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(contracts);
  } catch (error) {
    console.error('Error fetching contracts:', error);
    res.status(500).json({ message: 'Error fetching contracts' });
  }
};

const updateContractStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, discountPercentage, volumeCommitment, dailyRate } = req.body;
    
    const contract = await B2BContract.findByPk(id);
    if (!contract) return res.status(404).json({ message: 'Contract not found' });

    // Ensure status is valid
    const validStatuses = ['pending', 'active', 'expired', 'cancelled', 'rejected'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (discountPercentage !== undefined) updates.discountPercentage = discountPercentage;
    if (volumeCommitment !== undefined) updates.volumeCommitment = volumeCommitment;
    if (dailyRate !== undefined) updates.dailyRate = dailyRate;

    await contract.update(updates);

    if (req.user) {
      await AuditLog.create({
        adminId: req.user.id,
        action: `UPDATED_CONTRACT`,
        resourceId: contract.id,
        resourceType: 'B2BContract',
        details: { previousStatus: contract.status, newStatus: status },
        ipAddress: req.ip
      });
    }

    res.json(contract);
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ message: 'Error updating contract' });
  }
};

// Get Peak Hours Heatmap (Bookings grouped by hour)
const getPeakHoursAnalytics = async (req, res) => {
  try {
    const isPostgres = sequelize.getDialect() === 'postgres';
    
    let query;
    if (isPostgres) {
      query = `SELECT EXTRACT(HOUR FROM "createdAt") AS hour, COUNT(id) AS count FROM "Bookings" GROUP BY EXTRACT(HOUR FROM "createdAt") ORDER BY hour ASC`;
    } else {
      query = `SELECT CAST(strftime('%H', createdAt) AS INTEGER) AS hour, COUNT(id) AS count FROM "Bookings" GROUP BY hour ORDER BY hour ASC`;
    }

    let peakHoursData = [];
    try {
      peakHoursData = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
    } catch (queryErr) {
      // Graceful fallback for unquoted table identifiers in certain SQLite installations
      const fallbackQuery = `SELECT CAST(strftime('%H', createdAt) AS INTEGER) AS hour, COUNT(id) AS count FROM Bookings GROUP BY hour ORDER BY hour ASC`;
      peakHoursData = await sequelize.query(fallbackQuery, { type: sequelize.QueryTypes.SELECT });
    }
    
    // Map hour strings to integers
    const formattedData = (peakHoursData || []).map(d => ({
      hour: parseInt(d.hour, 10),
      count: parseInt(d.count, 10)
    }));

    res.status(200).json({ success: true, peakHoursData: formattedData });
  } catch (error) {
    console.error('Error fetching peak hours analytics:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// --- PROMO CODE / REFERRAL CRUD ---
const getPromoCodes = async (req, res) => {
  try {
    const promoCodes = await PromoCode.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, promoCodes });
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const createPromoCode = async (req, res) => {
  try {
    const { code, description, discountType, discountValue, maxDiscount, minOrderValue, maxUses, expiresAt, isActive } = req.body;
    if (!code || !expiresAt) {
      return res.status(400).json({ success: false, message: 'Code and expiration date are required' });
    }

    const existing = await PromoCode.findOne({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Promo code already exists' });
    }

    const promoCode = await PromoCode.create({
      code: code.trim().toUpperCase(),
      description,
      discountType: discountType || 'FLAT',
      discountValue: discountValue || 100,
      maxDiscount: maxDiscount || null,
      minOrderValue: minOrderValue || 0,
      maxUses: maxUses || null,
      expiresAt: new Date(expiresAt),
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({ success: true, promoCode });
  } catch (error) {
    console.error('Error creating promo code:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updatePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, discountType, discountValue, maxDiscount, minOrderValue, maxUses, expiresAt, isActive } = req.body;

    const promoCode = await PromoCode.findByPk(id);
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }

    if (description !== undefined) promoCode.description = description;
    if (discountType !== undefined) promoCode.discountType = discountType;
    if (discountValue !== undefined) promoCode.discountValue = discountValue;
    if (maxDiscount !== undefined) promoCode.maxDiscount = maxDiscount;
    if (minOrderValue !== undefined) promoCode.minOrderValue = minOrderValue;
    if (maxUses !== undefined) promoCode.maxUses = maxUses;
    if (expiresAt !== undefined) promoCode.expiresAt = new Date(expiresAt);
    if (isActive !== undefined) promoCode.isActive = Boolean(isActive);

    await promoCode.save();
    res.status(200).json({ success: true, promoCode });
  } catch (error) {
    console.error('Error updating promo code:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const deletePromoCode = async (req, res) => {
  try {
    const { id } = req.params;
    const promoCode = await PromoCode.findByPk(id);
    if (!promoCode) {
      return res.status(404).json({ success: false, message: 'Promo code not found' });
    }
    await promoCode.destroy();
    res.status(200).json({ success: true, message: 'Promo code deleted successfully' });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// --- ADMIN USERS CRUD ---
const getAdmins = async (req, res) => {
  try {
    const primaryEmail = (process.env.SEED_EMAIL || 'admin@eminence.com').toLowerCase();
    const admins = await Admin.findAll({
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });
    const mapped = admins.map(a => {
      const data = a.toJSON ? a.toJSON() : { ...a };
      const isPrimary = Boolean(data.isPrimary || (data.email && data.email.toLowerCase() === primaryEmail));
      return {
        ...data,
        isPrimary,
        role: isPrimary ? 'Superadmin' : (data.role || 'Support Admin')
      };
    });
    res.status(200).json({ success: true, admins: mapped });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const createAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }
    const existing = await Admin.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Admin with this email already exists' });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const allowedRoles = ['Superadmin', 'Finance Admin', 'Support Admin'];
    const assignedRole = allowedRoles.includes(role) ? role : 'Support Admin';

    const admin = await Admin.create({
      name: name || 'Administrator',
      email,
      password: hashedPassword,
      role: assignedRole,
      isPrimary: false
    });
    const adminResponse = admin.toJSON();
    delete adminResponse.password;
    adminResponse.isPrimary = false;
    res.status(201).json({ success: true, admin: adminResponse });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    const primaryEmail = (process.env.SEED_EMAIL || 'admin@eminence.com').toLowerCase();
    const isTargetPrimary = Boolean(admin.isPrimary || (admin.email && admin.email.toLowerCase() === primaryEmail));

    if (name) admin.name = name;
    if (email && !isTargetPrimary) admin.email = email;
    if (role && !isTargetPrimary) {
      const allowedRoles = ['Superadmin', 'Finance Admin', 'Support Admin'];
      if (allowedRoles.includes(role)) admin.role = role;
    }
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }
    await admin.save();
    const adminResponse = admin.toJSON();
    delete adminResponse.password;
    adminResponse.isPrimary = isTargetPrimary;
    res.status(200).json({ success: true, admin: adminResponse });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const adminCount = await Admin.count();
    if (adminCount <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot delete the only existing administrator' });
    }

    // Prevent self-deletion
    if (req.user?.id && req.user.id === id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account' });
    }

    const admin = await Admin.findByPk(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const primaryEmail = (process.env.SEED_EMAIL || 'admin@eminence.com').toLowerCase();
    const isTargetPrimary = Boolean(admin.isPrimary || (admin.email && admin.email.toLowerCase() === primaryEmail));

    // CRITICAL: Prevent deleting primary super admin under any circumstance
    if (isTargetPrimary) {
      return res.status(403).json({
        success: false,
        message: 'The primary Super Administrator cannot be deleted'
      });
    }

    // Role hierarchy verification:
    let callerAdmin = null;
    if (req.user?.id) {
      callerAdmin = await Admin.findByPk(req.user.id);
    }
    const isCallerPrimary = Boolean(callerAdmin?.isPrimary || (callerAdmin?.email && callerAdmin.email.toLowerCase() === primaryEmail));
    const callerRole = callerAdmin?.role || (isCallerPrimary ? 'Superadmin' : (req.user?.adminRole || 'Superadmin'));
    const targetRole = admin.role || (isTargetPrimary ? 'Superadmin' : 'Support Admin');

    // Newly created and regular admins cannot delete Superadmins
    if (targetRole === 'Superadmin' && callerRole !== 'Superadmin' && !isCallerPrimary) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Newly created and regular administrators cannot delete a Super Admin'
      });
    }

    // Only Superadmins can delete administrators
    if (callerRole !== 'Superadmin' && !isCallerPrimary) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmins can delete administrator accounts'
      });
    }

    await admin.destroy();
    res.status(200).json({ success: true, message: 'Admin deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

// Bulk delete admins
const bulkDeleteAdmins = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an array of admin IDs to delete' });
    }
    const currentAdminId = req.user?.id;
    if (currentAdminId && ids.includes(currentAdminId)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own active administrator account' });
    }

    const primaryEmail = (process.env.SEED_EMAIL || 'admin@eminence.com').toLowerCase();

    // Check caller permissions
    let callerAdmin = null;
    if (currentAdminId) {
      callerAdmin = await Admin.findByPk(currentAdminId);
    }
    const isCallerPrimary = Boolean(callerAdmin?.isPrimary || (callerAdmin?.email && callerAdmin.email.toLowerCase() === primaryEmail));
    const callerRole = callerAdmin?.role || (isCallerPrimary ? 'Superadmin' : (req.user?.adminRole || 'Superadmin'));

    // Check targets
    const targets = await Admin.findAll({
      where: { id: { [Op.in]: ids } }
    });

    const hasPrimaryTarget = targets.some(
      t => t.isPrimary || (t.email && t.email.toLowerCase() === primaryEmail)
    );
    if (hasPrimaryTarget) {
      return res.status(403).json({
        success: false,
        message: 'The primary Super Administrator cannot be deleted'
      });
    }

    // Newly created / regular admins cannot delete Superadmins
    const hasSuperadminTarget = targets.some(t => t.role === 'Superadmin');
    if (hasSuperadminTarget && callerRole !== 'Superadmin' && !isCallerPrimary) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Newly created and regular administrators cannot delete a Super Admin'
      });
    }

    if (callerRole !== 'Superadmin' && !isCallerPrimary) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied: Only Superadmins can delete administrator accounts'
      });
    }

    const totalAdmins = await Admin.count();
    if (totalAdmins - ids.length < 1) {
      return res.status(400).json({ success: false, message: 'Operation aborted: at least one administrator must remain active' });
    }

    const deletedCount = await Admin.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });
    res.status(200).json({ success: true, message: `Successfully deleted ${deletedCount} admin(s)`, count: deletedCount });
  } catch (error) {
    console.error('Error bulk deleting admins:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
};

module.exports = {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  bulkDeleteDrivers,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  bulkDeleteCustomers,
  getVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getOverviewStats,
  getRevenueAnalytics,
  getRouteAnalytics,
  getPeakHoursAnalytics,
  getDriverUtilization,
  getSlaStats,
  getAuditLogs,
  getPlatformConfig,
  updatePlatformConfig,
  exportBookings,
  getSurgePricing,
  getContracts,
  updateContractStatus,
  getPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  bulkDeleteAdmins
};
