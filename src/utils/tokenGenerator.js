import jwt from 'jsonwebtoken';

export const generateEmailToken = (email) => {
  return jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

export const verifyEmailToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};