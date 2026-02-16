const { pool } = require('../config/database');

async function createBudgetPeriodsTable() {
  try {
    console.log('Creating budget_periods table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_periods (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount DECIMAL(10, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        is_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_periods_user_id 
      ON budget_periods(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_budget_periods_active 
      ON budget_periods(user_id, is_active) 
      WHERE is_active = true
    `);
    
    console.log('✅ budget_periods table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating budget_periods table:', error);
    process.exit(1);
  }
}

createBudgetPeriodsTable();