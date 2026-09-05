/**
 * Send OTP via Firebase Authentication
 * POST /api/auth/send-otp
 * Body: { phoneNumber: "+256771234567" }
 */

import admin from 'firebase-admin';
import { validatePhoneNumber } from '../../utils/validation.js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export default async function handler(req, res) {
  // CORS headers
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
    const { phoneNumber, fullName } = req.body || {};

    // Validate input
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Validate Uganda phone format
    const cleanPhone = validatePhoneNumber(phoneNumber);
    if (!cleanPhone) {
      return res.status(400).json({
        error: 'Invalid phone number. Use Uganda format: 077/078/076/070/075/074 + 7 digits',
      });
    }

    // Check if user already exists (prevent spam)
    const existingOTP = await db.ref(`otp_sessions/${cleanPhone}`).get();
    if (existingOTP.exists()) {
      const lastSent = existingOTP.val().sentAt;
      const timeDiff = Date.now() - lastSent;
      if (timeDiff < 60000) {
        return res.status(429).json({
          error: 'Please wait before requesting another OTP',
          retryAfter: Math.ceil((60000 - timeDiff) / 1000),
        });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const sessionId = require('crypto').randomBytes(16).toString('hex');
    const expiryTime = Date.now() + 600000; // 10 minutes

    // Store OTP in Firebase (expires after 10 minutes)
    await db.ref(`otp_sessions/${cleanPhone}`).set(
      {
        otp,
        sessionId,
        fullName: fullName || 'Hunter',
        sentAt: Date.now(),
        expiresAt: expiryTime,
        attempts: 0,
      },
      (error) => {
        if (error) throw error;
      }
    );

    // In production, send OTP via SMS provider (Twilio, Africastalking, etc.)
    // For now, log it (DEMO MODE)
    console.log(`[DEMO] OTP for ${cleanPhone}: ${otp}`);

    // In production, use a real SMS service:
    // await sendSMSViaAfricastalking(cleanPhone, `Your Academic Hunters OTP: ${otp}`);

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      sessionId,
      phoneNumber: cleanPhone,
      // In production, remove this line:
      demo_otp: otp, // REMOVE in production
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return res.status(500).json({
      error: 'Failed to send OTP. Please try again.',
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
