// src/routes/units.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// POST /units - create a new unit
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const {
    property_id,
    unit_number,
    bedrooms,
    bathrooms,
    sqft,
    rent_amount,
    is_occupied
  } = req.body;

  if (!property_id || !unit_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO units (
        property_id,
        unit_number,
        bedrooms,
        bathrooms,
        sqft,
        rent_amount,
        is_occupied
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        property_id,
        unit_number,
        bedrooms,
        bathrooms,
        sqft,
        rent_amount,
        is_occupied ?? false
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Unit creation error:', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

export default router;