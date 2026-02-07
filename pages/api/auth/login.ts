import type { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/lib/db'
import { verifyPassword, createToken } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    const client = await pool.connect()

    // Find user
    const result = await client.query(
      'SELECT u.id, u.email, u.name, u.password_hash, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      client.release()
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const user = result.rows[0]

    // Verify password
    const passwordMatch = await verifyPassword(password, user.password_hash)

    if (!passwordMatch) {
      client.release()
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    client.release()

    // Create token
    const token = createToken(user.id, user.role)

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Login failed' })
  }
}