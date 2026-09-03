const { Booking, Customer, Driver, Vehicle } = require('../models');
const { optimizeRoute } = require('../services/routeOptimizer');
const { findPoolMatch } = require('../services/poolingEngine');

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

    const booking = await Booking.create(bookingData);
    res.status(201).json({ success: true, booking, pooled: !!bookingData.poolMatchId });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllBookings,
  createBooking
};
