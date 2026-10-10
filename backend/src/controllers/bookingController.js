const { Booking, Customer, Driver, Vehicle, B2BContract } = require('../models');
const { optimizeRoute } = require('../services/routeOptimizer');
const { geocodeAddress } = require('../services/geocoder');
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
    } else if (req.user?.role === 'admin') {
      // If admin is testing the frontend without providing a customerId, pick a fallback demo customer
      const demoCustomer = await Customer.findOne();
      if (demoCustomer) customerId = demoCustomer.id;
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

    // Multi-stop Optimization & Geocoding
    const MAX_DROPS = 100;
    const rawDropsArr = (req.body.drops && Array.isArray(req.body.drops))
      ? req.body.drops
      : (req.body.dropAddress ? req.body.dropAddress.split(' → ') : []);
    const dropsArr = Array.isArray(rawDropsArr) ? rawDropsArr.slice(0, MAX_DROPS) : [];
    
    if (dropsArr.length > 0 || req.body.pickupAddress) {
      // 1. Geocode Pickup
      const pickupGeo = await geocodeAddress(req.body.pickupAddress || 'Pune, India');
      const baseLat = pickupGeo ? pickupGeo.lat : 18.5204;
      const baseLng = pickupGeo ? pickupGeo.lng : 73.8567;
      
      bookingData.pickupLat = baseLat;
      bookingData.pickupLng = baseLng;

      // 2. Geocode Drops
      const waypoints = [];
      for (let idx = 0; idx < dropsArr.length; idx++) {
        const address = dropsArr[idx];
        const geo = await geocodeAddress(address);
        
        waypoints.push({
          id: `stop_${idx}`,
          address,
          lat: geo ? geo.lat : baseLat + ((idx + 1) * 0.015),
          lng: geo ? geo.lng : baseLng + ((idx + 1) * 0.012)
        });
      }
      
      if (waypoints.length > 0) {
        const optimized = await optimizeRoute(
          { lat: baseLat, lng: baseLng }, // starting point
          waypoints
        );
        
        bookingData.stops = optimized;
        // Keep the first drop as dropAddress for legacy compatibility
        bookingData.dropAddress = req.body.dropAddress || dropsArr[0];

        // Update total distance based on real OSRM routing
        let newDist = 0;
        optimized.forEach(s => newDist += (s.legDistance || 0));
        if (newDist > 0) {
          bookingData.totalDistance = newDist;
        }
      }
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
    // Incorporate real GPS location from driver app (IoT simulation)
    const { lat, lng } = req.body;
    const bookingDataStr = JSON.stringify({
      id: booking.id,
      customerId: booking.customerId,
      driverId: booking.driverId,
      status: booking.status,
      timestamp: new Date().toISOString(),
      gps_lat: lat || booking.dropLat || 'Unknown',
      gps_lng: lng || booking.dropLng || 'Unknown',
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

    // Use Groq NLP Parsing of Transcript
    console.log(`[AI Agent] Received Voice Transcript: "${transcript}"`);
    
    // Ensure booking is tied to authenticated customer
    const customerId = req.user?.id || req.body.customerId;
    if (!customerId) {
      return res.status(401).json({ success: false, message: 'Authentication required: customerId must be provided' });
    }

    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a logistics booking assistant. Extract the booking details from this user request: "${transcript}".
Return exactly a raw JSON object (and nothing else) with these keys: 
- pickupAddress (string)
- dropAddress (string)
- tempoType (string, one of: 'small', 'medium', 'large')
- date (string, YYYY-MM-DD format, assume today is ${today} unless specified like tomorrow)
- time (string, HH:mm:ss format, e.g. "10:00:00", guess 10:00:00 if not specified)
- goodsType (string, default to 'General Cargo' if unknown)
- weight (number, default to 100 if unknown)
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama3-8b-8192',
      temperature: 0,
      response_format: { type: 'json_object' }
    });

    let extractedData;
    try {
      extractedData = JSON.parse(chatCompletion.choices[0].message.content);
    } catch (err) {
      console.error('JSON Parse Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to parse AI response' });
    }

    const tempoType = extractedData.tempoType || 'small';
    const emissionRate = tempoType === 'large' ? 350 : (tempoType === 'medium' ? 200 : 120);

    let pickupLat = 18.5204, pickupLng = 73.8567; // Fallback Pune
    let dropLat = 18.5204, dropLng = 73.8567; // Fallback Pune
    
    try {
      if (extractedData.pickupAddress) {
        const pRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(extractedData.pickupAddress)}`);
        const pData = await pRes.json();
        if (pData && pData.length > 0) { pickupLat = parseFloat(pData[0].lat); pickupLng = parseFloat(pData[0].lon); }
      }
      if (extractedData.dropAddress) {
        const dRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(extractedData.dropAddress)}`);
        const dData = await dRes.json();
        if (dData && dData.length > 0) { dropLat = parseFloat(dData[0].lat); dropLng = parseFloat(dData[0].lon); }
      }
    } catch (e) {
      console.warn('Geocoding failed for voice booking:', e.message);
    }

    // Calculate real distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = (dropLat - pickupLat) * (Math.PI / 180);
    const dLng = (dropLng - pickupLng) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickupLat * (Math.PI / 180)) * Math.cos(dropLat * (Math.PI / 180)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    let distance = R * c;
    
    // If coordinates are identical or fallback failed, use minimum distance 5km
    if (distance < 1) distance = 5.0;

    const esgEmissions = parseFloat(((distance * emissionRate) / 1000).toFixed(2));
    
    // Dynamic Fare Calculation (Base Fare + Per KM rate)
    let estimatedFare = 0;
    if (tempoType === 'large') {
      estimatedFare = 800 + (distance * 50); // 800 base + 50/km
    } else if (tempoType === 'medium') {
      estimatedFare = 500 + (distance * 35); // 500 base + 35/km
    } else {
      estimatedFare = 300 + (distance * 20); // 300 base + 20/km
    }
    estimatedFare = Math.round(estimatedFare);

    const finalBookingData = {
      customerId,
      pickupAddress: extractedData.pickupAddress || 'Unknown Pickup',
      dropAddress: extractedData.dropAddress || 'Unknown Drop',
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      date: extractedData.date,
      time: extractedData.time,
      goodsType: extractedData.goodsType,
      weight: extractedData.weight,
      tempoType,
      totalDistance: parseFloat(distance.toFixed(2)),
      esgEmissions,
      estimatedFare,
      paymentMethod: 'cash',
      status: 'pending'
    };

    const booking = await Booking.create(finalBookingData);
    
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
