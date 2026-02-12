const { pool } = require('../config/database');

/**
 * Check budget status after a transaction and send alert if needed
 * @param {number} userId - User ID
 * @param {number} categoryId - Category ID
 * @param {object} io - Socket.io instance
 */
const checkBudgetAndAlert = async (userId, categoryId, io) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Get budget for this category and month
    const budgetResult = await pool.query(
      `SELECT b.id, b.amount as budget_amount, c.name as category_name, c.color
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.category_id = $2 AND b.month = $3`,
      [userId, categoryId, currentMonth]
    );

    // If no budget set for this category, return
    if (budgetResult.rows.length === 0) {
      return null;
    }

    const budget = budgetResult.rows[0];
    const budgetAmount = parseFloat(budget.budget_amount);

    // Calculate total spending for this category this month
    const spendingResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_spent
       FROM transactions
       WHERE user_id = $1 
         AND category_id = $2 
         AND TO_CHAR(transaction_date, 'YYYY-MM') = $3`,
      [userId, categoryId, currentMonth]
    );

    const totalSpent = parseFloat(spendingResult.rows[0].total_spent);
    const percentUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;
    const remaining = budgetAmount - totalSpent;

    // Determine alert level
    let alertLevel = null;
    let message = null;

    if (percentUsed >= 100) {
      alertLevel = 'over';
      message = `You're over budget in ${budget.category_name} by $${Math.abs(remaining).toFixed(2)}`;
    } else if (percentUsed >= 90) {
      alertLevel = 'critical';
      message = `Critical: You've used ${Math.round(percentUsed)}% of your ${budget.category_name} budget ($${remaining.toFixed(2)} remaining)`;
    } else if (percentUsed >= 80) {
      alertLevel = 'warning';
      message = `Warning: You've used ${Math.round(percentUsed)}% of your ${budget.category_name} budget ($${remaining.toFixed(2)} remaining)`;
    }

    // Send alert if threshold reached
    if (alertLevel && io) {
      const alertData = {
        type: 'budget_alert',
        level: alertLevel,
        message: message,
        category: budget.category_name,
        categoryColor: budget.color,
        budgetAmount: budgetAmount,
        spentAmount: totalSpent,
        remaining: remaining,
        percentUsed: Math.round(percentUsed),
        timestamp: new Date().toISOString()
      };

      // Emit to specific user's room
      io.to(`user_${userId}`).emit('budget_alert', alertData);

      console.log(`🚨 Budget alert sent to user ${userId}:`, alertData.message);

      return alertData;
    }

    return null;
  } catch (error) {
    console.error('Error checking budget:', error);
    return null;
  }
};

module.exports = {
  checkBudgetAndAlert
};