// scripts/generateRentInvoices.js
import 'dotenv/config';
import { pool } from '../src/db.js';
import dayjs from 'dayjs';
import fs from 'fs';
import path from 'path';

const dryRun = process.argv.includes('--dry-run');
const logFile = path.join(new URL('.', import.meta.url).pathname, 'rent-log.txt');
const log = (msg) => {
  const timestamp = new Date().toISOString();
  console.log(msg);
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
};

const generateRentInvoices = async () => {
  const today = dayjs();
  log(`▶ Starting rent invoice generation (${dryRun ? 'DRY-RUN' : 'LIVE'})`);

  try {
    const leases = await pool.query(
      `SELECT * FROM leases
       WHERE start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE`
    );

    for (const lease of leases.rows) {
      const {
        lease_id,
        unit_id,
        landlord_id,
        rent_amount,
        due_day,
        payment_frequency
      } = lease;

      const dueDate = today.date(due_day);
      const startOfMonth = today.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = today.endOf('month').format('YYYY-MM-DD');

      const existing = await pool.query(
        `SELECT * FROM rent_payments
         WHERE lease_id = $1 AND due_date BETWEEN $2 AND $3`,
        [lease_id, startOfMonth, endOfMonth]
      );

      if (existing.rowCount === 0 && today.date() >= due_day) {
        const tenantRes = await pool.query(
          `SELECT tenant_id FROM lease_tenants WHERE lease_id = $1 LIMIT 1`,
          [lease_id]
        );

        const tenant_id = tenantRes.rows[0]?.tenant_id;
        if (!tenant_id) {
          log(`⚠️  No tenant on lease ${lease_id}, skipping.`);
          continue;
        }

        log(`📌 Generating rent payment for lease ${lease_id}...`);

        if (!dryRun) {
          await pool.query(
            `INSERT INTO rent_payments (
              lease_id, tenant_id, recipient_id,
              amount, due_date, status, transaction_date, payment_method
            ) VALUES ($1, $2, $3, $4, $5, 'pending', CURRENT_DATE, 'auto-generated')`,
            [lease_id, tenant_id, landlord_id, rent_amount, dueDate.format('YYYY-MM-DD')]
          );
        }

        log(`✅ ${dryRun ? '[DRY-RUN] Would create' : 'Created'} rent payment for lease ${lease_id}`);
      }
    }

    log('🏁 Invoice generation finished.');
  } catch (err) {
    log('❌ Script error: ' + err.message);
  } finally {
    await pool.end();
    process.exit();
  }
};

await generateRentInvoices();