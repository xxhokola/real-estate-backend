// src/routes/adminAudit.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { Parser } from 'json2csv';

const router = express.Router();

router.get('/export/csv', authenticateToken, async (req, res) => {
  try {
    const { role, user_id } = req.user;

    let query, params;

    if (role === 'admin' || role === 'developer') {
      query = `SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500`;
      params = [];
    } else if (role === 'landlord') {
      const propRes = await pool.query(
        `SELECT property_id FROM properties WHERE owner_id = $1`,
        [user_id]
      );
      const propertyIds = propRes.rows.map(row => row.property_id);

      if (propertyIds.length === 0) {
        return res.status(404).json({ error: 'No properties found for landlord.' });
      }

      query = `
        SELECT * FROM audit_logs
        WHERE object_type IN ('property', 'unit', 'lease', 'payment')
        AND object_id::text IN (
          SELECT u.unit_id::text FROM units u WHERE u.property_id = ANY($1)
          UNION
          SELECT l.lease_id::text FROM leases l
          JOIN units u ON l.unit_id = u.unit_id
          WHERE u.property_id = ANY($1)
          UNION
          SELECT p.property_id::text FROM properties p WHERE p.property_id = ANY($1)
        )
        ORDER BY created_at DESC
        LIMIT 500
      `;
      params = [propertyIds];
    } else {
      query = `SELECT * FROM audit_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 500`;
      params = [user_id];
    }

    const result = await pool.query(query, params);

    const fields = [
      'id',
      'user_id',
      'email',
      'action',
      'object_type',
      'object_id',
      'ip_address',
      'user_agent',
      'created_at'
    ];
    const parser = new Parser({ fields });
    const csv = parser.parse(result.rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('audit_logs.csv');
    return res.send(csv);
  } catch (err) {
    console.error('CSV export failed:', err);
    res.status(500).json({ error: 'Could not export logs' });
  }
});

export default router;