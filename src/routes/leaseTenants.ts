import express from 'express';
import { pool } from '../db';

const router = express.Router();

router.post('/', async (req, res) => {
  const { lease_id, tenant_id, is_primary } = req.body;

  if (!lease_id || !tenant_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lease_tenants (lease_id, tenant_id, is_primary)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [lease_id, tenant_id, is_primary || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Lease-Tenant insert error:', err);
    res.status(500).json({ error: 'Failed to add tenant to lease' });
  }
});

export default router;