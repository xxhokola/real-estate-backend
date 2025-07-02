import express from 'express';
import { pool } from '../db';

const router = express.Router();

// POST /payments - log a rent payment
router.post('/', async (req, res) => {
  const {
    lease_id,
    payer_id,
    recipient_id,
    amount,
    due_date,
    payment_method
  } = req.body;

  if (!lease_id || !payer_id || !recipient_id || !amount || !due_date) {
    return res.status(400).json({ error: 'Missing required payment fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO rent_payments
        (lease_id, payer_id, recipient_id, amount, due_date, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [lease_id, payer_id, recipient_id, amount, due_date, payment_method]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Error inserting payment:', err);
    res.status(500).json({ error: 'Failed to log payment transaction' });
  }
});

// GET /payments/:userId - show payments made or received by a user
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM rent_payments
       WHERE payer_id = $1 OR recipient_id = $1
       ORDER BY due_date DESC`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err: any) {
    console.error('Error retrieving payments:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// PATCH /payments/:paymentId - update status (paid, late, etc.)
router.patch('/:paymentId', async (req, res) => {
  const { paymentId } = req.params;
  const { status } = req.body;

  if (!['paid', 'pending', 'late'].includes(status)) {
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
    console.error('Error updating payment status:', err);
    res.status(500).json({ error: 'Failed to update payment status' });
  }
});

export default router;