// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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

    console.log('📝 Registration request received:', { firstName, lastName, phone });

    // Validate required fields
    if (!firstName || !lastName || !phone || !pin) {
      console.error('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Kulang ang mga kinakailangang field' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate PIN
    if (pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN ay dapat 4-6 digits lamang' },
        { status: 400 }
      );
    }

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const existingUser = await sql`
      SELECT id FROM users 
      WHERE phone = ${phone}
    `;

    if (existingUser.length > 0) {
      console.error('❌ User already exists');
      return NextResponse.json(
        { error: 'Ang phone number ay ginagamit na' },
        { status: 409 }
      );
    }

    // Hash PIN
    console.log('🔐 Hashing PIN...');
    const hashedPin = await bcrypt.hash(pin, 10);

    // Insert user
    console.log('💾 Creating user...');
    const result = await sql`
      INSERT INTO users (
        first_name,
        middle_name,
        last_name,
        phone,
        barangay,
        birthdate,
        sex,
        is_senior_or_pwd,
        email,
        pin,
        created_at
      )
      VALUES (
        ${firstName},
        ${middleName || ''},
        ${lastName},
        ${phone},
        ${barangay},
        ${birthdate},
        ${sex},
        ${isSeniorOrPwd || false},
        ${email || phone},
        ${hashedPin},
        NOW()
      )
      RETURNING id, first_name, last_name, phone, email, barangay
    `;

    const user = result[0];
    console.log('✅ User created successfully:', user.id);

    // Generate token (use proper JWT in production)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    return NextResponse.json(
      {
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
        message: 'Matagumpay na narehistro',
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('💥 Registration error:', error);
    return NextResponse.json(
      {
        error: 'May error sa server',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}