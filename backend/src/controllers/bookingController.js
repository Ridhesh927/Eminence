const { Booking, Customer, Driver, Vehicle } = require('../models');

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

    const booking = await Booking.create(bookingData);
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getAllBookings,
  createBooking
};
