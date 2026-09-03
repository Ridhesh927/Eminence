const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { apiLimiter } = require('../middleware/rateLimiter');

router.use(apiLimiter);

router.post('/', reviewController.createReview);
router.get('/driver/:driverId', reviewController.getDriverReviews);

module.exports = router;
