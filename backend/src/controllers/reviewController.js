const { Review, Booking, Driver } = require('../models');

const createReview = async (req, res) => {
  try {
    const { bookingId, driverId, rating, comment } = req.body;
    
    // Simple mock auth for this example
    const customerId = req.user ? req.user.id : req.body.customerId;

    if (!customerId || !driverId || !rating) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const review = await Review.create({
      customerId,
      driverId,
      bookingId,
      rating,
      comment
    });

    // Update driver's average rating
    const allReviews = await Review.findAll({ where: { driverId } });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    
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
