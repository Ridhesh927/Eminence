const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { apiLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/', apiLimiter, authMiddleware, reviewController.createReview);
router.get('/driver/:driverId', apiLimiter, reviewController.getDriverReviews);

module.exports = router;
