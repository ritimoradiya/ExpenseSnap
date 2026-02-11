// Import required packages
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'ExpenseSnap API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Database health check endpoint
app.get('/api/health/database', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    res.status(200).json({
      status: 'success',
      message: 'Database connection is healthy',
      database: {
        time: result.rows[0].time,
        version: result.rows[0].version
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ExpenseSnap API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      database: '/api/health/database',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      transactions: 'GET /api/transactions',
      createTransaction: 'POST /api/transactions',
      updateTransaction: 'PUT /api/transactions/:id',
      deleteTransaction: 'DELETE /api/transactions/:id',
      transactionStats: 'GET /api/transactions/stats'
    }
  });
});

// Start server
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection first
    await testConnection();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();