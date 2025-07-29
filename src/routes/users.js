// src/routes/users.js
import express from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../db.js';
import {
  generateEmailToken,
  generateInviteToken,
} from '../utils/tokenGenerator.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, phone, password, role, invite_token } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (invite_token) {
      // 🎟️ Completing invite flow
      const invitedUserRes = await pool.query(
        `SELECT * FROM users WHERE email = $1 AND invite_token = $2 AND is_verified = false`,
        [email, invite_token]
      );

      if (invitedUserRes.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid or expired invite token' });
      }

      await pool.query(
        `UPDATE users
         SET name = $1,
             phone = $2,
             password_hash = $3,
             is_verified = true,
             invite_token = NULL
         WHERE email = $4 AND invite_token = $5`,
        [name, phone || null, hashedPassword, email, invite_token]
      );

      return res.status(200).json({
        message: '✅ Account created from invite',
        email
      });
    }

    // 🔐 Normal signup flow
    const existing = await pool.query(`SELECT 1 FROM users WHERE email = $1`, [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const inviteToken = generateInviteToken(email); // optional: could be used for audit trail
    const result = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, is_verified, invite_token)
       VALUES ($1, $2, $3, $4, $5, false, $6)
       RETURNING user_id, name, email, role, is_verified`,
      [name, email, phone || null, hashedPassword, role || 'tenant', inviteToken]
    );

    const verifyToken = generateEmailToken(email);
    await sendVerificationEmail(email, verifyToken);

    return res.status(201).json({
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