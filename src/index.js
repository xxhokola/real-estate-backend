// src/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

console.log('✅ DATABASE_URL:', process.env.DATABASE_URL);

import { authenticateToken } from './middleware/authMiddleware.js';

import usersRouter from './routes/users.js';
import authRouter from './routes/auth.js';
import propertiesRouter from './routes/properties.js';
import unitsRouter from './routes/units.js';
import leasesRouter from './routes/leases.js';
import paymentsRouter from './routes/payments.js';
import myPropertiesRouter from './routes/myProperties.js';
import leaseTenantsRouter from './routes/leaseTenants.js';
import verifyEmailRouter from './routes/verifyEmail.js';
import resendVerificationRouter from './routes/resendVerification.js';
import adminAuditRouter from './routes/adminAudit.js';
import leaseApprovalRouter from './routes/leaseApproval.js';
import leaseInviteRouter from './routes/leaseInvites.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public routes
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/verify-email', verifyEmailRouter);
app.use('/resend-verification', resendVerificationRouter);

// Protected routes
app.use(authenticateToken);
app.use('/properties', propertiesRouter);
app.use('/units', unitsRouter);
app.use('/leases', leasesRouter);
app.use('/payments', paymentsRouter);
app.use('/my-properties', myPropertiesRouter);
app.use('/lease-tenants', leaseTenantsRouter);
app.use('/admin-audit', adminAuditRouter);
app.use('/lease-invites', leaseInviteRouter);
app.get('/', (_req, res) => {
app.use('/lease-approval', leaseApprovalRouter);
  res.send('🏠 Real Estate Backend API is running');
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});