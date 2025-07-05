// src/routes/leaseTenants.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// POST /lease-tenants - assign a tenant to a lease by email
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { lease_id, email, is_primary } = req.body;

  if (!lease_id || !email) {
    return res.status(400).json({ error: 'Missing lease ID or email' });
  }

  try {
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE email = $1 AND role = 'tenant'`,
      [email]
    );

    if (userRes.rowCount === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const tenant_id = userRes.rows[0].user_id;

    await pool.query(
      `INSERT INTO lease_tenants (lease_id, tenant_id, is_primary)
       VALUES ($1, $2, $3)`,
      [lease_id, tenant_id, is_primary ?? false]
    );

    res.status(201).json({ message: 'Tenant assigned successfully' });
  } catch (err) {
    console.error('Lease-tenant assignment error:', err);
    res.status(500).json({ error: 'Failed to assign tenant' });
  }
});

export default router;