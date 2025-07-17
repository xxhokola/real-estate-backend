// src/routes/leaseTenants.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { generateLeaseApprovalToken } from '../utils/tokenGenerator.js'; // ✅ FIXED IMPORT
import { sendLeaseApprovalEmail } from '../services/emailService.js';

const router = express.Router();

router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { lease_id, tenant_email, is_primary } = req.body;

  if (!lease_id || !tenant_email) {
    return res.status(400).json({ error: 'Missing lease ID or email' });
  }

  try {
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE email = $1 AND role = 'tenant'`,
      [tenant_email]
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

    const leaseRes = await pool.query(
      `SELECT unit_id FROM leases WHERE lease_id = $1`,
      [lease_id]
    );
    if (leaseRes.rowCount === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }
    const unit_id = leaseRes.rows[0].unit_id;

    const unitRes = await pool.query(
      `SELECT unit_number, property_id FROM units WHERE unit_id = $1`,
      [unit_id]
    );
    if (unitRes.rowCount === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    const { unit_number, property_id } = unitRes.rows[0];

    const propertyRes = await pool.query(
      `SELECT address FROM properties WHERE property_id = $1`,
      [property_id]
    );
    const propertyAddress = propertyRes.rows[0]?.address || 'Unknown address';

    const token = generateLeaseApprovalToken({
      lease_id,
      tenant_id,
      tenant_email
    });

    console.log('🧪 Generated token:', token);

    const updateRes = await pool.query(
      `UPDATE leases SET approval_token = $1, approval_token_expires = NOW() + interval '7 days'
       WHERE lease_id = $2`,
      [token, lease_id]
    );

    console.log('✅ Update result rowCount:', updateRes.rowCount);

    if (updateRes.rowCount === 0) {
      return res.status(500).json({ error: 'Failed to update lease with token' });
    }

    await sendLeaseApprovalEmail(
      tenant_email,
      lease_id,
      token,
      propertyAddress,
      unit_number
    );

    res.status(201).json({
      message: '✅ Tenant assigned and invite sent',
      approval_link: `http://localhost:5173/approve-lease?token=${token}`
    });
  } catch (err) {
    console.error('Lease-tenant assignment error:', err);
    res.status(500).json({ error: 'Failed to assign tenant or send invite' });
  }
});

export default router;