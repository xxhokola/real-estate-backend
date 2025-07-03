import express from 'express';
import { pool } from '../db';

const router = express.Router();

router.post('/', async (req, res) => {
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

  if (!unit_id || !landlord_id || !start_date || !end_date || !rent_amount) {
    return res.status(400).json({ error: 'Missing required lease fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO leases
        (unit_id, landlord_id, start_date, end_date, rent_amount, due_day,
         payment_frequency, late_fee, late_fee_percent, grace_period_days, security_deposit)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
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
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Lease insert error:', err);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

export default router;