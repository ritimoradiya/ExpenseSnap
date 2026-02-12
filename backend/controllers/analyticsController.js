const { pool } = require('../config/database');

// Get spending by category (for pie chart)
const getSpendingByCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;

    let query = `
      SELECT 
        c.name as category,
        c.color,
        c.icon,
        COALESCE(SUM(t.amount), 0) as total_amount,
        COUNT(t.id) as transaction_count
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.user_id = $1
    `;

    const params = [userId];

    // Add date filters if provided
    if (startDate && endDate) {
      query += ` AND t.transaction_date BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    } else if (startDate) {
      query += ` AND t.transaction_date >= $2`;
      params.push(startDate);
    } else if (endDate) {
      query += ` AND t.transaction_date <= $2`;
      params.push(endDate);
    }

    query += `
      WHERE c.user_id = $1
      GROUP BY c.id, c.name, c.color, c.icon
      ORDER BY total_amount DESC
    `;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total_categories: result.rows.length,
      total_spent: result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount), 0)
    });

  } catch (error) {
    console.error('Error in getSpendingByCategory:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spending by category',
      error: error.message
    });
  }
};

// Get spending over time (for line chart)
const getSpendingOverTime = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month', limit = 6 } = req.query;

    let dateFormat;
    if (period === 'day') {
      dateFormat = 'YYYY-MM-DD';
    } else if (period === 'week') {
      dateFormat = 'IYYY-IW'; // ISO week
    } else {
      dateFormat = 'YYYY-MM'; // default to month
    }

    const query = `
      SELECT 
        TO_CHAR(transaction_date, $2) as period,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_amount
      FROM transactions
      WHERE user_id = $1
      GROUP BY TO_CHAR(transaction_date, $2)
      ORDER BY period DESC
      LIMIT $3
    `;

    const result = await pool.query(query, [userId, dateFormat, limit]);

    res.json({
      success: true,
      data: result.rows.reverse(), // Reverse to show oldest first
      period: period,
      data_points: result.rows.length
    });

  } catch (error) {
    console.error('Error in getSpendingOverTime:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching spending over time',
      error: error.message
    });
  }
};

// Get top merchants (for bar chart)
const getTopMerchants = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5, startDate, endDate } = req.query;

    let query = `
      SELECT 
        merchant_name,
        SUM(amount) as total_spent,
        COUNT(*) as transaction_count,
        AVG(amount) as avg_transaction,
        MAX(transaction_date) as last_transaction
      FROM transactions
      WHERE user_id = $1
    `;

    const params = [userId];
    let paramCount = 1;

    // Add date filters if provided
    if (startDate) {
      paramCount++;
      query += ` AND transaction_date >= $${paramCount}`;
      params.push(startDate);
    }
    if (endDate) {
      paramCount++;
      query += ` AND transaction_date <= $${paramCount}`;
      params.push(endDate);
    }

    paramCount++;
    query += `
      GROUP BY merchant_name
      ORDER BY total_spent DESC
      LIMIT $${paramCount}
    `;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      total_merchants: result.rows.length
    });

  } catch (error) {
    console.error('Error in getTopMerchants:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching top merchants',
      error: error.message
    });
  }
};

// Get monthly comparison (this month vs last month)
const getMonthlyComparison = async (req, res) => {
  try {
    const userId = req.user.id;

    const query = `
      WITH monthly_data AS (
        SELECT 
          TO_CHAR(transaction_date, 'YYYY-MM') as month,
          SUM(amount) as total,
          COUNT(*) as count
        FROM transactions
        WHERE user_id = $1
          AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
        GROUP BY TO_CHAR(transaction_date, 'YYYY-MM')
        ORDER BY month DESC
        LIMIT 2
      )
      SELECT 
        month,
        total,
        count,
        CASE 
          WHEN month = TO_CHAR(CURRENT_DATE, 'YYYY-MM') THEN 'current'
          ELSE 'previous'
        END as period_type
      FROM monthly_data
    `;

    const result = await pool.query(query, [userId]);

    const currentMonth = result.rows.find(row => row.period_type === 'current') || { total: 0, count: 0 };
    const previousMonth = result.rows.find(row => row.period_type === 'previous') || { total: 0, count: 0 };

    const difference = parseFloat(currentMonth.total) - parseFloat(previousMonth.total);
    const percentChange = previousMonth.total > 0 
      ? ((difference / parseFloat(previousMonth.total)) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      data: {
        current_month: {
          month: currentMonth.month,
          total: parseFloat(currentMonth.total),
          transaction_count: parseInt(currentMonth.count)
        },
        previous_month: {
          month: previousMonth.month,
          total: parseFloat(previousMonth.total),
          transaction_count: parseInt(previousMonth.count)
        },
        comparison: {
          difference: parseFloat(difference.toFixed(2)),
          percent_change: parseFloat(percentChange),
          trend: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'same'
        }
      }
    });

  } catch (error) {
    console.error('Error in getMonthlyComparison:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching monthly comparison',
      error: error.message
    });
  }
};

module.exports = {
  getSpendingByCategory,
  getSpendingOverTime,
  getTopMerchants,
  getMonthlyComparison
};