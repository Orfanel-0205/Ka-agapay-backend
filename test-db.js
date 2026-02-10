// test-db.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    console.log('Current time:', result[0].current_time);
    
    // Try to query users table
    const users = await sql`SELECT COUNT(*) as count FROM users`;
    console.log('Users table exists. Count:', users[0].count);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();