import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

// 📩 Email verification token
export const generateEmailToken = (email) => {
  return jwt.sign({ email }, JWT_SECRET, { expiresIn: '1d' });
};

export const verifyEmailToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// 📝 Lease approval token
export const generateLeaseApprovalToken = ({ lease_id, tenant_id, tenant_email }) => {
  return jwt.sign(
    { leaseId: lease_id, tenantId: tenant_id, tenantEmail: tenant_email },
    JWT_SECRET,
    { expiresIn: '2d' }
  );
};

export const verifyLeaseApprovalToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// 🙋 Tenant invite token
export const generateInviteToken = ({ tenant_id, email, lease_id }) => {
  return jwt.sign(
    { tenantId: tenant_id, email, leaseId: lease_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const verifyInviteToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};