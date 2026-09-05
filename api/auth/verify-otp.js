/**
 * Verify OTP and create user session with JWT token
 * POST /api/auth/verify-otp
 * Body: { phoneNumber, otp, sessionId }
 */

import admin from 'firebase-admin';
import jwt from 'jsonwebtoken';
import { validatePhoneNumber } from '../../utils/validation.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { phoneNumber, otp, sessionId } = req.body || {};

    if (!phoneNumber || !otp || !sessionId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanPhone = validatePhoneNumber(phoneNumber);
    if (!cleanPhone) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    // Retrieve OTP session
    const otpSession = await db.ref(`otp_sessions/${cleanPhone}`).get();
    if (!otpSession.exists()) {
      return res.status(401).json({ error: 'OTP session not found. Request a new OTP.' });
    }

    const session = otpSession.val();

    // Check if OTP expired
    if (Date.now() > session.expiresAt) {
      await db.ref(`otp_sessions/${cleanPhone}`).remove();
      return res.status(401).json({ error: 'OTP expired. Request a new one.' });
    }

    // Check session ID
    if (session.sessionId !== sessionId) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    // Prevent brute force (max 3 attempts)
    if (session.attempts >= 3) {
      await db.ref(`otp_sessions/${cleanPhone}`).remove();
      return res.status(429).json({
        error: 'Too many failed attempts. Request a new OTP.',
      });
    }

    // Verify OTP
    if (session.otp !== otp.toString()) {
      // Increment attempts
      await db.ref(`otp_sessions/${cleanPhone}/attempts`).set(session.attempts + 1);
      return res.status(401).json({
        error: 'Invalid OTP',
        remainingAttempts: 3 - (session.attempts + 1),
      });
    }

    // OTP verified! Create or update user
    const userId = cleanPhone; // Use phone as unique ID
    const userRef = db.ref(`users/${userId}`);
    const userSnapshot = await userRef.get();

    let userData = {
      phone: cleanPhone,
      fullName: session.fullName || 'Hunter',
      createdAt: userSnapshot.exists() ? userSnapshot.val().createdAt : Date.now(),
      lastLogin: Date.now(),
      verified: true,
    };

    // Save user to database
    await userRef.set(userData);

    // Delete OTP session
    await db.ref(`otp_sessions/${cleanPhone}`).remove();

    // Generate JWT token (expires in 30 days)
    const token = jwt.sign(
      {
        userId,
        phone: cleanPhone,
        fullName: session.fullName,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified. Login successful.',
      token,
      user: {
        userId,
        phone: cleanPhone,
        fullName: session.fullName,
      },
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      error: 'Verification failed. Please try again.',
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
