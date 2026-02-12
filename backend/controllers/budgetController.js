const {pool} = require('../config/database');

// Get all budgets for current user (current month)
const getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: "2026-02"

    const result = await pool.query(
      `SELECT b.id, b.amount, b.month, b.created_at,
              c.id as category_id, c.name as category_name, c.color, c.icon
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.month = $2
       ORDER BY c.name`,
      [userId, currentMonth]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting budgets:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budgets'
    });
  }
};

// Create or update budget
const setBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { category_id, amount, month } = req.body;

    // Validation
    if (!category_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Category ID and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Use current month if not provided
    const budgetMonth = month || new Date().toISOString().slice(0, 7);

    // Verify category belongs to user
    const categoryCheck = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [category_id, userId]
    );

    if (categoryCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if budget already exists for this category and month
    const existingBudget = await pool.query(
      'SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3',
      [userId, category_id, budgetMonth]
    );

    let result;
    if (existingBudget.rows.length > 0) {
      // Update existing budget
      result = await pool.query(
        `UPDATE budgets 
         SET amount = $1 
         WHERE id = $2 
         RETURNING *`,
        [amount, existingBudget.rows[0].id]
      );
    } else {
      // Create new budget
      result = await pool.query(
        `INSERT INTO budgets (user_id, category_id, amount, month)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, category_id, amount, budgetMonth]
      );
    }

    res.status(existingBudget.rows.length > 0 ? 200 : 201).json({
      success: true,
      message: existingBudget.rows.length > 0 ? 'Budget updated' : 'Budget created',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error setting budget:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting budget'
    });
  }
};

// Update budget
const updateBudget = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const result = await pool.query(
      'UPDATE budgets SET amount = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [amount, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    res.json({
      success: true,
      message: 'Budget updated',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating budget:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating budget'
    });
  }
};

// Get budget status (spending vs budget)
const getBudgetStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get all budgets with spending
    const result = await pool.query(
      `SELECT 
         b.id,
         b.amount as budget_amount,
         b.month,
         c.id as category_id,
         c.name as category_name,
         c.color,
         COALESCE(SUM(t.amount), 0) as spent_amount
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       LEFT JOIN transactions t ON t.category_id = c.id 
         AND t.user_id = $1 
         AND TO_CHAR(t.transaction_date, 'YYYY-MM') = $2
       WHERE b.user_id = $1 AND b.month = $2
       GROUP BY b.id, b.amount, b.month, c.id, c.name, c.color
       ORDER BY c.name`,
      [userId, currentMonth]
    );

    // Calculate status for each budget
    const budgetStatus = result.rows.map(budget => {
      const spentAmount = parseFloat(budget.spent_amount);
      const budgetAmount = parseFloat(budget.budget_amount);
      const percentUsed = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      const remaining = budgetAmount - spentAmount;

      return {
        id: budget.id,
        category_id: budget.category_id,
        category_name: budget.category_name,
        color: budget.color,
        budget_amount: budgetAmount,
        spent_amount: spentAmount,
        remaining: remaining,
        percent_used: Math.round(percentUsed),
        status: percentUsed >= 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'ok'
      };
    });

    res.json({
      success: true,
      month: currentMonth,
      data: budgetStatus
    });
  } catch (error) {
    console.error('Error getting budget status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching budget status'
    });
  }
};

module.exports = {
  getBudgets,
  setBudget,
  updateBudget,
  getBudgetStatus
};