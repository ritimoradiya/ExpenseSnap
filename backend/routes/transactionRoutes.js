const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
} = require('../controllers/transactionController');

// All routes are protected with JWT authentication

// Get all transactions (with optional filters)
router.get('/', authenticateToken, getTransactions);

// Get transaction statistics
router.get('/stats', authenticateToken, getTransactionStats);

// Get single transaction by ID
router.get('/:id', authenticateToken, getTransactionById);

// Create new transaction
router.post('/', authenticateToken, createTransaction);

// Update transaction
router.put('/:id', authenticateToken, updateTransaction);

// Delete transaction
router.delete('/:id', authenticateToken, deleteTransaction);

module.exports = router;