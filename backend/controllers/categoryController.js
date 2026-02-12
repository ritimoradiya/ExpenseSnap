const { pool } = require('../config/database');

// Get all categories for a user
const getCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    
    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message
    });
  }
};

// Get single category by ID
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching category',
      error: error.message
    });
  }
};

// Create new category
const createCategory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, color, icon } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }
    
    // Check if category name already exists for this user
    const existingCategory = await pool.query(
      'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, name]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name already exists'
      });
    }
    
    const result = await pool.query(
      'INSERT INTO categories (user_id, name, color, icon) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, name, color || '#3B82F6', icon || '📁']
    );
    
    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { name, color, icon } = req.body;
    
    // Check if category exists and belongs to user
    const checkResult = await pool.query(
      'SELECT id FROM categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    // Check if new name conflicts with existing category
    if (name) {
      const nameCheck = await pool.query(
        'SELECT id FROM categories WHERE user_id = $1 AND LOWER(name) = LOWER($2) AND id != $3',
        [userId, name, id]
      );
      
      if (nameCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Category with this name already exists'
        });
      }
    }
    
    const result = await pool.query(
      `UPDATE categories 
       SET name = COALESCE($1, name),
           color = COALESCE($2, color),
           icon = COALESCE($3, icon)
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, color, icon, id, userId]
    );
    
    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if category has associated transactions
    const transactionCheck = await pool.query(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = $1 AND user_id = $2',
      [id, userId]
    );
    
    if (parseInt(transactionCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with existing transactions. Please reassign or delete transactions first.'
      });
    }
    
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Category deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message
    });
  }
};

// Seed default categories for a user
const seedDefaultCategories = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user already has categories
    const existingCategories = await pool.query(
      'SELECT COUNT(*) as count FROM categories WHERE user_id = $1',
      [userId]
    );
    
    if (parseInt(existingCategories.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already has categories. Use POST /categories to add more.'
      });
    }
    
    const defaultCategories = [
      { name: 'Food & Dining', color: '#EF4444', icon: '🍔' },
      { name: 'Transportation', color: '#3B82F6', icon: '🚗' },
      { name: 'Shopping', color: '#8B5CF6', icon: '🛍️' },
      { name: 'Entertainment', color: '#EC4899', icon: '🎬' },
      { name: 'Bills & Utilities', color: '#F59E0B', icon: '💡' },
      { name: 'Healthcare', color: '#10B981', icon: '⚕️' },
      { name: 'Education', color: '#6366F1', icon: '📚' },
      { name: 'Personal Care', color: '#14B8A6', icon: '💅' },
      { name: 'Travel', color: '#F97316', icon: '✈️' },
      { name: 'Other', color: '#6B7280', icon: '📦' }
    ];
    
    const insertedCategories = [];
    
    for (const category of defaultCategories) {
      const result = await pool.query(
        'INSERT INTO categories (user_id, name, color, icon) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, category.name, category.color, category.icon]
      );
      insertedCategories.push(result.rows[0]);
    }
    
    res.status(201).json({
      success: true,
      message: 'Default categories created successfully',
      count: insertedCategories.length,
      data: insertedCategories
    });
  } catch (error) {
    console.error('Error seeding default categories:', error);
    res.status(500).json({
      success: false,
      message: 'Error seeding default categories',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategories
};