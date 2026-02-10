// pages/api/auth/register.ts backend
import type { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@/lib/db';
import { hashPassword, generateToken } from '@/lib/auth';

interface RegisterRequest {
  firstName: string;
  middleName?: string;
  lastName: string;
  phone: string;
  barangay: string;
  birthdate: string;
  sex: 'male' | 'female' | 'other';
  isSeniorOrPwd?: boolean;
  email?: string;
  pin: string;
}

interface User {
  id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  phone: string;
  email: string;
  barangay: string;
  pin: string;
}

interface ApiResponse {
  data?: {
    token: string;
    user: {
      id: number;
      firstName: string;
      lastName: string;
      phone: string;
      email: string;
      barangay: string;
    };
  };
  message?: string;
  error?: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed. Only POST is supported.' 
    });
  }

  try {
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
    }: RegisterRequest = req.body;

    console.log('📝 Registration request:', { firstName, lastName, phone });

    // ============================================
    // VALIDATION
    // ============================================

    if (!firstName || !lastName || !phone || !pin) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        error: 'Kulang ang mga kinakailangang field: firstName, lastName, phone, pin',
      });
    }

    // Validate phone format (09XXXXXXXXX)
    if (!/^09\d{9}$/.test(phone)) {
      console.error('❌ Invalid phone format:', phone);
      return res.status(400).json({
        error: 'Invalid phone number. Dapat 09XXXXXXXXX (11 digits)',
      });
    }

    // Validate PIN (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      console.error('❌ Invalid PIN format');
      return res.status(400).json({
        error: 'PIN ay dapat 4-6 digits lamang',
      });
    }

    // ============================================
    // CHECK IF USER EXISTS
    // ============================================

    console.log('🔍 Checking if user exists...');
    
    const existingUser = await sql<User[]>`
      SELECT id, phone 
      FROM users 
      WHERE phone = ${phone}
    `;

    if (existingUser.length > 0) {
      console.error('❌ User exists with phone:', phone);
      return res.status(409).json({
        error: 'Ang phone number na ito ay ginagamit na. Mag-login na lamang.',
      });
    }

    // ============================================
    // HASH PIN
    // ============================================

    console.log('🔐 Hashing PIN...');
    const hashedPin = await hashPassword(pin);

    // ============================================
    // INSERT USER
    // ============================================

    console.log('💾 Creating user...');
    
    const result = await sql<User[]>`
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
        created_at,
        updated_at
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
      RETURNING 
        id, 
        first_name, 
        last_name, 
        phone, 
        email, 
        barangay
    `;

    if (result.length === 0) {
      throw new Error('Failed to create user');
    }

    const newUser = result[0];
    console.log('✅ User created with ID:', newUser.id);

    // ============================================
    // GENERATE TOKEN
    // ============================================

    const token = generateToken({
      userId: newUser.id,
      phone: newUser.phone,
    });

    // ============================================
    // RETURN SUCCESS
    // ============================================

    return res.status(201).json({
      data: {
        token,
        user: {
          id: newUser.id,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          phone: newUser.phone,
          email: newUser.email,
          barangay: newUser.barangay,
        },
      },
      message: 'Matagumpay na narehistro!',
    });

  } catch (error: any) {
    console.error('💥 Registration error:', error);
    
    // Unique constraint violation
    if (error.code === '23505') {
      return res.status(409).json({
        error: 'Ang phone number ay ginagamit na',
      });
    }

    return res.status(500).json({
      error: 'May error sa server. Subukan muli mamaya.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}