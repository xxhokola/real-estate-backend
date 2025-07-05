// src/routes/myProperties.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// GET /my-properties - fetch properties owned by the logged-in user
router.get('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `SELECT * FROM properties WHERE owner_id = $1 ORDER BY address ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch my properties error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

export default router;