// Import required packages
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { pool, testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const budgetRoutes = require('./routes/budgetRoutes');

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
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to ExpenseSnap API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      database: '/api/health/database',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      transactions: {
        list: 'GET /api/transactions',
        create: 'POST /api/transactions',
        get: 'GET /api/transactions/:id',
        update: 'PUT /api/transactions/:id',
        delete: 'DELETE /api/transactions/:id',
        stats: 'GET /api/transactions/stats'
      },
      categories: {
        list: 'GET /api/categories',
        seed: 'POST /api/categories/seed',
        create: 'POST /api/categories',
        get: 'GET /api/categories/:id',
        update: 'PUT /api/categories/:id',
        delete: 'DELETE /api/categories/:id'
      },
      budgets: {
        list: 'GET /api/budgets',
        create: 'POST /api/budgets',
        update: 'PUT /api/budgets/:id',
        status: 'GET /api/budgets/status'
      }
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