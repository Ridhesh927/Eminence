const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { apiLimiter } = require('../middleware/rateLimiter');
const authMiddleware = require('../middleware/authMiddleware');

router.use(apiLimiter);

router.post('/', authMiddleware, reviewController.createReview);
router.get('/driver/:driverId', reviewController.getDriverReviews);

module.exports = router;
