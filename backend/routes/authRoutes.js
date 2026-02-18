const express = require('express');
const router = express.Router();
const { register, login, updateProfile, deleteAccount } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

// Register route
router.post('/register', register);

// Login route
router.post('/login', login);

// Get current user (protected)
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user.id,
      email: req.user.email
    }
  });
});

// Update profile (protected)
router.put('/profile', authenticateToken, updateProfile);

// Delete account (protected)
router.delete('/account', authenticateToken, deleteAccount);

module.exports = router;