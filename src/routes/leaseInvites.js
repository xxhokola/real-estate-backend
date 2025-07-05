// src/routes/leaseInvites.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { generateLeaseApprovalToken } from '../utils/approvalToken.js';
import { sendLeaseApprovalEmail } from '../services/emailService.js';
import { logAuditEvent } from '../services/auditLogger.js';

const router = express.Router();

router.post('/send', authenticateToken, async (req, res) => {
  const { lease_id, tenant_email } = req.body;

  if (!lease_id || !tenant_email) {
    return res.status(400).json({ error: 'Missing lease_id or tenant_email' });
  }

  try {
    // Check lease exists
    const leaseRes = await pool.query(
      `SELECT l.*, u.unit_number, p.address AS property_address
       FROM leases l
       JOIN units u ON l.unit_id = u.unit_id
       JOIN properties p ON u.property_id = p.property_id
       WHERE l.lease_id = $1`,
      [lease_id]
    );

    if (leaseRes.rowCount === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const lease = leaseRes.rows[0];
    const token = generateLeaseApprovalToken(lease_id, tenant_email);
    const expires = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

    // Store token + expiration
    await pool.query(
      `UPDATE leases SET approval_token = $1, approval_token_expires = $2 WHERE lease_id = $3`,
      [token, expires, lease_id]
    );

    // Send the invite email
    await sendLeaseApprovalEmail(tenant_email, lease_id, token, lease.property_address, lease.unit_number);

    // Optional: log invite
    await logAuditEvent({
      user_id: req.user.user_id,
      email: req.user.email,
      action: 'sent lease invite',
      object_type: 'lease',
      object_id: lease_id,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: '✅ Lease invite sent' });
  } catch (err) {
    console.error('Lease invite error:', err);
    res.status(500).json({ error: 'Failed to send lease invite' });
  }
});

export default router;