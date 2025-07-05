// src/routes/payments.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// POST /payments - create a rent payment manually
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const {
    lease_id,
    tenant_id,
    recipient_id,
    amount,
    due_date,
    payment_method
  } = req.body;

  if (!lease_id || !tenant_id || !recipient_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rent_payments (
        lease_id, tenant_id, recipient_id, amount, due_date, payment_method, transaction_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, 'pending')
      RETURNING *`,
      [lease_id, tenant_id, recipient_id, amount, due_date, payment_method || 'manual']
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Payment creation error:', err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// GET /payments/:userId - get all payments for a user (tenant)
router.get('/:userId', authenticateToken, async (req, res) => {
  const userId = req.params.userId;

  try {
    const result = await pool.query(
      `SELECT * FROM rent_payments WHERE tenant_id = $1 ORDER BY due_date DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// PATCH /payments/:paymentId - update payment status
router.patch('/:paymentId', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const paymentId = req.params.paymentId;
  const { status } = req.body;

  if (!status) return res.status(400).json({ error: 'Missing status field' });

  try {
    await pool.query(
      `UPDATE rent_payments SET status = $1 WHERE payment_id = $2`,
      [status, paymentId]
    );
    res.json({ message: 'Payment status updated' });
  } catch (err) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

export default router;