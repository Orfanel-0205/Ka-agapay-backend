import type { NextApiRequest, NextApiResponse } from 'next'
import pool from '@/lib/db'
import { hashPassword } from '@/lib/auth'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, name, role } = req.body

  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    const client = await pool.connect()

    // Check if user exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      client.release()
      return res.status(400).json({ error: 'User already exists' })
    }

    // Get role ID
    const roleResult = await client.query(
      'SELECT id FROM roles WHERE name = $1',
      [role]
    )

    if (roleResult.rows.length === 0) {
      client.release()
      return res.status(400).json({ error: 'Invalid role' })
    }

    const roleId = roleResult.rows[0].id
    const passwordHash = await hashPassword(password)

    // Create user
    const result = await client.query(
      'INSERT INTO users (email, password_hash, name, role_id) VALUES ($1, $2, $3, $4) RETURNING id, email, name',
      [email, passwordHash, name, roleId]
    )

    client.release()

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0],
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Registration failed' })
  }
}