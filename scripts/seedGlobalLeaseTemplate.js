// scripts/seedGlobalLeaseTemplate.js
import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/db.js';
import fs from 'fs-extra';
import path from 'path';

const seedGlobalTemplate = async () => {
  const name = 'Global Residential Lease';
  const type = 'residential';
  const property_id = null; // global
  const templatePath = path.resolve('./templates/global_lease_template.html');

  try {
    const content = await fs.readFile(templatePath, 'utf-8');

    const exists = await pool.query(
      `SELECT * FROM lease_templates WHERE name = $1 AND property_id IS NULL`,
      [name]
    );

    if (exists.rowCount > 0) {
      console.log('✅ Global template already exists.');
      return;
    }

    await pool.query(
      `INSERT INTO lease_templates (property_id, name, type, content)
       VALUES ($1, $2, $3, $4)`,
      [property_id, name, type, content]
    );

    console.log('🌱 Global lease template seeded successfully.');
  } catch (err) {
    console.error('❌ Failed to seed template:', err);
  } finally {
    pool.end();
  }
};

seedGlobalTemplate();