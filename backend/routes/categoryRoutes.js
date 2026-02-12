const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories
} = require('../controllers/categoryController');

// All routes are protected with JWT authentication

// Seed default categories (POST to initialize)
router.post('/seed', authenticateToken, seedDefaultCategories);

// Get all categories
router.get('/', authenticateToken, getCategories);

// Get single category by ID
router.get('/:id', authenticateToken, getCategoryById);

// Create new category
router.post('/', authenticateToken, createCategory);

// Update category
router.put('/:id', authenticateToken, updateCategory);

// Delete category
router.delete('/:id', authenticateToken, deleteCategory);

module.exports = router;