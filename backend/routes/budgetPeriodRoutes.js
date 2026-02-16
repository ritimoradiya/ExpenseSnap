const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getBudgetPeriods,
  getActiveBudgetPeriod,
  createBudgetPeriod,
  updateBudgetPeriod,
  deleteBudgetPeriod,
  setActiveBudgetPeriod
} = require('../controllers/budgetPeriodController');

// All routes require authentication
router.use(auth);

// @route   GET /api/budget-periods
// @desc    Get all budget periods for user
// @access  Private
router.get('/', getBudgetPeriods);

// @route   GET /api/budget-periods/active
// @desc    Get active budget period
// @access  Private
router.get('/active', getActiveBudgetPeriod);

// @route   POST /api/budget-periods
// @desc    Create new budget period
// @access  Private
router.post('/', createBudgetPeriod);

// @route   PUT /api/budget-periods/:id
// @desc    Update budget period
// @access  Private
router.put('/:id', updateBudgetPeriod);

// @route   DELETE /api/budget-periods/:id
// @desc    Delete budget period
// @access  Private
router.delete('/:id', deleteBudgetPeriod);

// @route   PUT /api/budget-periods/:id/activate
// @desc    Set budget period as active
// @access  Private
router.put('/:id/activate', setActiveBudgetPeriod);

module.exports = router;