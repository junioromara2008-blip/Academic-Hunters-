/**
 * Bookmarks API - Add, remove, list bookmarked notes
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

    // GET - List bookmarked notes
    if (req.method === 'GET') {
      const bookmarksSnapshot = await db.ref(`bookmarks/${user.userId}`).get();
      const bookmarks = bookmarksSnapshot.exists() ? Object.keys(bookmarksSnapshot.val()) : [];

      return res.status(200).json({
        success: true,
        bookmarks,
        total: bookmarks.length,
      });
    }

    // POST - Add bookmark
    if (req.method === 'POST') {
      if (!noteId) {
        return res.status(400).json({ error: 'Note ID is required' });
      }

      await db.ref(`bookmarks/${user.userId}/${noteId}`).set(Date.now());

      return res.status(200).json({
        success: true,
        message: 'Note bookmarked',
      });
    }

    // DELETE - Remove bookmark
    if (req.method === 'DELETE') {
      if (!noteId) {
        return res.status(400).json({ error: 'Note ID is required' });
      }

      await db.ref(`bookmarks/${user.userId}/${noteId}`).remove();

      return res.status(200).json({
        success: true,
        message: 'Bookmark removed',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bookmarks API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
