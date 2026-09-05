/**
 * M-Pesa Payment Integration
 * Handles payment requests for note downloads
 * Requires M-Pesa API credentials
 */

import admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth.js';
import fetch from 'node-fetch';
import crypto from 'crypto';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// M-Pesa API Configuration
const MOMO_API_KEY = process.env.MOMO_API_KEY;
const MOMO_MERCHANT_ID = process.env.MOMO_MERCHANT_ID;
const MOMO_API_URL = 'https://api.sandbox.momodeveloper.mtn.com'; // Use production URL in prod

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // POST - Initiate payment
    if (req.method === 'POST') {
      return handlePaymentRequest(user, req.body, res);
    }

    // GET - Check payment status
    if (req.method === 'GET') {
      const { referenceId } = req.query;
      return handlePaymentStatus(user, referenceId, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * Handle payment request via M-Pesa
 */
async function handlePaymentRequest(user, body, res) {
  try {
    const { noteId, amount, phoneNumber } = body || {};

    if (!noteId || !amount || !phoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields: noteId, amount, phoneNumber',
      });
    }

    // Validate amount (minimum 100 UGX)
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Minimum 100 UGX',
      });
    }

    // Verify note exists
    const noteSnapshot = await db.ref(`notes/${noteId}`).get();
    if (!noteSnapshot.exists()) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const referenceId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    // Create payment record
    const payment = {
      id: referenceId,
      userId: user.userId,
      noteId,
      amount: amountNum,
      phoneNumber,
      status: 'pending',
      createdAt: now,
      expiresAt: now + 600000, // 10 minutes
    };

    // Save payment record
    await db.ref(`payments/${referenceId}`).set(payment);

    // Call M-Pesa API to request payment
    const paymentResponse = await requestMomoPayment({
      amount: amountNum,
      phoneNumber,
      referenceId,
      description: `Academic Hunters - Download Note`,
    });

    if (!paymentResponse.success) {
      return res.status(400).json({
        error: paymentResponse.error || 'Payment initiation failed',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment initiated. Please enter PIN in your phone.',
      referenceId,
      amount: amountNum,
      phoneNumber,
      expiresIn: 600, // seconds
    });
  } catch (error) {
    console.error('Payment request error:', error);
    return res.status(500).json({
      error: 'Failed to process payment request',
    });
  }
}

/**
 * Check payment status
 */
async function handlePaymentStatus(user, referenceId, res) {
  try {
    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID is required' });
    }

    const paymentSnapshot = await db.ref(`payments/${referenceId}`).get();
    if (!paymentSnapshot.exists()) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    const payment = paymentSnapshot.val();

    // Verify payment belongs to user
    if (payment.userId !== user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if payment expired
    if (Date.now() > payment.expiresAt && payment.status === 'pending') {
      await db.ref(`payments/${referenceId}/status`).set('expired');
      return res.status(200).json({
        success: false,
        status: 'expired',
        message: 'Payment request expired',
      });
    }

    // If payment is completed, unlock note for download
    if (payment.status === 'completed') {
      await db.ref(`downloads/${payment.userId}/${payment.noteId}`).set({
        unlockedAt: Date.now(),
        paymentId: referenceId,
      });
    }

    return res.status(200).json({
      success: payment.status === 'completed',
      referenceId,
      status: payment.status,
      amount: payment.amount,
      message:
        payment.status === 'completed'
          ? 'Payment successful. Note unlocked for download.'
          : `Payment ${payment.status}. Please wait...`,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return res.status(500).json({ error: 'Failed to check payment status' });
  }
}

/**
 * Request payment from M-Pesa API
 * This is a placeholder - integrate with actual M-Pesa provider
 */
async function requestMomoPayment(options) {
  try {
    const { amount, phoneNumber, referenceId, description } = options;

    // For demo, log and simulate success
    console.log('[PAYMENT] M-Pesa payment request:', {
      amount,
      phone: phoneNumber,
      reference: referenceId,
    });

    // In production, integrate with real M-Pesa API:
    // Example: MTN Mobile Money, Airtel Money, or Stripe integration
    /*
    const response = await fetch(`${MOMO_API_URL}/v1_0/requesttopay`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getMomoAccessToken()}`,
        'Content-Type': 'application/json',
        'X-Reference-Id': referenceId,
      },
      body: JSON.stringify({
        amount: amount.toString(),
        currency: 'UGX',
        externalId: referenceId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber,
        },
        payerMessage: description,
        payeeNote: 'Academic Hunters Note Download',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.message };
    }

    return { success: true, transactionId: referenceId };
    */

    // Demo: return success
    return { success: true, transactionId: referenceId };
  } catch (error) {
    console.error('M-Pesa request error:', error);
    return {
      success: false,
      error: 'Failed to contact payment provider',
    };
  }
}

/**
 * Webhook endpoint for M-Pesa payment callbacks
 * This receives payment notifications from M-Pesa provider
 */
export async function handleMomoWebhook(req, res) {
  try {
    const { referenceId, status, transactionId } = req.body || {};

    if (!referenceId) {
      return res.status(400).json({ error: 'Reference ID required' });
    }

    // Verify webhook signature (implement provider-specific verification)
    // const isValid = verifyWebhookSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    // Update payment status in database
    await db.ref(`payments/${referenceId}`).update({
      status: status || 'completed',
      transactionId,
      completedAt: Date.now(),
    });

    console.log(`[PAYMENT] Payment ${referenceId} completed`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '1mb' },
  },
};
