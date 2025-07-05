// src/routes/auth.js
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

const router = express.Router();

// Simple in-memory login attempt tracker
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const BLOCK_TIME_MS = 10 * 60 * 1000; // 10 minutes

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const ip = req.ip;
  const now = Date.now();
  const attempt = loginAttempts.get(ip) || { count: 0, lastTry: now };

  if (attempt.count >= MAX_ATTEMPTS && now - attempt.lastTry < BLOCK_TIME_MS) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  try {
    const userRes = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (userRes.rowCount === 0) {
      loginAttempts.set(ip, { count: attempt.count + 1, lastTry: now });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userRes.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      loginAttempts.set(ip, { count: attempt.count + 1, lastTry: now });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Email not verified. Please check your inbox.' });
    }

    loginAttempts.delete(ip); // ✅ Reset on success

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;