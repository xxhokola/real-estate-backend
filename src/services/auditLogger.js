import { pool } from '../db.js';

export const logAuditEvent = async ({
  user_id,
  email,
  action,
  object_type,
  object_id,
  ip_address,
  user_agent
}) => {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (user_id, email, action, object_type, object_id, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user_id, email, action, object_type, object_id, ip_address, user_agent]
    );
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};