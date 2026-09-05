/**
 * Likes API - Like/unlike notes, get like count
 * Requires authentication
 */

import admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth.js';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { noteId } = req.query;

    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    // GET - Get like count
    if (req.method === 'GET') {
      const likesSnapshot = await db.ref(`likes/${noteId}`).get();
      const likeCount = likesSnapshot.exists() ? Object.keys(likesSnapshot.val()).length : 0;

      const userLikeSnapshot = await db.ref(`likes/${noteId}/${user.userId}`).get();
      const userLiked = userLikeSnapshot.exists();

      return res.status(200).json({
        success: true,
        noteId,
        likeCount,
        liked: userLiked,
      });
    }

    // POST - Add like
    if (req.method === 'POST') {
      await db.ref(`likes/${noteId}/${user.userId}`).set(Date.now());

      const likesSnapshot = await db.ref(`likes/${noteId}`).get();
      const likeCount = likesSnapshot.exists() ? Object.keys(likesSnapshot.val()).length : 0;

      return res.status(200).json({
        success: true,
        message: 'Note liked',
        likeCount,
      });
    }

    // DELETE - Remove like
    if (req.method === 'DELETE') {
      await db.ref(`likes/${noteId}/${user.userId}`).remove();

      const likesSnapshot = await db.ref(`likes/${noteId}`).get();
      const likeCount = likesSnapshot.exists() ? Object.keys(likesSnapshot.val()).length : 0;

      return res.status(200).json({
        success: true,
        message: 'Like removed',
        likeCount,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Likes API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
