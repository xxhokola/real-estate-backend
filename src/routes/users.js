// src/routes/users.js
import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import { generateEmailToken } from '../utils/tokenGenerator.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING user_id, name, email, role, is_verified`,
      [name, email, phone || null, hashedPassword, role, false]
    );

    const token = generateEmailToken(email);
    sendVerificationEmail(email, token);

    res.status(201).json({
      message: '✅ User created. Verification email sent.',
      user: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

export default router;