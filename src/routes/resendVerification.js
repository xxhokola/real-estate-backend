import express from 'express';
import { pool } from '../db.js';
import { generateEmailToken } from '../utils/tokenGenerator.js';
import { sendVerificationEmail } from '../services/emailService.js';

const router = express.Router();
const MAX_RESENDS = 3;
const WINDOW_MINUTES = 10;

router.post('/', async (req, res) => {
  const { email } = req.body;
  const ip = req.ip;

  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    // Check for too many resend attempts in time window
    const limitCheck = await pool.query(
      `SELECT COUNT(*) FROM resend_attempts
       WHERE email = $1 AND ip_address = $2 AND attempted_at > NOW() - INTERVAL '${WINDOW_MINUTES} minutes'`,
      [email, ip]
    );

    if (parseInt(limitCheck.rows[0].count) >= MAX_RESENDS) {
      return res.status(429).json({ error: 'Too many resend attempts. Please wait and try again.' });
    }

    // Check user exists and not already verified
    const userRes = await pool.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];

    if (user.is_verified) {
      return res.status(400).json({ error: 'User is already verified' });
    }

    // Record resend attempt
    await pool.query(
      `INSERT INTO resend_attempts (email, ip_address) VALUES ($1, $2)`,
      [email, ip]
    );

    const token = generateEmailToken(email);
    sendVerificationEmail(email, token);

    res.json({ message: '✅ Verification email resent. Check your inbox.' });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Unable to resend verification' });
  }
});

export default router;