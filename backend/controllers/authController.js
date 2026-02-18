const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Register new user
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide email, password, and name'
      });
    }

    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING id, email, name, created_at',
      [email, hashedPassword, name]
    );

    const newUser = result.rows[0];

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          created_at: newUser.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ status: 'error', message: 'Error registering user', error: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ status: 'error', message: 'Please provide email and password' });
    }

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: { id: user.id, email: user.email, name: user.name },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Error logging in', error: error.message });
  }
};

// Update profile (name and/or password)
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, currentPassword, newPassword } = req.body;

    if (!name) {
      return res.status(400).json({ status: 'error', message: 'Name is required' });
    }

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ status: 'error', message: 'Current password is required' });
      }

      const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);

      if (!isValid) {
        return res.status(401).json({ status: 'error', message: 'Current password is incorrect' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await pool.query(
        'UPDATE users SET name = $1, password_hash = $2, updated_at = NOW() WHERE id = $3',
        [name, hashedPassword, userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2',
        [name, userId]
      );
    }

    const updated = await pool.query('SELECT id, email, name FROM users WHERE id = $1', [userId]);

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updated.rows[0] },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ status: 'error', message: 'Error updating profile' });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete in order to respect foreign key constraints
    await pool.query('DELETE FROM chatbot_queries WHERE user_id = $1', [userId]);
    // receipts linked via transaction_id, delete via transactions
    await pool.query('DELETE FROM receipts WHERE transaction_id IN (SELECT id FROM transactions WHERE user_id = $1)', [userId]);
    await pool.query('DELETE FROM transactions WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM budgets WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM budget_periods WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM categories WHERE user_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.status(200).json({ status: 'success', message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ status: 'error', message: 'Error deleting account' });
  }
};

module.exports = {
  register,
  login,
  updateProfile,
  deleteAccount,
};