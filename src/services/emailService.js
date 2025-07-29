// src/services/emailService.js
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// ✅ 1. Email Verification
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
    console.log(`📧 Verification email sent to ${email}: ${info.response}`);
  } catch (err) {
    console.error('❌ Failed to send verification email:', err);
    throw new Error('Email send failed');
  }
};

// ✅ 2. Lease Approval (existing user)
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
  } catch (err) {
    console.error('❌ Failed to send lease approval email:', err);
    throw new Error('Lease email send failed');
  }
};

// ✅ 3. Generic Lease Invite (fallback)
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

// ✅ 4. Send final signed PDF
export const sendEmailWithAttachment = async ({ to, subject, text, attachment }) => {
  const mailOptions = {
    from: `"Real Estate App" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    attachments: [
      {
        filename: attachment.filename,
        content: attachment.content
      }
    ]
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📎 Lease PDF sent to ${to}: ${info.response}`);
  } catch (err) {
    console.error('❌ Failed to send PDF email:', err);
    throw new Error('Email send failed');
  }
};

// ✅ 5. Invite new tenant to complete signup and approve lease
export const sendTenantInviteEmail = async (email, token, leaseId) => {
  const signupLink = `http://localhost:5173/signup?invite=${token}&lease=${leaseId}&email=${encodeURIComponent(email)}`;

  const mailOptions = {
    from: `"Real Estate App" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'You’ve been invited to sign a lease',
    html: `
      <h2>You're Invited to Join a Lease</h2>
      <p>We've created an account for you. Click below to complete registration and approve your lease:</p>
      <a href="${signupLink}" style="padding:10px 20px; background:#007bff; color:white; text-decoration:none; border-radius:5px;">Complete Registration</a>
      <p>Or open this link: <a href="${signupLink}">${signupLink}</a></p>
      <p>This link will expire in 7 days.</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Tenant signup invite sent to ${email}: ${info.response}`);
  } catch (err) {
    console.error('❌ Failed to send tenant invite email:', err);
    throw new Error('Tenant invite email failed');
  }
};