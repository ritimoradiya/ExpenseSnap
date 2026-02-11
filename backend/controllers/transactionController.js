
const { pool } = require('../config/database');

// Get all transactions for a user
const getTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get query parameters for filtering
    const { category_id, start_date, end_date, limit = 50 } = req.query;
    
    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 1;
    
    // Add filters if provided
    if (category_id) {
      paramCount++;
      query += ` AND t.category_id = $${paramCount}`;
      queryParams.push(category_id);
    }
    
    if (start_date) {
      paramCount++;
      query += ` AND t.transaction_date >= $${paramCount}`;
      queryParams.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND t.transaction_date <= $${paramCount}`;
      queryParams.push(end_date);
    }
    
    query += ` ORDER BY t.transaction_date DESC, t.created_at DESC LIMIT $${paramCount + 1}`;
    queryParams.push(limit);
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
};

// Get single transaction by ID
const getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT t.*, c.name as category_name, c.color as category_color
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction',
      error: error.message
    });
  }
};

// Create new transaction
const createTransaction = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      category_id,
      amount,
      merchant_name,
      description,
      transaction_date,
      receipt_image_url
    } = req.body;
    
    // Validation
    if (!amount || !merchant_name || !transaction_date) {
      return res.status(400).json({
        success: false,
        message: 'Amount, merchant name, and transaction date are required'
      });
    }
    
    // Verify category belongs to user if provided
    if (category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, userId]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }
    
    const result = await pool.query(
      `INSERT INTO transactions 
       (user_id, category_id, amount, merchant_name, description, transaction_date, receipt_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, category_id, amount, merchant_name, description, transaction_date, receipt_image_url]
    );
    
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating transaction',
      error: error.message
    });
  }
};

// Update transaction
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const {
      category_id,
      amount,
      merchant_name,
      description,
      transaction_date,
      receipt_image_url
    } = req.body;
    
    // Check if transaction exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Verify category if provided
    if (category_id) {
      const categoryCheck = await pool.query(
        'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
        [category_id, userId]
      );
      
      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category'
        });
      }
    }
    
    const result = await pool.query(
      `UPDATE transactions 
       SET category_id = COALESCE($1, category_id),
           amount = COALESCE($2, amount),
           merchant_name = COALESCE($3, merchant_name),
           description = COALESCE($4, description),
           transaction_date = COALESCE($5, transaction_date),
           receipt_image_url = COALESCE($6, receipt_image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [category_id, amount, merchant_name, description, transaction_date, receipt_image_url, id, userId]
    );
    
    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating transaction',
      error: error.message
    });
  }
};

// Delete transaction
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting transaction',
      error: error.message
    });
  }
};

// Get transaction statistics
const getTransactionStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { start_date, end_date } = req.query;
    
    let query = `
      SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_spent,
        COALESCE(AVG(amount), 0) as average_transaction
      FROM transactions
      WHERE user_id = $1
    `;
    
    const queryParams = [userId];
    let paramCount = 1;
    
    if (start_date) {
      paramCount++;
      query += ` AND transaction_date >= $${paramCount}`;
      queryParams.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      query += ` AND transaction_date <= $${paramCount}`;
      queryParams.push(end_date);
    }
    
    const result = await pool.query(query, queryParams);
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching transaction statistics',
      error: error.message
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats
};