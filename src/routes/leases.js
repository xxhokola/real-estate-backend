// src/routes/leases.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// POST /leases - create new lease
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const {
    unit_id,
    landlord_id,
    start_date,
    end_date,
    rent_amount,
    due_day,
    payment_frequency,
    late_fee,
    late_fee_percent,
    grace_period_days,
    security_deposit
  } = req.body;

  if (!unit_id || !landlord_id || !start_date || !end_date || !rent_amount || !due_day) {
    return res.status(400).json({ error: 'Missing required lease fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO leases (
        unit_id, landlord_id, start_date, end_date, rent_amount,
        due_day, payment_frequency, late_fee, late_fee_percent,
        grace_period_days, security_deposit
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        unit_id,
        landlord_id,
        start_date,
        end_date,
        rent_amount,
        due_day,
        payment_frequency || 'monthly',
        late_fee || 0,
        late_fee_percent || 0,
        grace_period_days || 0,
        security_deposit || 0
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Lease creation error:', err);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

// Serve the signed lease PDF
router.get('/:leaseId/signed-pdf', authenticateToken, async (req, res) => {
  const { leaseId } = req.params;

  try {
    const result = await pool.query(
      `SELECT signed_pdf_path FROM leases WHERE lease_id = $1`,
      [leaseId]
    );

    if (result.rowCount === 0 || !result.rows[0].signed_pdf_path) {
      return res.status(404).json({ error: 'Signed lease not found' });
    }

    const filePath = path.resolve(result.rows[0].signed_pdf_path);

    if (!await fs.pathExists(filePath)) {
      return res.status(404).json({ error: 'PDF file does not exist' });
    }

    res.download(filePath, `lease_${leaseId}.pdf`);
  } catch (err) {
    console.error('Failed to send signed lease PDF:', err);
    res.status(500).json({ error: 'Unable to download signed lease' });
  }
});
export default router;