import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
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
import leaseTemplatesRouter from './routes/leaseTemplates.js';
import stripeWebhooks from './routes/webhooks.js';
import dashboardRouter from './routes/dashboard.js';

const app = express();
const port = process.env.PORT || 3000;

// 🔌 Create HTTP server and attach socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Change to your frontend domain in prod
  },
});

// 📡 WebSocket listeners
io.on('connection', (socket) => {
  console.log('🔌 WebSocket connected');

  socket.on('joinLeaseRoom', (leaseId) => {
    socket.join(`lease_${leaseId}`);
    console.log(`🛏️ Client joined lease_${leaseId}`);
  });

  socket.on('joinLandlordRoom', (landlordId) => {
    socket.join(`landlord_${landlordId}`);
    console.log(`🏠 Client joined landlord_${landlordId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket disconnected');
  });
});

// Make io available in routes
app.set('io', io);

// 🛡️ Middleware
app.use(cors());
app.use(express.json());

// 🌐 Public routes
app.use('/users', usersRouter);
app.use('/auth', authRouter);
app.use('/verify-email', verifyEmailRouter);
app.use('/resend-verification', resendVerificationRouter);
app.use('/lease-approval', leaseApprovalRouter); // Token auth route
app.use('/webhooks', stripeWebhooks); // Stripe

// 🔐 Protected routes
app.use(authenticateToken);
app.use('/properties', propertiesRouter);
app.use('/units', unitsRouter);
app.use('/leases', leasesRouter);
app.use('/payments', paymentsRouter);
app.use('/my-properties', myPropertiesRouter);
app.use('/lease-tenants', leaseTenantsRouter);
app.use('/admin-audit', adminAuditRouter);
app.use('/lease-templates', leaseTemplatesRouter);
app.use('/dashboard', dashboardRouter);

// ✅ Health check
app.get('/', (_req, res) => {
  res.send('🏠 Real Estate Backend API is running');
});

// 🚀 Launch server
server.listen(port, () => {
  console.log(`🚀 Express + WebSocket server running at http://localhost:${port}`);
});