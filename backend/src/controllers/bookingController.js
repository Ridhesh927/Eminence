const { Booking, Customer, Driver, Vehicle } = require('../models');
const { optimizeRoute } = require('../services/routeOptimizer');
const { findPoolMatch } = require('../services/poolingEngine');
const crypto = require('crypto');

// Get all bookings
const getAllBookings = async (_req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        { model: Customer, as: 'customer', attributes: ['id', 'name', 'phone'] },
        { model: Driver, as: 'driver', attributes: ['id', 'name', 'phone', 'licenseNumber'] },
        { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type'] }
      ]
    });
    res.status(200).json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Create a booking
const createBooking = async (req, res) => {
  try {
    const customerId = req.user?.id || req.body.customerId;
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
      // Create mock waypoint objects from addresses
      const waypoints = req.body.drops.map((address, idx) => ({
        id: `stop_${idx}`,
        address,
        // Adding dummy lat/lng just to pass into the TSP
        lat: 18.5 + (Math.random() * 0.1),
        lng: 73.8 + (Math.random() * 0.1)
      }));
      
      const optimized = optimizeRoute(
        { lat: 18.5204, lng: 73.8567 }, // mock starting point
        waypoints
      );
      
      bookingData.stops = optimized;
      // We still keep the first drop as dropAddress for legacy compatibility
      bookingData.dropAddress = req.body.drops[0];
    }

    const customer = await Customer.findByPk(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.isBusiness) {
      bookingData.isB2B = true;
      // GST Calculation (Assuming 18% for B2B)
      bookingData.gstAmount = bookingData.estimatedFare * 0.18;
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
    const availableDrivers = await Driver.count({ where: { isAvailable: true } });
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

// AI Voice Agent Simulation (NLP Endpoint)
const aiVoiceBooking = async (req, res) => {
  try {
    const { transcript } = req.body;
    
    // Simulate NLP Parsing of Transcript
    console.log(`[AI Agent] Received Voice Transcript: "${transcript}"`);
    
    // Naive NLP entity extraction for demo purposes
    let tempoType = 'small';
    if (transcript.toLowerCase().includes('large')) tempoType = 'large';
    if (transcript.toLowerCase().includes('medium')) tempoType = 'medium';

    const mockExtractedData = {
      pickupAddress: 'Eminence Hub, Pune', // Mock extracted
      dropAddress: 'Destination (Extracted from Voice)',
      date: new Date().toISOString().split('T')[0],
      time: '10:00:00',
      goodsType: 'Voice Booking Cargo',
      weight: 100,
      tempoType,
      estimatedFare: tempoType === 'large' ? 1200 : 500,
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
  createBooking,
  completeBooking,
  aiVoiceBooking
};
