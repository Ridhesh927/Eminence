const { Review, Booking, Driver } = require('../models');
const { fn, col } = require('sequelize');

const createReview = async (req, res) => {
  try {
    const { bookingId, driverId, rating, comment } = req.body;
    
    // Authenticated user ID takes strict precedence
    const customerId = req.user ? req.user.id : req.body.customerId;

    if (!customerId || !driverId || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    let validBookingId = null;
    if (bookingId) {
      try {
        const b = await Booking.findByPk(bookingId);
        if (b) validBookingId = b.id;
      } catch {
        validBookingId = null;
      }
    }

    const review = await Review.create({
      customerId,
      driverId,
      bookingId: validBookingId,
      rating: Number(rating),
      comment
    });

    // Update driver's average rating using SQL aggregate (avoids N+1 in-memory calculation)
    const avgData = await Review.findOne({
      attributes: [[fn('AVG', col('rating')), 'avgRating']],
      where: { driverId },
      raw: true
    });
    const avgRating = avgData && avgData.avgRating ? parseFloat(Number(avgData.avgRating).toFixed(2)) : Number(rating);
    
    await Driver.update({ rating: avgRating }, { where: { id: driverId } });

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getDriverReviews = async (req, res) => {
  try {
    const { driverId } = req.params;
    const reviews = await Review.findAll({ where: { driverId } });
    res.status(200).json({ success: true, reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  createReview,
  getDriverReviews
};
