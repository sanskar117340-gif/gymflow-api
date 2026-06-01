const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendEmail({ to, subject, html }) {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('Email send failed:', err.message);
    throw err;
  }
}

async function sendVerificationEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your GymFlow AI account',
    html: `<h2>Welcome to GymFlow AI, ${user.first_name}!</h2>
           <p>Please verify your email by clicking the link below:</p>
           <a href="${url}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
           <p>This link expires in 24 hours.</p>`,
  });
}

async function sendPasswordResetEmail(user, token) {
  const url = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your GymFlow AI password',
    html: `<h2>Password Reset Request</h2>
           <p>Hi ${user.first_name}, click below to reset your password:</p>
           <a href="${url}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail };
