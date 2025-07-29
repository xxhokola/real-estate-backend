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

// GET /my-properties/stats - Landlord dashboard stats
router.get('/stats', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const userId = req.user.user_id;

  try {
    const [{ rows: propertyRows }, { rows: unitRows }, { rows: leaseRows }, { rows: chargeRows }] = await Promise.all([
      pool.query(`SELECT property_id FROM properties WHERE owner_id = $1`, [userId]),
      pool.query(`SELECT * FROM units WHERE property_id IN (SELECT property_id FROM properties WHERE owner_id = $1)`, [userId]),
      pool.query(`
        SELECT l.*
        FROM leases l
        JOIN units u ON l.unit_id = u.unit_id
        WHERE u.property_id IN (SELECT property_id FROM properties WHERE owner_id = $1)
      `, [userId]),
      pool.query(`
        SELECT c.*
        FROM lease_charges c
        JOIN leases l ON c.lease_id = l.lease_id
        JOIN units u ON l.unit_id = u.unit_id
        WHERE u.property_id IN (SELECT property_id FROM properties WHERE owner_id = $1)
          AND c.paid = false
      `, [userId])
    ]);

    const pendingLeases = leaseRows.filter(l => !l.approved_at).length;

    res.json({
      properties: propertyRows.length,
      units: unitRows.length,
      leases: leaseRows.length,
      pendingLeases,
      unpaidCharges: chargeRows.length
    });
  } catch (err) {
    console.error('Error fetching landlord dashboard stats:', err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

export default router;