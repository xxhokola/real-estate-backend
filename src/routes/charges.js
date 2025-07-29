import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-08-16' });

router.post('/:id/pay', authenticateToken, async (req, res) => {
  const chargeId = req.params.id;

  try {
    const chargeRes = await pool.query(
      `SELECT lc.*, l.tenant_id FROM lease_charges lc
       JOIN leases l ON lc.lease_id = l.lease_id
       WHERE lc.charge_id = $1`,
      [chargeId]
    );

    if (chargeRes.rowCount === 0) {
      return res.status(404).json({ error: 'Charge not found' });
    }

    const charge = chargeRes.rows[0];
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: charge.description,
            },
            unit_amount: Math.round(Number(charge.amount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        charge_id: chargeId,
        lease_id: charge.lease_id,
      },
      success_url: `${process.env.FRONTEND_URL}/lease/${charge.lease_id}?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/lease/${charge.lease_id}?payment=cancel`,
    });

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ error: 'Failed to create payment session' });
  }
});