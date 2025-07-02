import express from 'express';
import { pool } from '../db';

const router = express.Router();

router.post('/', async (req, res) => {
  const { address, city, state, zip_code, property_type, num_units, owner_id } = req.body;

  if (!address || !city || !state || !zip_code || !property_type || !owner_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO properties (address, city, state, zip_code, property_type, num_units, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [address, city, state, zip_code, property_type, num_units || 1, owner_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

export default router;