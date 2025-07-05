import jwt from 'jsonwebtoken';

export const generateLeaseApprovalToken = (leaseId, tenantEmail) => {
  return jwt.sign({ leaseId, tenantEmail }, process.env.JWT_SECRET, { expiresIn: '2d' });
};

export const verifyLeaseApprovalToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};