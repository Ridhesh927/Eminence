const { Booking, Customer, Driver, Vehicle } = require('../models');
const { optimizeRoute } = require('../services/routeOptimizer');
const { findPoolMatch } = require('../services/poolingEngine');
const crypto = require('crypto');

// Get all bookings (role-aware: customers only see their own bookings)
const getAllBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (req.user && req.user.role === 'customer') {
      whereClause.customerId = req.user.id;
    }

    const { count, rows: bookings } = await Booking.findAndCountAll({
      where: whereClause,
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone', 'licenseNumber'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type'] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ 
      success: true, 
      bookings,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a booking
const createBooking = async (req, res) => {
  try {
    let customerId = req.user?.id;
    if (req.user?.role === 'admin' && req.body.customerId) {
      customerId = req.body.customerId;
    }
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Authentication required to create a booking' });
    }
    const bookingData = { ...req.body, customerId };

    // 1. ESG Carbon Footprint Calculation
    const distance = parseFloat(bookingData.totalDistance) || 15.0; // fallback to 15km if not provided
    let emissionRate = 200; // grams per km default
    if (bookingData.tempoType === 'small') emissionRate = 120;
    if (bookingData.tempoType === 'medium') emissionRate = 200;
    if (bookingData.tempoType === 'large') emissionRate = 350;
    bookingData.esgEmissions = parseFloat(((distance * emissionRate) / 1000).toFixed(2)); // in KG CO2

    // Multi-stop Optimization (TSP)
    if (req.body.drops && Array.isArray(req.body.drops)) {
      const baseLat = 18.5204;
      const baseLng = 73.8567;
      const waypoints = req.body.drops.map((address, idx) => ({
        id: `stop_${idx}`,
        address,
        // Deterministic geographic offset based on stop index
        lat: baseLat + ((idx + 1) * 0.015),
        lng: baseLng + ((idx + 1) * 0.012)
      }));
      
      const optimized = optimizeRoute(
        { lat: baseLat, lng: baseLng }, // starting point
        waypoints
      );
      
      bookingData.stops = optimized;
      // We still keep the first drop as dropAddress for legacy compatibility
      bookingData.dropAddress = req.body.drops[0];
    }

    // Bounds & Financial Validation (Issue #172)
    if (!bookingData.estimatedFare || parseFloat(bookingData.estimatedFare) <= 0) {
      return res.status(400).json({ success: false, message: 'Valid estimated fare greater than zero is required' });
    }

    if (bookingData.totalDistance !== undefined && parseFloat(bookingData.totalDistance) < 0.1) {
      return res.status(400).json({ success: false, message: 'Distance must be at least 0.1 km' });
    }

    const cargoWeight = parseInt(bookingData.weight, 10);
    if (isNaN(cargoWeight) || cargoWeight <= 0) {
      return res.status(400).json({ success: false, message: 'Valid cargo weight greater than zero is required' });
    }

    const maxCapacities = { small: 750, medium: 1500, large: 5000 };
    if (bookingData.tempoType && maxCapacities[bookingData.tempoType] && cargoWeight > maxCapacities[bookingData.tempoType]) {
      return res.status(400).json({
        success: false,
        message: `Cargo weight (${cargoWeight}kg) exceeds maximum capacity for ${bookingData.tempoType} vehicle (${maxCapacities[bookingData.tempoType]}kg)`
      });
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.isBusiness) {
      bookingData.isB2B = true;

      // Deduct negotiated B2B contract discount if active contract exists
      const { B2BContract } = require('../models');
      const activeContract = await B2BContract.findOne({
        where: { customerId: customer.id, status: 'active' },
        order: [['createdAt', 'DESC']]
      });

      if (activeContract && activeContract.discountPercentage > 0) {
        const discountRate = parseFloat(activeContract.discountPercentage) / 100;
        const discountAmount = parseFloat(bookingData.estimatedFare) * discountRate;
        bookingData.estimatedFare = parseFloat((parseFloat(bookingData.estimatedFare) - discountAmount).toFixed(2));
      }

      // GST Calculation (Assuming 18% for B2B)
      bookingData.gstAmount = parseFloat((bookingData.estimatedFare * 0.18).toFixed(2));
    }

    if (bookingData.paymentMethod === 'postpaid') {
      if (!customer.isBusiness || customer.billingMode !== 'postpaid') {
        return res.status(403).json({ success: false, message: 'Postpaid billing is only available for approved corporate accounts.' });
      }

      const totalCost = parseFloat(bookingData.estimatedFare) + (bookingData.gstAmount || 0);
      const availableCredit = parseFloat(customer.creditLimit) - parseFloat(customer.creditUsed);

      if (totalCost > availableCredit) {
        return res.status(400).json({ success: false, message: 'Insufficient credit limit for this booking.' });
      }

      // Update credit used
      customer.creditUsed = parseFloat(customer.creditUsed) + totalCost;
      await customer.save();
    }

    // Dynamic Load Pooling Logic
    if (bookingData.bookingMode === 'shared') {
      const poolMatchId = await findPoolMatch(bookingData);
      if (poolMatchId) {
        bookingData.poolMatchId = poolMatchId; // Assign to the matched vehicle
        bookingData.status = 'driver_assigned'; // Auto-assign since it's an active pool
      }
    }

    // 2. 3PL API Failover Logic
    // Check if any driver is available, if not, simulate API failover
    const availableDrivers = await Driver.count({ where: { status: 'active' } });
    if (availableDrivers === 0 && bookingData.status === 'pending') {
      console.log(`[3PL Failover] No internal drivers available. Outsourcing booking to Delhivery API...`);
      bookingData.is3plOutsourced = true;
      bookingData.thirdPartyProvider = 'Delhivery Logistics';
      bookingData.status = 'driver_assigned'; // Assume 3PL accepts it instantly
    }

    const booking = await Booking.create(bookingData);
    res.status(201).json({ success: true, booking, pooled: !!bookingData.poolMatchId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Complete a booking (Blockchain PoD simulation)
const completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const authorized =
      req.user.role === 'admin' ||
      (req.user.role === 'driver' && booking.driverId === req.user.id);

    if (!authorized) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to complete this booking'
      });
    }

    booking.status = 'completed';
    
    // Blockchain PoD Simulation
    const bookingDataStr = JSON.stringify({
      id: booking.id,
      customerId: booking.customerId,
      driverId: booking.driverId,
      timestamp: new Date().toISOString()
    });
    const podHash = crypto.createHash('sha256').update(bookingDataStr).digest('hex');
    booking.podHash = podHash;

    await booking.save();
    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Error completing booking:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update booking status (arrived, in_transit, driver_assigned)
const updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const userRole = req.user?.role;
    const userId = req.user?.id;
    const { status, driverId } = req.body;

    const isAdmin = userRole === 'admin';
    const isAssignedDriver = userRole === 'driver' && booking.driverId === userId;
    const isDriverClaiming = userRole === 'driver' && (!booking.driverId || booking.driverId === userId);
    const isCustomerCancelling = userRole === 'customer' && booking.customerId === userId && status === 'cancelled';

    if (!isAdmin && !isAssignedDriver && !isDriverClaiming && !isCustomerCancelling) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this booking' });
    }

    if (status) {
      if (status === 'completed' && !isAdmin) {
        return res.status(400).json({ success: false, message: 'Must use /complete endpoint with PoD verification' });
      }
      booking.status = status;
    }

    if (driverId) {
      if (isAdmin) {
        booking.driverId = driverId;
      } else if (userRole === 'driver' && driverId === userId) {
        booking.driverId = userId;
      } else {
        return res.status(403).json({ success: false, message: 'Cannot assign another driver' });
      }
    }

    await booking.save();
    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single booking by ID
const getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone', 'licenseNumber', 'rating'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type', 'model'] }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (req.user) {
      if (req.user.role === 'customer' && booking.customerId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
      }
      if (req.user.role === 'driver' && booking.driverId && booking.driverId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
      }
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    console.error('Error fetching booking by ID:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// AI Voice Agent Simulation (NLP Endpoint)
const aiVoiceBooking = async (req, res) => {
  try {
    const { transcript } = req.body;
    
    // Guard against empty or missing transcripts (TC-KRI-001)
    if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Speech transcript is required.' 
      });
    }

    // Simulate NLP Parsing of Transcript
    console.log(`[AI Agent] Received Voice Transcript: "${transcript}"`);
    
    // NLP entity extraction
    let tempoType = 'small';
    if (transcript && typeof transcript === 'string') {
      if (transcript.toLowerCase().includes('large')) tempoType = 'large';
      else if (transcript.toLowerCase().includes('medium')) tempoType = 'medium';
    }
    // Ensure booking is tied to authenticated customer
    const customerId = req.user?.id || req.body.customerId;
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Authentication required: customerId must be provided' });
    }

    const distance = 15.0;
    const emissionRate = tempoType === 'large' ? 350 : (tempoType === 'medium' ? 200 : 120);
    const esgEmissions = parseFloat(((distance * emissionRate) / 1000).toFixed(2));

    let pickupAddress = 'Eminence Hub, Pune';
    let dropAddress = 'Destination (Extracted from Voice)';

    // Deterministic, ReDoS-safe linear parsing for locations from transcript
    if (typeof transcript === 'string') {
      const cleaned = transcript.slice(0, 500).trim();
      const lower = cleaned.toLowerCase();

      let startIdx = -1;
      const markers = [' from ', ' for '];
      for (const marker of markers) {
        const idx = lower.indexOf(marker);
        if (idx !== -1 && (startIdx === -1 || idx < startIdx)) {
          startIdx = idx + marker.length;
        }
      }

      if (startIdx === -1) {
        if (lower.startsWith('from ')) {
          startIdx = 5;
        } else if (lower.startsWith('for ')) {
          startIdx = 4;
        }
      }

      if (startIdx !== -1) {
        const toIdx = lower.indexOf(' to ', startIdx);
        if (toIdx !== -1) {
          const parsedPickup = cleaned.slice(startIdx, toIdx).trim();
          let parsedDrop = cleaned.slice(toIdx + 4).trim();

          // Stop at newline if multiline
          const newlineIdx = parsedDrop.indexOf('\n');
          if (newlineIdx !== -1) {
            parsedDrop = parsedDrop.slice(0, newlineIdx).trim();
          }

          // Strip trailing time keywords
          const timeKeywords = ['tomorrow', 'today', 'morning', 'evening', 'night', 'now', 'afternoon'];
          const dropWords = parsedDrop.split(/\s+/);
          while (dropWords.length > 0) {
            const lastWord = dropWords[dropWords.length - 1].toLowerCase().replace(/[^a-z]/g, '');
            if (timeKeywords.includes(lastWord)) {
              dropWords.pop();
            } else {
              break;
            }
          }
          parsedDrop = dropWords.join(' ').replace(/[.,;]+$/, '').trim();

          if (parsedPickup) pickupAddress = parsedPickup.replace(/[.,;]+$/, '').trim();
          if (parsedDrop) dropAddress = parsedDrop;
        }
      }
    }

    let bookingDate = new Date();
    if (typeof transcript === 'string' && transcript.toLowerCase().includes('tomorrow')) {
      bookingDate.setDate(bookingDate.getDate() + 1);
    }
    const dateStr = bookingDate.toISOString().split('T')[0];

    const mockExtractedData = {
      customerId,
      pickupAddress,
      dropAddress,
      date: dateStr,
      time: '10:00:00',
      goodsType: 'Voice Booking Cargo',
      weight: 100,
      tempoType,
      totalDistance: distance,
      esgEmissions,
      estimatedFare: tempoType === 'large' ? 1200 : (tempoType === 'medium' ? 750 : 500),
      paymentMethod: 'cash',
      status: 'pending'
    };

    const booking = await Booking.create(mockExtractedData);
    
    res.status(201).json({ 
      success: true, 
      message: 'AI successfully parsed voice transcript and created booking.',
      booking 
    });
  } catch (error) {
    console.error('Error in AI Voice Booking:', error);
    res.status(500).json({ success: false, message: 'AI Processing Error' });
  }
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  completeBooking,
  updateBookingStatus,
  aiVoiceBooking
};
