const { pool } = require('../config/database');

async function addCurrencyColumn() {
  try {
    console.log('Adding currency column to transactions table...');
    
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD'
    `);
    
    console.log('✅ Currency column added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding currency column:', error);
    process.exit(1);
  }
}

addCurrencyColumn();