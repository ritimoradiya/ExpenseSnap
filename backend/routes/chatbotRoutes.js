const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  saveChatHistory,
  getChatHistory
} = require('../controllers/chatbotController');

// DEBUG: Check what we imported
console.log('🔍 Debugging chatbotRoutes:');
console.log('authenticateToken:', authenticateToken);
console.log('saveChatHistory:', saveChatHistory);
console.log('getChatHistory:', getChatHistory);

// POST /api/chatbot/history - Save chat query/response (with auth)
router.post('/history', authenticateToken, saveChatHistory);

// GET /api/chatbot/history - Get user's chat history (with auth)
router.get('/history', authenticateToken, getChatHistory);

module.exports = router;