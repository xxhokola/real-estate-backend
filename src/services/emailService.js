// src/services/emailService.js
import nodemailer from 'nodemailer';

// 🔐 Shared mail transport setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ 1. Email Verification (used on registration)
export const sendVerificationEmail = async (email, token) => {
  const link = `http://localhost:5173/verify-email?token=${token}`;

  const mailOptions = {
    from: `"Real Estate App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify Your Email',
    html: `
      <h2>Verify your email</h2>
      <p>Click the link below to verify your account:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 24 hours.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${email}: ${info.response}`);
  } catch (err) {
    console.error('❌ Failed to send verification email:', err);
    throw new Error('Email send failed');
  }
};

// ✅ 2. Lease Approval (used after tenant assignment)
export const sendLeaseApprovalEmail = async (email, leaseId, token, propertyAddress, unitNumber) => {
  const link = `http://localhost:5173/approve-lease?token=${token}`;

  const mailOptions = {
    from: `"Real Estate App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Lease Approval Request',
    html: `
      <h2>New Lease Assigned to You</h2>
      <p>Property: <strong>${propertyAddress}</strong></p>
      <p>Unit: <strong>${unitNumber}</strong></p>
      <p>Please click below to review and approve your lease:</p>
      <a href="${link}">${link}</a>
      <p>This link will expire in 2 days.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Lease invite sent to ${email}: ${info.response}`);
    console.log(`🔗 Lease approval link: ${link}`);
  } catch (err) {
    console.error('❌ Failed to send lease approval email:', err);
    throw new Error('Lease email send failed');
  }
};

// ✅ 3. Generic Lease Invite (alternate simplified version)
export const sendLeaseInviteEmail = async (to, token, approvalLink) => {
  const mailOptions = {
    from: `"Real Estate App" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Lease Approval Invitation',
    html: `
      <p>Hello,</p>
      <p>You’ve been added to a lease. Click below to review and approve it:</p>
      <a href="${approvalLink}">${approvalLink}</a>
      <p>This link is valid for 24 hours.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Lease invite email sent to ${to}: ${info.response}`);
  } catch (err) {
    console.error('❌ Failed to send lease invite email:', err);
    throw new Error('Email send failed');
  }
};