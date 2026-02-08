// pages/api/auth/register.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    } = req.body;

    console.log('📝 Registration request:', { firstName, lastName, phone });

    // Validations
    if (!firstName || !lastName || !phone || !pin) {
      return res.status(400).json({ error: 'Kulang ang mga kinakailangang field' });
    }

    if (!/^09\d{9}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    if (pin.length < 4 || pin.length > 6) {
      return res.status(400).json({ error: 'PIN ay dapat 4-6 digits lamang' });
    }

    // Check existing user
    const existingUser = await sql`
      SELECT id FROM users WHERE phone = ${phone}
    `;

    if (existingUser.length > 0) {
      return res.status(409).json({ error: 'Ang phone number ay ginagamit na' });
    }

    // Hash PIN
    const hashedPin = await bcrypt.hash(pin, 10);

    // Insert user
    const result = await sql`
      INSERT INTO users (
        first_name, middle_name, last_name, phone, barangay, 
        birthdate, sex, is_senior_or_pwd, email, pin, created_at
      )
      VALUES (
        ${firstName}, ${middleName || ''}, ${lastName}, ${phone}, ${barangay},
        ${birthdate}, ${sex}, ${isSeniorOrPwd || false}, ${email || phone}, ${hashedPin}, NOW()
      )
      RETURNING id, first_name, last_name, phone, email, barangay
    `;

    const user = result[0];
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    console.log('✅ User created:', user.id);

    return res.status(201).json({
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
    });

  } catch (error: any) {
    console.error('💥 Error:', error);
    return res.status(500).json({
      error: 'May error sa server',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}