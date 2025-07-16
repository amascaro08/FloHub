import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/neon';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  try {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (rows.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query('INSERT INTO users (name, email, password) VALUES ($1, $2, $3)', [
      name,
      email,
      hashedPassword,
    ]);

    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}