/**
 * Download endpoint - allows users to download notes they've paid for
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
const storage = admin.storage();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Get note metadata
    const noteSnapshot = await db.ref(`notes/${noteId}`).get();
    if (!noteSnapshot.exists()) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = noteSnapshot.val();

    // Check if user has access to download
    const downloadSnapshot = await db.ref(`downloads/${user.userId}/${noteId}`).get();
    const isOwner = note.ownerId === user.userId;
    const hasDownloadAccess = downloadSnapshot.exists() || isOwner;

    if (!hasDownloadAccess) {
      return res.status(403).json({
        error: 'Access denied. Please purchase the note first.',
      });
    }

    // Generate signed URL for file download
    if (note.fileUrl) {
      return res.status(200).json({
        success: true,
        fileName: note.fileName,
        downloadUrl: note.fileUrl,
        fileSize: note.fileSize,
        message: 'Download link generated',
      });
    }

    return res.status(404).json({
      error: 'No file associated with this note',
    });
  } catch (error) {
    console.error('Download error:', error);
    return res.status(500).json({ error: 'Failed to process download' });
  }
}
