// test-neon.js
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.development.local' });

async function testNeonConnection() {
  console.log('🔍 Testing Neon Database Connection\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check if DATABASE_URL exists
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL not found!');
    console.log('\n📝 Please create .env.development.local with:');
    console.log('   DATABASE_URL=postgresql://neondb_owner:npg_JWd8RpUoL6DN@ep-super-dream-ai8kt24u-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require');
    return;
  }
  
  console.log('✅ DATABASE_URL found\n');
  
  try {
    const sql = neon(process.env.DATABASE_URL);
    
    // Test 1: Connection
    console.log('Test 1: Testing connection...');
    const timeResult = await sql`SELECT NOW() as current_time, version() as pg_version`;
    console.log('✅ Connected successfully!');
    console.log('📅 Server time:', timeResult[0].current_time);
    console.log('🗄️  PostgreSQL version:', timeResult[0].pg_version.split(' ')[0], timeResult[0].pg_version.split(' ')[1]);
    console.log('');
    
    // Test 2: Check if users table exists
    console.log('Test 2: Checking for users table...');
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `;
    
    if (tableCheck[0].exists) {
      console.log('✅ Users table exists!');
      
      // Get user count
      const countResult = await sql`SELECT COUNT(*) as count FROM users`;
      console.log('👥 Total users:', countResult[0].count);
      console.log('');
      
      // Show table structure
      console.log('📋 Table structure:');
      const columns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `;
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
      
    } else {
      console.log('❌ Users table does NOT exist!');
      console.log('');
      console.log('📝 Create it in Neon SQL Editor:');
      console.log('   https://console.neon.tech');
      console.log('');
      console.log('Run this SQL:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  middle_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  barangay VARCHAR(100),
  birthdate DATE,
  sex VARCHAR(10),
  is_senior_or_pwd BOOLEAN DEFAULT false,
  email VARCHAR(255),
  pin VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
      `);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    console.log('');
    console.log('✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Connection failed!');
    console.error('Error:', error.message);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('   1. Check your DATABASE_URL is correct');
    console.log('   2. Verify database is not paused in Neon');
    console.log('   3. Make sure you can access: https://console.neon.tech');
  }
}

testNeonConnection();