// src/routes/leases.js
import express from 'express';
import puppeteer from 'puppeteer';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { uploadToS3, s3 } from '../utils/s3Client.js';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import streamToBuffer from '../utils/streamToBuffer.js';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { sendEmailWithAttachment } from '../services/emailService.js';

const router = express.Router();

// ✅ GET /leases/:id/signatures - returns signature status
router.get('/:id/signatures', authenticateToken, async (req, res) => {
  const leaseId = req.params.id;

  try {
    const [tenantsRes, landlordRes, signedRes] = await Promise.all([
      pool.query(`
        SELECT u.id AS user_id, u.full_name
        FROM lease_tenants lt
        JOIN users u ON lt.tenant_id = u.id
        WHERE lt.lease_id = $1
      `, [leaseId]),
      pool.query(`
        SELECT u.id AS user_id, u.full_name
        FROM leases l
        JOIN users u ON l.landlord_id = u.id
        WHERE l.lease_id = $1
      `, [leaseId]),
      pool.query(`
        SELECT user_id, signed_at
        FROM lease_signatures
        WHERE lease_id = $1
      `, [leaseId])
    ]);

    const signedMap = new Map(signedRes.rows.map(r => [r.user_id, r.signed_at]));

    const tenantSigners = tenantsRes.rows.map(t => ({
      user_id: t.user_id,
      full_name: t.full_name,
      role: 'tenant',
      signed: signedMap.has(t.user_id),
      signed_at: signedMap.get(t.user_id) || null
    }));

    const landlord = landlordRes.rows[0];
    const landlordSigner = {
      user_id: landlord.user_id,
      full_name: landlord.full_name,
      role: 'landlord',
      signed: signedMap.has(landlord.user_id),
      signed_at: signedMap.get(landlord.user_id) || null
    };

    res.json([...tenantSigners, landlordSigner]);
  } catch (err) {
    console.error('Failed to load signature status:', err);
    res.status(500).json({ error: 'Could not load signatures' });
  }
});

// ✅ POST /leases/:id/signatures - submit signature
router.post('/:id/signatures', authenticateToken, async (req, res) => {
  const leaseId = req.params.id;
  const { signature_image_url, signature_position } = req.body;
  const userId = req.user.id;

  if (!signature_image_url) {
    return res.status(400).json({ error: 'Missing signature image URL' });
  }

  try {
    const existing = await pool.query(
      `SELECT * FROM lease_signatures WHERE lease_id = $1 AND user_id = $2`,
      [leaseId, userId]
    );

    if (existing.rowCount > 0) {
      return res.status(400).json({ error: 'Signature already submitted for this user' });
    }

    const hash = crypto
      .createHash('sha256')
      .update(signature_image_url + JSON.stringify(signature_position))
      .digest('hex');

    await pool.query(
      `INSERT INTO lease_signatures (
        lease_id, user_id, signature_image_url, signature_position, signed_at, hash
      ) VALUES ($1, $2, $3, $4, NOW(), $5)`,
      [leaseId, userId, signature_image_url, signature_position, hash]
    );

    // Emit WebSocket updates
    const io = req.app.get('io');
    io.to(`lease_${leaseId}`).emit('signature:updated', { leaseId });

    const landlordRes = await pool.query(
      `SELECT landlord_id FROM leases WHERE lease_id = $1`,
      [leaseId]
    );

    const landlordId = landlordRes.rows[0]?.landlord_id;
    if (landlordId) {
      io.to(`landlord_${landlordId}`).emit('stats:updated');
    }

    res.json({ message: '✅ Signature saved' });
  } catch (err) {
    console.error('Signature save error:', err);
    res.status(500).json({ error: 'Failed to save signature' });
  }
});

// ✅ POST /leases - create new lease
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
    security_deposit,
    template_id
  } = req.body;

  if (!unit_id || !landlord_id || !start_date || !end_date || !rent_amount || !template_id) {
    return res.status(400).json({ error: 'Missing required lease fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO leases (
        unit_id, landlord_id, start_date, end_date, rent_amount,
        due_day, payment_frequency, late_fee, late_fee_percent,
        grace_period_days, security_deposit, template_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
      ) RETURNING lease_id`,
      [
        unit_id,
        landlord_id,
        start_date,
        end_date,
        rent_amount,
        due_day || 1,
        payment_frequency || 'monthly',
        late_fee || 0,
        late_fee_percent || 0,
        grace_period_days || 0,
        security_deposit || 0,
        template_id
      ]
    );

    const newLeaseId = result.rows[0].lease_id;

    // Notify landlord dashboard
    const io = req.app.get('io');
    io.to(`landlord_${landlord_id}`).emit('stats:updated');

    res.status(201).json({ message: '✅ Lease created', lease_id: newLeaseId });
  } catch (err) {
    console.error('Failed to create lease:', err);
    res.status(500).json({ error: 'Failed to create lease' });
  }
});

export default router;