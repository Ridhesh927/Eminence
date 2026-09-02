const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// router.use(authMiddleware); // in a real app

router.post('/', reviewController.createReview);
router.get('/driver/:driverId', reviewController.getDriverReviews);

module.exports = router;
