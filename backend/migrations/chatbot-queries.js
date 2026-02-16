const { pool } = require('../config/database');

async function up() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS chatbot_queries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query_text TEXT NOT NULL,
        response_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX idx_chatbot_user ON chatbot_queries(user_id);
      CREATE INDEX idx_chatbot_created ON chatbot_queries(created_at DESC);
    `);
    console.log('✅ chatbot_queries table created successfully');
  } catch (error) {
    console.error('❌ Error creating chatbot_queries table:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();
  try {
    await client.query('DROP TABLE IF EXISTS chatbot_queries CASCADE');
    console.log('✅ chatbot_queries table dropped');
  } catch (error) {
    console.error('❌ Error dropping chatbot_queries table:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration
up()
  .then(() => {
    console.log('Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

module.exports = { up, down };