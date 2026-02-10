// test-db.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

// test-db.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.development.local' });

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...\n');
    
    if (!process.env.DATABASE_URL) {
      console.log('❌ DATABASE_URL not found in .env.development.local');
      return;
    }
    
    console.log('✅ DATABASE_URL found');
    
    const sql = neon(process.env.DATABASE_URL);
    
    // Test connection
    const result = await sql`SELECT NOW() as current_time`;
    console.log('✅ Connection successful!');
    console.log('📅 Current time:', result[0].current_time);
    console.log('');
    
    // Check if users table exists
    console.log('🔍 Checking for users table...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as table_exists
    `;
    
    if (tableCheck[0].table_exists) {
      console.log('✅ Users table exists!');
      const users = await sql`SELECT COUNT(*) as count FROM users`;
      console.log('👥 Number of users:', users[0].count);
    } else {
      console.log('❌ Users table does NOT exist!');
      console.log('');
      console.log('👉 Go to Neon SQL Editor and create the table:');
      console.log('   https://console.neon.tech');
    }
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
  }
}

testConnection();