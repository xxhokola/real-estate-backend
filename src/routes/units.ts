import express from 'express';
import { pool } from '../db';

const router = express.Router();

router.post('/', async (req, res) => {
  const {
    property_id,
    unit_number,
    bedrooms,
    bathrooms,
    sqft,
    rent_amount
  } = req.body;

  if (!property_id || !unit_number) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO units (property_id, unit_number, bedrooms, bathrooms, sqft, rent_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [property_id, unit_number, bedrooms, bathrooms, sqft, rent_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Unit insert error:', err);
    res.status(500).json({ error: 'Failed to create unit' });
  }
});

export default router;