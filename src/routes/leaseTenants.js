import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import {
  generateInviteToken,
  generateLeaseApprovalToken
} from '../utils/tokenGenerator.js';
import {
  sendLeaseApprovalEmail,
  sendTenantInviteEmail
} from '../services/emailService.js';
import bcrypt from 'bcrypt'; // at the top of the file

const router = express.Router();

router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { lease_id, tenant_email, is_primary } = req.body;

  if (!lease_id || !tenant_email) {
    return res.status(400).json({ error: 'Missing lease ID or email' });
  }

  try {
    let tenant_id;
    let isNewTenant = false;
    let inviteToken = null;

    // 🔍 Check if tenant already exists
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE email = $1 AND role = 'tenant'`,
      [tenant_email]
    );

    if (userRes.rowCount === 0) {
      isNewTenant = true;

      // 🧠 Use email prefix as fallback name
      const fallbackName = tenant_email.split('@')[0];

     

      const fakePassword = await bcrypt.hash('temp-password', 10);
      
      const newUserRes = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_verified)
         VALUES ($1, $2, $3, 'tenant', false)
         RETURNING user_id`,
        [fallbackName, tenant_email, fakePassword]
      );

      tenant_id = newUserRes.rows[0].user_id;

      // 🔑 Generate secure invite token
      inviteToken = generateInviteToken(tenant_email);

      await pool.query(
        `UPDATE users
         SET invite_token = $1, invited_by = $2
         WHERE user_id = $3`,
        [inviteToken, req.user.user_id, tenant_id]
      );

      console.log('🆕 Invited new tenant:', tenant_id, 'Token:', inviteToken);
    } else {
      tenant_id = userRes.rows[0].user_id;
    }

    // 🔗 Insert into lease_tenants
    await pool.query(
      `INSERT INTO lease_tenants (lease_id, tenant_id, is_primary)
       VALUES ($1, $2, $3)`,
      [lease_id, tenant_id, is_primary ?? false]
    );

    // 🏠 Load unit + property info
    const leaseRes = await pool.query(
      `SELECT unit_id FROM leases WHERE lease_id = $1`,
      [lease_id]
    );
    if (leaseRes.rowCount === 0) return res.status(404).json({ error: 'Lease not found' });

    const unit_id = leaseRes.rows[0].unit_id;

    const unitRes = await pool.query(
      `SELECT unit_number, property_id FROM units WHERE unit_id = $1`,
      [unit_id]
    );
    if (unitRes.rowCount === 0) return res.status(404).json({ error: 'Unit not found' });

    const { unit_number, property_id } = unitRes.rows[0];

    const propertyRes = await pool.query(
      `SELECT address FROM properties WHERE property_id = $1`,
      [property_id]
    );
    const propertyAddress = propertyRes.rows[0]?.address || 'Unknown address';

    // 🧾 Generate lease approval token
    const approvalToken = generateLeaseApprovalToken({
      lease_id,
      tenant_id,
      tenant_email
    });

    await pool.query(
      `UPDATE leases
       SET approval_token = $1,
           approval_token_expires = NOW() + interval '7 days'
       WHERE lease_id = $2`,
      [approvalToken, lease_id]
    );

    // 📧 Send email based on whether tenant exists
    if (isNewTenant && inviteToken) {
      await sendTenantInviteEmail(tenant_email, inviteToken, lease_id);
    } else {
      await sendLeaseApprovalEmail(
        tenant_email,
        lease_id,
        approvalToken,
        propertyAddress,
        unit_number
      );
    }

    return res.status(201).json({
      message: '✅ Tenant assigned and invite sent',
      approval_link: `http://localhost:5173/approve-lease?token=${approvalToken}`
    });
  } catch (err) {
    console.error('Lease-tenant assignment error:', err);
    return res.status(500).json({ error: 'Failed to assign tenant or send invite' });
  }
});

export default router;