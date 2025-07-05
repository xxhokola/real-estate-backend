import 'dotenv/config';
import { pool } from '../src/db.js';

const deleteUnverified = async () => {
  try {
    const result = await pool.query(
      `DELETE FROM users WHERE is_verified = false AND created_at < NOW() - INTERVAL '3 days' RETURNING email`
    );

    console.log(`🧹 Deleted ${result.rowCount} unverified users:`);
    result.rows.forEach(row => console.log(`- ${row.email}`));
  } catch (err) {
    console.error('Cleanup error:', err);
  } finally {
    await pool.end();
  }
};

await deleteUnverified();