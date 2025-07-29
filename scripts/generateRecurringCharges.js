import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/db.js';
import { sendEmail } from '../src/utils/emailService.js';
import dayjs from 'dayjs';

console.log('📅 Running rent charge generator...');

const today = dayjs();

async function generateMonthlyRentCharges() {
  try {
    const activeLeases = await pool.query(`
      SELECT lease_id, tenant_id, rent_amount, due_day, start_date, end_date
      FROM leases
      WHERE NOW()::date BETWEEN start_date AND end_date
    `);

    for (const lease of activeLeases.rows) {
      const { lease_id, tenant_id, rent_amount, due_day, start_date, end_date } = lease;

      const nextDueDate = dayjs()
        .set('date', due_day)
        .startOf('day');

      if (nextDueDate.isBefore(today.startOf('day'))) continue;

      const existing = await pool.query(
        `SELECT * FROM lease_charges
         WHERE lease_id = $1 AND due_date = $2 AND description = 'Monthly Rent'`,
        [lease_id, nextDueDate.format('YYYY-MM-DD')]
      );

      if (existing.rowCount > 0) {
        console.log(`ℹ️ Rent already exists for lease ${lease_id} on ${nextDueDate.format('YYYY-MM-DD')}`);
        continue;
      }

      await pool.query(
        `INSERT INTO lease_charges (lease_id, description, amount, due_date)
         VALUES ($1, 'Monthly Rent', $2, $3)`,
        [lease_id, rent_amount, nextDueDate.format('YYYY-MM-DD')]
      );

      console.log(`✅ Created rent charge for lease ${lease_id} due ${nextDueDate.format('YYYY-MM-DD')}`);

      // Email notification to tenant
      const tenantRes = await pool.query(`SELECT email, full_name FROM users WHERE id = $1`, [tenant_id]);
      if (tenantRes.rowCount > 0) {
        const { email, full_name } = tenantRes.rows[0];
        await sendEmail({
          to: email,
          subject: `🏠 Rent Due for ${nextDueDate.format('MMMM D')}`,
          text: `Hi ${full_name},\n\nThis is a reminder that your rent of $${rent_amount} is due on ${nextDueDate.format('MMMM D, YYYY')} for your current lease.\n\nPlease pay via your dashboard to avoid late fees.\n\nThank you.`
        });
        console.log(`📧 Sent rent reminder to ${email}`);
      }
    }
  } catch (err) {
    console.error('❌ Error generating recurring charges:', err);
  } finally {
    process.exit();
  }
}

generateMonthlyRentCharges();
