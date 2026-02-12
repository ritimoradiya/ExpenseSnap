const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getSpendingByCategory,
  getSpendingOverTime,
  getTopMerchants,
  getMonthlyComparison
} = require('../controllers/analyticsController');

// Analytics endpoints (all require authentication)
router.get('/spending-by-category', authenticateToken, getSpendingByCategory);
router.get('/spending-over-time', authenticateToken, getSpendingOverTime);
router.get('/top-merchants', authenticateToken, getTopMerchants);
router.get('/monthly-comparison', authenticateToken, getMonthlyComparison);

module.exports = router;