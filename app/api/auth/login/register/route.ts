// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Initialize database connection
const getDatabaseConnection = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not configured');
  }
  return neon(process.env.DATABASE_URL);
};

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-CHANGE-IN-PRODUCTION';

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  console.log('📥 Registration request received');
  
  try {
    // Parse request body
    const body = await request.json();
    console.log('📝 Request data received');
    
    const {
      firstName,
      middleName,
      lastName,
      phone,
      barangay,
      birthdate,
      sex,
      isSeniorOrPwd,
      email,
      pin,
    } = body;

    // Validation
    if (!firstName || !lastName || !phone || !pin) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Kulang ang mga kinakailangang field: firstName, lastName, phone, pin' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate phone format
    if (!/^09\d{9}$/.test(phone)) {
      console.log('❌ Invalid phone format');
      return NextResponse.json(
        { error: 'Invalid phone number. Dapat 09XXXXXXXXX (11 digits)' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate PIN
    if (!/^\d{4,6}$/.test(pin)) {
      console.log('❌ Invalid PIN format');
      return NextResponse.json(
        { error: 'PIN ay dapat 4-6 digits lamang' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Connect to database
    console.log('🔌 Connecting to database...');
    const sql = getDatabaseConnection();

    // Test connection
    await sql`SELECT NOW()`;
    console.log('✅ Database connected');

    // Check if user exists
    console.log('🔍 Checking if phone exists...');
    const existing = await sql`
      SELECT id FROM users WHERE phone = ${phone}
    `;

    if (existing.length > 0) {
      console.log('❌ Phone already registered');
      return NextResponse.json(
        { error: 'Ang phone number ay ginagamit na. Mag-login na lamang.' },
        { status: 409, headers: corsHeaders() }
      );
    }

    // Hash PIN
    console.log('🔐 Hashing PIN...');
    const hashedPin = await bcrypt.hash(pin, 10);

    // Insert user
    console.log('💾 Creating user...');
    const result = await sql`
      INSERT INTO users (
        first_name, middle_name, last_name, phone, barangay,
        birthdate, sex, is_senior_or_pwd, email, pin,
        created_at, updated_at
      )
      VALUES (
        ${firstName},
        ${middleName || ''},
        ${lastName},
        ${phone},
        ${barangay || ''},
        ${birthdate || null},
        ${sex || 'other'},
        ${isSeniorOrPwd || false},
        ${email || phone},
        ${hashedPin},
        NOW(),
        NOW()
      )
      RETURNING id, first_name, last_name, phone, email, barangay
    `;

    if (result.length === 0) {
      throw new Error('Failed to create user');
    }

    const user = result[0];
    console.log('✅ User created with ID:', user.id);

    // Generate JWT token
    console.log('🎫 Generating token...');
    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Success response
    const responseData = {
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          email: user.email,
          barangay: user.barangay,
        },
      },
      message: 'Matagumpay na narehistro!',
    };

    console.log('✅ Registration successful');
    return NextResponse.json(responseData, {
      status: 201,
      headers: corsHeaders(),
    });

  } catch (error: any) {
    console.error('💥 Registration error:', error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Ang phone number ay ginagamit na' },
        { status: 409, headers: corsHeaders() }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: 'May error sa server. Subukan muli mamaya.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}