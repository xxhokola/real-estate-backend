import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const userId = req.user.user_id;

  try {
    const leaseStatsQuery = await pool.query(
      `SELECT p.property_id, p.address,
              COUNT(l.lease_id) AS totalLeases,
              COUNT(CASE WHEN l.approved_at IS NOT NULL THEN 1 END) AS activeLeases,
              COUNT(CASE WHEN l.approved_at IS NULL THEN 1 END) AS pendingLeases
       FROM properties p
       LEFT JOIN units u ON u.property_id = p.property_id
       LEFT JOIN leases l ON l.unit_id = u.unit_id
       WHERE p.owner_id = $1
       GROUP BY p.property_id
       ORDER BY p.address`,
      [userId]
    );

    const paymentStatsQuery = await pool.query(
      `SELECT p.property_id, p.address,
              COALESCE(SUM(CASE WHEN c.paid = false THEN c.amount ELSE 0 END), 0) AS totalOutstanding,
              COUNT(CASE WHEN c.paid = false THEN 1 END) AS unpaidCount,
              COUNT(CASE WHEN c.paid = false AND c.due_date < NOW() - INTERVAL '3 days' THEN 1 END) AS overdueCount
       FROM properties p
       LEFT JOIN units u ON u.property_id = p.property_id
       LEFT JOIN leases l ON l.unit_id = u.unit_id
       LEFT JOIN lease_charges c ON c.lease_id = l.lease_id
       WHERE p.owner_id = $1
       GROUP BY p.property_id
       ORDER BY p.address`,
      [userId]
    );

    res.json({
      leaseStats: leaseStatsQuery.rows,
      paymentStats: paymentStatsQuery.rows
    });
  } catch (err) {
    console.error('Failed to load dashboard stats:', err);
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

export default router;
