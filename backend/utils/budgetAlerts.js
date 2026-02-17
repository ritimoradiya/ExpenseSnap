const { pool } = require('../config/database');

/**
 * Check budget status and emit alerts via WebSocket
 * Supports custom budget periods (not just monthly)
 * @param {number} userId - User ID
 * @param {object} io - Socket.io instance
 */
const checkAndEmitBudgetAlerts = async (userId, io) => {
  try {
    // Get active budget period for the user
    const activePeriodQuery = `
      SELECT id, name, amount as total_budget, start_date, end_date
      FROM budget_periods
      WHERE user_id = $1 AND is_active = true
      LIMIT 1
    `;
    const activePeriodResult = await pool.query(activePeriodQuery, [userId]);

    if (activePeriodResult.rows.length === 0) {
      console.log(`No active budget period for user ${userId}`);
      return null;
    }

    const activePeriod = activePeriodResult.rows[0];
    const { id: periodId, name, total_budget, start_date, end_date } = activePeriod;

    // Calculate total spending for this period
    const spendingQuery = `
      SELECT COALESCE(SUM(amount), 0) as total_spent
      FROM transactions
      WHERE user_id = $1 
        AND transaction_date >= $2 
        AND transaction_date <= $3
        AND type = 'expense'
    `;
    const spendingResult = await pool.query(spendingQuery, [userId, start_date, end_date]);
    const totalSpent = parseFloat(spendingResult.rows[0].total_spent);

    // Calculate percentage
    const percentage = (totalSpent / total_budget) * 100;
    const remaining = total_budget - totalSpent;

    console.log(`💰 Budget check for user ${userId}:`);
    console.log(`   Period: ${name}`);
    console.log(`   Budget: $${total_budget}`);
    console.log(`   Spent: $${totalSpent.toFixed(2)}`);
    console.log(`   Percentage: ${percentage.toFixed(1)}%`);

    // Determine alert level
    let alertLevel = null;
    let alertMessage = '';
    let alertColor = '';
    let alertEmoji = '';

    if (percentage >= 100) {
      alertLevel = 'over_budget';
      alertEmoji = '🚨';
      alertMessage = `Budget Exceeded! You've spent $${totalSpent.toFixed(2)} of your $${total_budget} budget for "${name}"`;
      alertColor = '#EF4444'; // Red
    } else if (percentage >= 90) {
      alertLevel = 'critical';
      alertEmoji = '⚠️';
      alertMessage = `Critical! You've used ${percentage.toFixed(0)}% of your "${name}" budget ($${Math.abs(remaining).toFixed(2)} remaining)`;
      alertColor = '#F97316'; // Orange
    } else if (percentage >= 80) {
      alertLevel = 'warning';
      alertEmoji = '⚡';
      alertMessage = `Warning! You've used ${percentage.toFixed(0)}% of your "${name}" budget ($${Math.abs(remaining).toFixed(2)} remaining)`;
      alertColor = '#F59E0B'; // Yellow/Amber
    }

    // Emit alert if threshold crossed
    if (alertLevel && io) {
      const alert = {
        type: 'budgetAlert',
        level: alertLevel,
        emoji: alertEmoji,
        message: alertMessage,
        color: alertColor,
        percentage: parseFloat(percentage.toFixed(1)),
        spent: parseFloat(totalSpent.toFixed(2)),
        budget: total_budget,
        remaining: parseFloat(remaining.toFixed(2)),
        periodName: name,
        periodId: periodId,
        timestamp: new Date().toISOString()
      };

      // Emit to specific user room
      io.to(`user_${userId}`).emit('budgetAlert', alert);
      
      console.log(`🔔 Alert emitted to user ${userId}:`, alertLevel);
      
      return alert;
    } else {
      console.log(`✅ Budget status OK for user ${userId} (${percentage.toFixed(1)}%)`);
      return null;
    }

  } catch (error) {
    console.error('Error checking budget alerts:', error);
    return null;
  }
};

/**
 * LEGACY: Check budget for specific category (monthly)
 * Keep this for backward compatibility with old budget system
 */
const checkBudgetAndAlert = async (userId, categoryId, io) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);

    const budgetResult = await pool.query(
      `SELECT b.id, b.amount as budget_amount, c.name as category_name, c.color
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = $1 AND b.category_id = $2 AND b.month = $3`,
      [userId, categoryId, currentMonth]
    );

    if (budgetResult.rows.length === 0) {
      return null;
    }

    const budget = budgetResult.rows[0];
    const budgetAmount = parseFloat(budget.budget_amount);

    const spendingResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_spent
       FROM transactions
       WHERE user_id = $1 
         AND category_id = $2 
         AND TO_CHAR(transaction_date, 'YYYY-MM') = $3
         AND type = 'expense'`,
      [userId, categoryId, currentMonth]
    );

    const totalSpent = parseFloat(spendingResult.rows[0].total_spent);
    const percentUsed = budgetAmount > 0 ? (totalSpent / budgetAmount) * 100 : 0;
    const remaining = budgetAmount - totalSpent;

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
  checkAndEmitBudgetAlerts,  // NEW: For budget periods
  checkBudgetAndAlert        // OLD: For monthly category budgets (backward compatibility)
};