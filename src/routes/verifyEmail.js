import express from 'express';
import { pool } from '../db.js';
import { verifyEmailToken } from '../utils/tokenGenerator.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    const decoded = verifyEmailToken(token);
    const email = decoded.email;

    const result = await pool.query(
      `UPDATE users SET is_verified = TRUE WHERE email = $1 RETURNING *`,
      [email]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: '✅ Email verified!' });
  } catch (err) {
    console.error('Email verification failed:', err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;