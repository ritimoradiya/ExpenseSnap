const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBudgets,
  setBudget,
  updateBudget,
  getBudgetStatus
} = require('../controllers/budgetController');

// All routes require authentication
router.use(auth);

// @route   GET /api/budgets
// @desc    Get all budgets for current month
// @access  Private
router.get('/', getBudgets);

// @route   POST /api/budgets
// @desc    Create or update budget
// @access  Private
router.post('/', setBudget);

// @route   PUT /api/budgets/:id
// @desc    Update budget amount
// @access  Private
router.put('/:id', updateBudget);

// @route   GET /api/budgets/status
// @desc    Get budget status (spending vs budget)
// @access  Private
router.get('/status', getBudgetStatus);

module.exports = router;