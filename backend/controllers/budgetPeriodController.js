const { pool } = require('../config/database');

// Get all budget periods for user
const getBudgetPeriods = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, amount, start_date, end_date, is_active, created_at, updated_at
       FROM budget_periods
       WHERE user_id = $1
       ORDER BY start_date DESC`,
      [userId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      budgetPeriods: result.rows  // Changed from "data" to "budgetPeriods"
    });
  } catch (error) {
    console.error('Error getting budget periods:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget periods'
    });
  }
};

// Get active budget period
const getActiveBudgetPeriod = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT id, amount, start_date, end_date, is_active, created_at
       FROM budget_periods
       WHERE user_id = $1 AND is_active = true
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        budgetPeriod: null,  // Changed from "data" to "budgetPeriod"
        message: 'No active budget period'
      });
    }

    res.json({
      success: true,
      budgetPeriod: result.rows[0]  // Changed from "data" to "budgetPeriod"
    });
  } catch (error) {
    console.error('Error getting active budget period:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching active budget period'
    });
  }
};

// Create new budget period
const createBudgetPeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, start_date, end_date, is_active } = req.body;

    // Validation
    if (!amount || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Amount, start date, and end date are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // If setting as active, deactivate all other periods
    if (is_active) {
      await pool.query(
        'UPDATE budget_periods SET is_active = false WHERE user_id = $1',
        [userId]
      );
    }

    // Create new budget period
    const result = await pool.query(
      `INSERT INTO budget_periods (user_id, amount, start_date, end_date, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, amount, start_date, end_date, is_active || false]
    );

    res.status(201).json({
      success: true,
      message: 'Budget period created',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating budget period:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating budget period'
    });
  }
};

// Update budget period
const updateBudgetPeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, start_date, end_date } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (startDate >= endDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Build update query dynamically
    let updateFields = [];
    let values = [];
    let paramIndex = 1;

    if (amount) {
      updateFields.push(`amount = $${paramIndex++}`);
      values.push(amount);
    }
    if (start_date) {
      updateFields.push(`start_date = $${paramIndex++}`);
      values.push(start_date);
    }
    if (end_date) {
      updateFields.push(`end_date = $${paramIndex++}`);
      values.push(end_date);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE budget_periods 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget period not found'
      });
    }

    res.json({
      success: true,
      message: 'Budget period updated',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating budget period:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating budget period'
    });
  }
};

// Delete budget period
const deleteBudgetPeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM budget_periods WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget period not found'
      });
    }

    res.json({
      success: true,
      message: 'Budget period deleted',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting budget period:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting budget period'
    });
  }
};

// Set budget period as active
const setActiveBudgetPeriod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Deactivate all periods
    await pool.query(
      'UPDATE budget_periods SET is_active = false WHERE user_id = $1',
      [userId]
    );

    // Activate selected period
    const result = await pool.query(
      `UPDATE budget_periods 
       SET is_active = true, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget period not found'
      });
    }

    res.json({
      success: true,
      message: 'Budget period activated',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error activating budget period:', error);
    res.status(500).json({
      success: false,
      message: 'Error activating budget period'
    });
  }
};

module.exports = {
  getBudgetPeriods,
  getActiveBudgetPeriod,
  createBudgetPeriod,
  updateBudgetPeriod,
  deleteBudgetPeriod,
  setActiveBudgetPeriod
};