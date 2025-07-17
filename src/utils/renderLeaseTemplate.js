// src/utils/renderLeaseTemplate.js
import { pool } from '../db.js';

// ✅ Simple mustache-style interpolation
function interpolate(content, variables) {
  return content.replace(/{{\s*(\w+)\s*}}/g, (_, key) => {
    const value = variables[key];
    return value !== undefined && value !== null ? value : '';
  });
}

export async function renderLeaseTemplate(leaseId) {
  // ✅ Step 1: Fetch lease + template + tenant info
  const result = await pool.query(
    `SELECT l.lease_id, l.start_date, l.end_date, l.rent_amount, l.template_id,
            lt.content AS template_content,
            u.unit_number, p.address AS property_address,
            t.name AS tenant_name, t.email AS tenant_email
     FROM leases l
     JOIN lease_templates lt ON l.template_id = lt.template_id
     JOIN units u ON l.unit_id = u.unit_id
     JOIN properties p ON u.property_id = p.property_id
     JOIN lease_tenants ltj ON l.lease_id = ltj.lease_id AND ltj.is_primary = TRUE
     JOIN users t ON ltj.tenant_id = t.user_id
     WHERE l.lease_id = $1`,
    [leaseId]
  );

  if (result.rowCount === 0) {
    throw new Error('Lease or template data not found');
  }

  const lease = result.rows[0];

  // ✅ Step 2: Build variables
  const variables = {
    tenant_name: lease.tenant_name,
    tenant_email: lease.tenant_email,
    lease_start: lease.start_date,
    lease_end: lease.end_date,
    rent_amount: lease.rent_amount,
    unit_number: lease.unit_number,
    property_address: lease.property_address,
  };

  // ✅ Step 3: Interpolate
  const rendered = interpolate(lease.template_content, variables);
  return rendered;
}