import bcrypt from 'bcrypt';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Session from '../models/Session.js';
import PasswordResetToken from '../models/PasswordResetToken.js';
import EmailVerificationToken from '../models/EmailVerificationToken.js';
import nodemailer from 'nodemailer';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKE_TTL = 14 * 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const createMailTransporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

export const signUp = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const duplicateUser = await User.findOne({ $or: [{ username }, { email }] });
    if (duplicateUser) {
      return res.status(409).json({ message: 'Username or email already in use' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashed,
    });

    // Send verification email (non-blocking — don't fail signup if email fails)
    try {
      const rawToken = crypto.randomBytes(32).toString('hex');
      await EmailVerificationToken.create({
        userId: user._id,
        token: rawToken,
        expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
      });
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}`;
      const transporter = createMailTransporter();
      await transporter.sendMail({
        from: `"AITA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Verify your AITA email',
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #6EE7F7; margin-bottom: 16px;">Welcome to AITA 🐒</h2>
            <p style="color: #ccc; margin-bottom: 24px;">
              Hi <strong>${user.displayName || user.username}</strong>,<br><br>
              Thanks for signing up! Please verify your email address by clicking the button below.
              This link expires in <strong>24 hours</strong>.
            </p>
            <a href="${verifyUrl}" style="
              display: inline-block;
              background: #6EE7F7;
              color: #0D0F1A;
              padding: 12px 28px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 700;
              margin-bottom: 24px;
            ">Verify email</a>
            <p style="color: #666; font-size: 0.85rem;">
              If you didn't sign up for AITA, you can safely ignore this email.
            </p>
            <p style="color: #444; font-size: 0.8rem; margin-top: 24px;">— The AITA team 🐒</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    return res.status(201).json({
      id: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error('Error during signup:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const signIn = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const user = await User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }] });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = crypto.randomBytes(64).toString('hex');
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKE_TTL),
    });

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_TOKE_TTL,
    });
    return res.status(200).json({ message: 'Signin successful', accessToken });
  } catch (err) {
    console.error('Error during signin:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Always return success to prevent email enumeration
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Delete any existing reset tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id });

    // Generate a secure reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;

    // Send email via nodemailer
    const transporter = createMailTransporter();

    await transporter.sendMail({
      from: `"AITA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Reset your AITA password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #6EE7F7; margin-bottom: 16px;">Reset your password</h2>
          <p style="color: #ccc; margin-bottom: 24px;">
            Hi <strong>${user.displayName || user.username}</strong>,<br><br>
            Someone requested a password reset for your AITA account. Click the button below to set a new password.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}" style="
            display: inline-block;
            background: #6EE7F7;
            color: #0D0F1A;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            margin-bottom: 24px;
          ">Reset password</a>
          <p style="color: #666; font-size: 0.85rem;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
          <p style="color: #444; font-size: 0.8rem; margin-top: 24px;">— The AITA team 🐒</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Error during forgot password:', err);
    return res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const resetToken = await PasswordResetToken.findOne({ token });
    if (!resetToken) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }
    if (resetToken.expiresAt < new Date()) {
      await PasswordResetToken.deleteOne({ _id: resetToken._id });
      return res.status(400).json({ message: 'Reset link has expired. Please request a new one.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(resetToken.userId, { password: hashed });

    // Invalidate all sessions (force re-login everywhere)
    await Session.deleteMany({ userId: resetToken.userId });

    // Delete the reset token
    await PasswordResetToken.deleteOne({ _id: resetToken._id });

    return res.status(200).json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('Error during password reset:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const verifyToken = await EmailVerificationToken.findOne({ token });
    if (!verifyToken) {
      return res.status(400).json({ message: 'Verification link is invalid or has expired' });
    }
    if (verifyToken.expiresAt < new Date()) {
      await EmailVerificationToken.deleteOne({ _id: verifyToken._id });
      return res.status(400).json({ message: 'Verification link has expired. Please request a new one.' });
    }

    await User.findByIdAndUpdate(verifyToken.userId, { emailVerified: true });
    await EmailVerificationToken.deleteOne({ _id: verifyToken._id });

    return res.status(200).json({ message: 'Email verified successfully' });
  } catch (err) {
    console.error('Error during email verification:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const session = await Session.findOne({ refreshToken });
    if (!session) {
      return res.status(401).json({ message: 'Session not found' });
    }
    if (session.expiresAt < new Date()) {
      await Session.deleteOne({ _id: session._id });
      return res.status(401).json({ message: 'Session expired' });
    }

    const user = await User.findById(session.userId).select('_id username');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const accessToken = jwt.sign(
      { userId: user._id, username: user.username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    return res.status(200).json({ accessToken });
  } catch (err) {
    console.error('Error during token refresh:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(200).json({ message: 'If that email exists, a verification link has been sent.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always return 200 — don't reveal if email exists
    if (!user || user.emailVerified) {
      return res.status(200).json({ message: 'If that email exists, a verification link has been sent.' });
    }

    await EmailVerificationToken.deleteMany({ userId: user._id });

    const rawToken = crypto.randomBytes(32).toString('hex');
    await EmailVerificationToken.create({
      userId: user._id,
      token: rawToken,
      expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS),
    });

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${rawToken}`;
    const transporter = createMailTransporter();
    await transporter.sendMail({
      from: `"AITA" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'Verify your AITA email',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #6EE7F7; margin-bottom: 16px;">Verify your email</h2>
          <p style="color: #ccc; margin-bottom: 24px;">
            Hi <strong>${user.displayName || user.username}</strong>,<br><br>
            Click the button below to verify your AITA email address.
            This link expires in <strong>24 hours</strong>.
          </p>
          <a href="${verifyUrl}" style="
            display: inline-block;
            background: #6EE7F7;
            color: #0D0F1A;
            padding: 12px 28px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 700;
            margin-bottom: 24px;
          ">Verify email</a>
          <p style="color: #444; font-size: 0.8rem; margin-top: 24px;">— The AITA team 🐒</p>
        </div>
      `,
    });

    return res.status(200).json({ message: 'If that email exists, a verification link has been sent.' });
  } catch (err) {
    console.error('Error during resend verification:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
