import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import usersRouter from './routes/users';
import propertiesRouter from './routes/properties';
import unitsRouter from './routes/units';
import paymentsRouter from './routes/payments';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/users', usersRouter);
app.use('/properties', propertiesRouter);
app.use('/units', unitsRouter);
app.use('/payments', paymentsRouter);

// Health check
app.get('/', (_req, res) => {
  res.send('✅ Real Estate API is running');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});