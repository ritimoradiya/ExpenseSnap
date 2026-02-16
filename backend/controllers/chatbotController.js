const { pool } = require('../config/database');

// Save chat query and response
const saveChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { query_text, response_text } = req.body;

    if (!query_text || !response_text) {
      return res.status(400).json({
        success: false,
        message: 'Query and response text are required'
      });
    }

    const result = await pool.query(
      `INSERT INTO chatbot_queries (user_id, query_text, response_text)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, query_text, response_text]
    );

    res.status(201).json({
      success: true,
      message: 'Chat saved',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error saving chat:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving chat history'
    });
  }
};

// Get chat history for user
const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;

    const result = await pool.query(
      `SELECT id, query_text, response_text, created_at
       FROM chatbot_queries
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching chat history'
    });
  }
};

module.exports = {
  saveChatHistory,
  getChatHistory
};