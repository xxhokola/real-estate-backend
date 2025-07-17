// src/utils/tokenGenerator.js
import jwt from 'jsonwebtoken';

// 📩 Used for email verification
export const generateEmailToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

export const verifyEmailToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// ✅ Used for lease approval links (must include leaseId + tenantEmail)
export const generateLeaseApprovalToken = ({ lease_id, tenant_id, tenant_email }) => {
  return jwt.sign(
    {
      leaseId: lease_id,
      tenantId: tenant_id,
      tenantEmail: tenant_email
    },
    process.env.JWT_SECRET,
    { expiresIn: '2d' }
  );
};

export const verifyLeaseApprovalToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};