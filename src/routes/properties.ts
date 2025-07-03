import express from 'express';
import { pool } from '../db';
import { requireRole } from '../middleware/roleMiddleware';
import { authenticateToken, AuthenticatedRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Protected route to create a property
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req: AuthenticatedRequest, res) => {
  const {
    address,
    city,
    state,
    zip_code,
    property_type,
    num_units,
    owner_id
  } = req.body;

  if (!address || !city || !state || !zip_code || !property_type || !owner_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO properties (address, city, state, zip_code, property_type, num_units, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [address, city, state, zip_code, property_type, num_units || 1, owner_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Property insert error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// 🔍 GET a single property and its units
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const propertyId = req.params.id;

  try {
    const propertyResult = await pool.query(
      `SELECT * FROM properties WHERE property_id = $1`,
      [propertyId]
    );

    if (propertyResult.rowCount === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const unitResult = await pool.query(
      `SELECT * FROM units WHERE property_id = $1 ORDER BY unit_number ASC`,
      [propertyId]
    );

    res.status(200).json({
      property: propertyResult.rows[0],
      units: unitResult.rows,
    });
  } catch (err) {
    console.error('Fetch property with units error:', err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

export default router;