import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { verifyLeaseApprovalToken } from '../utils/approvalToken.js';
import { logAuditEvent } from '../services/auditLogger.js';
import { generateSignedLeasePDF } from '../services/pdfGenerator.js';
import crypto from 'crypto';
import fs from 'fs-extra';

const router = express.Router();

router.post('/approve', authenticateToken, async (req, res) => {
  const { token } = req.body;
  const userEmail = req.user.email;
  const userId = req.user.user_id;
  const userName = req.user.name;

  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    const decoded = verifyLeaseApprovalToken(token);

    if (decoded.tenantEmail !== userEmail) {
      return res.status(403).json({ error: 'You are not authorized to approve this lease.' });
    }

    const leaseId = decoded.leaseId;

    const leaseCheck = await pool.query(
      `SELECT * FROM leases WHERE lease_id = $1 AND approval_token = $2 AND approved_by_tenant = FALSE`,
      [leaseId, token]
    );

    if (leaseCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Invalid or expired lease token' });
    }

    // ✅ Generate and sign lease PDF
    const approvalDate = new Date().toISOString().split('T')[0];
    const pdfPath = await generateSignedLeasePDF({
      leaseId,
      tenantName: userName,
      approvalDate
    });

    // ✅ Hash the PDF for immutability
    const fileBuffer = await fs.readFile(pdfPath);
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // ✅ Mark lease as approved + store path + hash
    await pool.query(
      `UPDATE leases
       SET approved_by_tenant = TRUE,
           approval_token = NULL,
           approval_token_expires = NULL,
           approval_date = NOW(),
           signed_pdf_path = $1,
           signed_pdf_hash = $2
       WHERE lease_id = $3`,
      [pdfPath, hash, leaseId]
    );

    // ✅ Log to audit trail
    await logAuditEvent({
      user_id: userId,
      email: userEmail,
      action: 'approved lease',
      object_type: 'lease',
      object_id: leaseId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

    res.json({ message: '✅ Lease approved and sealed', pdfPath, hash });
  } catch (err) {
    console.error('Lease approval failed:', err);
    res.status(400).json({ error: 'Invalid or expired token' });
  }
});

export default router;