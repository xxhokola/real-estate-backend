import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Create new rent payment
router.post('/', async (req, res) => {
  const {
    lease_id,
    tenant_id,
    recipient_id,
    amount,
    due_date,
    payment_method
  } = req.body;

  if (!lease_id || !tenant_id || !recipient_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rent_payments
        (lease_id, tenant_id, recipient_id, amount, due_date, status, payment_method, transaction_date)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, CURRENT_TIMESTAMP)
       RETURNING *`,
      [lease_id, tenant_id, recipient_id, amount, due_date, payment_method]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Payment insert error:', err);
    res.status(500).json({ error: 'Failed to log rent payment' });
  }
});

// Get all payments for a user (as tenant or recipient)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM rent_payments
       WHERE tenant_id = $1 OR recipient_id = $1
       ORDER BY due_date DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Fetch payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Update payment status (e.g. mark as paid/late)
router.patch('/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  const { status } = req.body;

  if (!['pending', 'paid', 'late'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `UPDATE rent_payments
       SET status = $1
       WHERE payment_id = $2
       RETURNING *`,
      [status, paymentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    console.error('Update payment error:', err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

export default router;