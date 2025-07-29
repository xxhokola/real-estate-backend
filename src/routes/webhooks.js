import express from 'express';
import Stripe from 'stripe';
import { pool } from '../db.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-08-16',
});

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const chargeId = session.metadata.charge_id;

    try {
      await pool.query(
        `UPDATE lease_charges SET paid = true, paid_at = NOW() WHERE charge_id = $1`,
        [chargeId]
      );
      console.log(`✅ Charge ${chargeId} marked as paid`);
    } catch (err) {
      console.error('❌ Failed to mark charge as paid:', err);
    }
  }

  res.json({ received: true });
});

export default router;