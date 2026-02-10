//app/api/auth/login/route.ts backend
import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

export async function POST(request: NextRequest) {
  try {
    const { phone, pin } = await request.json();

    if (!phone || !pin) {
      return NextResponse.json(
        { error: 'Kulang ang phone at PIN' },
        { status: 400 }
      );
    }

    const users = await sql`
      SELECT id, first_name, last_name, phone, email, barangay, pin
      FROM users WHERE phone = ${phone}
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Mali ang phone number o PIN' },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValid = await bcrypt.compare(pin, user.pin);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Mali ang phone number o PIN' },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return NextResponse.json({
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
      message: 'Matagumpay na nag-login!',
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}