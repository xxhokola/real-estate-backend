import express from 'express';
import dotenv from 'dotenv';
import usersRouter from './routes/users';
import propertiesRouter from './routes/properties';

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
import paymentsRouter from './routes/payments';
app.use('/payments', paymentsRouter);
app.use('/users', usersRouter);
app.use('/properties', propertiesRouter);

app.get('/', (_req, res) => {
  res.send('Real Estate API is live!');
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});