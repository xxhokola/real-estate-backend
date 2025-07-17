// src/routes/leases.js
import express from 'express';
import path from 'path';
import fs from 'fs-extra';
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

// PUT /leases/:id/template - assign template and snapshot
router.put('/:id/template', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const leaseId = req.params.id;
  const { template_id } = req.body;

  if (!template_id) {
    return res.status(400).json({ error: 'Missing template_id in body' });
  }

  try {
    const leaseRes = await pool.query(
      `SELECT l.lease_id, l.unit_id, u.property_id
       FROM leases l
       JOIN units u ON l.unit_id = u.unit_id
       WHERE l.lease_id = $1`,
      [leaseId]
    );

    if (leaseRes.rowCount === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    const { property_id } = leaseRes.rows[0];

    const templateRes = await pool.query(
      `SELECT * FROM lease_templates WHERE template_id = $1 AND property_id = $2`,
      [template_id, property_id]
    );

    if (templateRes.rowCount === 0) {
      return res.status(400).json({ error: 'Template does not belong to this property' });
    }

    const { renderLeaseTemplate } = await import('../utils/renderLeaseTemplate.js');
    const rendered = await renderLeaseTemplate(leaseId);

    await pool.query(
      `UPDATE leases
       SET template_id = $1, template_snapshot = $2
       WHERE lease_id = $3`,
      [template_id, rendered, leaseId]
    );

    res.status(200).json({ message: '✅ Template assigned and rendered snapshot saved.' });
  } catch (err) {
    console.error('Error assigning lease template:', err);
    res.status(500).json({ error: 'Failed to assign template to lease' });
  }
});

// GET /leases/:leaseId/signed-pdf
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

// PUT /leases/:id/template - assign a template to a lease
router.put('/:id/template', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { id } = req.params;
  const { template_id } = req.body;

  if (!template_id) {
    return res.status(400).json({ error: 'Missing template_id in body' });
  }

  try {
    const result = await pool.query(
      `UPDATE leases SET template_id = $1 WHERE lease_id = $2 RETURNING *`,
      [template_id, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Lease not found' });
    }

    res.json({ message: '✅ Template assigned to lease', lease: result.rows[0] });
  } catch (err) {
    console.error('Error assigning template to lease:', err);
    res.status(500).json({ error: 'Failed to assign template to lease' });
  }
});

export default router;