// src/routes/properties.js
import express from 'express';
import { pool } from '../db.js';

const router = express.Router();

// ✅ POST /properties - Create new property
router.post('/', async (req, res) => {
  const { address, city, state, zip_code, property_type, num_units, owner_id } = req.body;

  if (!address || !city || !state || !zip_code || !property_type || !num_units || !owner_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO properties (address, city, state, zip_code, property_type, num_units, owner_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [address, city, state, zip_code, property_type, num_units, owner_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create property error:', err);
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// ✅ GET /properties/:id - Fetch property with units + leases + tenants
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const propertyResult = await pool.query(
      'SELECT * FROM properties WHERE property_id = $1',
      [id]
    );

    if (propertyResult.rowCount === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const property = propertyResult.rows[0];

    // Fetch units
    const unitResult = await pool.query(
      'SELECT * FROM units WHERE property_id = $1',
      [id]
    );

    const units = await Promise.all(unitResult.rows.map(async (unit) => {
      // Fetch leases per unit
      const leaseResult = await pool.query(
        `SELECT l.*, 
                json_agg(json_build_object('user_id', u.user_id, 'email', u.email, 'name', u.name, 'is_primary', lt.is_primary)) AS tenants
         FROM leases l
         LEFT JOIN lease_tenants lt ON l.lease_id = lt.lease_id
         LEFT JOIN users u ON lt.tenant_id = u.user_id
         WHERE l.unit_id = $1
         GROUP BY l.lease_id`,
        [unit.unit_id]
      );

      return {
        ...unit,
        leases: leaseResult.rows.length > 0 ? leaseResult.rows : []
      };
    }));

    res.json({ property, units });
  } catch (err) {
    console.error('Error fetching property:', err);
    res.status(500).json({ error: 'Failed to fetch property details' });
  }
});

export default router;