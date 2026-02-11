const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Get current user (PROTECTED ROUTE)
router.get('/me', authenticateToken, (req, res) => {
  // req.user is available because of the middleware
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

module.exports = router;