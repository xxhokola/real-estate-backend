// src/routes/leaseTemplates.js
import express from 'express';
import { pool } from '../db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const router = express.Router();

// POST /lease-templates - create new template
router.post('/', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { property_id, name, type, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO lease_templates (property_id, name, type, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [property_id || null, name, type || 'residential', content]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating lease template:', err);
    res.status(500).json({ error: 'Failed to create lease template' });
  }
});

// PUT /lease-templates/:id - update existing template
router.put('/:id', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { id } = req.params;
  const { name, type, content } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      `UPDATE lease_templates
       SET name = $1, type = $2, content = $3
       WHERE template_id = $4
       RETURNING *`,
      [name, type || 'residential', content, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating lease template:', err);
    res.status(500).json({ error: 'Failed to update lease template' });
  }
});

// DELETE /lease-templates/:id - delete a template
router.delete('/:id', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM lease_templates WHERE template_id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ message: 'Template deleted', template: result.rows[0] });
  } catch (err) {
    console.error('Error deleting lease template:', err);
    res.status(500).json({ error: 'Failed to delete lease template' });
  }
});

// GET /lease-templates/:propertyId?include_base=true
router.get('/:propertyId', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { propertyId } = req.params;
  const includeBase = req.query.include_base === 'true';

  try {
    let query = `
      SELECT * FROM lease_templates
      WHERE property_id = $1
    `;
    const params = [propertyId];

    if (includeBase) {
      query += ` OR property_id IS NULL`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching lease templates:', err);
    res.status(500).json({ error: 'Failed to fetch lease templates' });
  }
});

// GET /lease-templates/edit/:id - fetch single template for editing
router.get('/edit/:id', authenticateToken, requireRole(['landlord', 'manager']), async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM lease_templates WHERE template_id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching lease template:', err);
    res.status(500).json({ error: 'Failed to fetch lease template' });
  }
});

export default router;