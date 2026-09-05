/**
 * Notes API - Create, Read, Update, Delete
 * All operations backed by Firebase Realtime Database
 * Requires authentication
 */

import admin from 'firebase-admin';
import { verifyToken } from '../middleware/auth.js';
import { sanitizeInput, validateFile } from '../../utils/validation.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify authentication
    const user = verifyToken(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.query;

    // GET - List user's notes
    if (req.method === 'GET') {
      return handleGetNotes(user, id, res);
    }

    // POST - Create new note
    if (req.method === 'POST') {
      return handleCreateNote(user, req.body, res);
    }

    // PUT - Update note
    if (req.method === 'PUT') {
      return handleUpdateNote(user, id, req.body, res);
    }

    // DELETE - Delete note
    if (req.method === 'DELETE') {
      return handleDeleteNote(user, id, res);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Notes API error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET - Retrieve notes (user's notes or all public notes)
 */
async function handleGetNotes(user, noteId, res) {
  try {
    if (noteId) {
      // Get single note by ID
      const noteSnapshot = await db.ref(`notes/${noteId}`).get();
      if (!noteSnapshot.exists()) {
        return res.status(404).json({ error: 'Note not found' });
      }

      const note = noteSnapshot.val();

      // Check permissions (owner or public)
      if (note.ownerId !== user.userId && !note.isPublic) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Increment view count
      await db.ref(`notes/${noteId}/views`).set((note.views || 0) + 1);

      return res.status(200).json({
        id: noteId,
        ...note,
        views: (note.views || 0) + 1,
      });
    } else {
      // Get all user's notes + public notes
      const userNotesSnapshot = await db.ref(`user_notes/${user.userId}`).get();
      const userNoteIds = userNotesSnapshot.exists() ? Object.keys(userNotesSnapshot.val()) : [];

      const notes = [];
      for (const id of userNoteIds) {
        const noteSnapshot = await db.ref(`notes/${id}`).get();
        if (noteSnapshot.exists()) {
          notes.push({
            id,
            ...noteSnapshot.val(),
          });
        }
      }

      // Sort by creation date (newest first)
      notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      return res.status(200).json({
        success: true,
        notes,
        total: notes.length,
      });
    }
  } catch (error) {
    console.error('Get notes error:', error);
    return res.status(500).json({ error: 'Failed to retrieve notes' });
  }
}

/**
 * POST - Create new note
 */
async function handleCreateNote(user, body, res) {
  try {
    const { title, content, subject, className, fileData, isPublic = false } = body || {};

    // Validate input
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Title is required' });
    }

    const cleanTitle = sanitizeInput(title);
    const cleanContent = sanitizeInput(content || '');
    const cleanSubject = sanitizeInput(subject || '');

    if (!cleanTitle) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }

    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const note = {
      id: noteId,
      title: cleanTitle,
      content: cleanContent,
      subject: cleanSubject,
      className: sanitizeInput(className || ''),
      ownerId: user.userId,
      ownerName: user.fullName,
      isPublic,
      createdAt: now,
      updatedAt: now,
      views: 0,
      likes: 0,
      fileUrl: null,
    };

    // Handle file upload if provided
    if (fileData && fileData.base64) {
      try {
        const fileName = `${noteId}_${fileData.name || 'file'}`;
        const bucket = storage.bucket();
        const file = bucket.file(`notes/${user.userId}/${fileName}`);

        const buffer = Buffer.from(fileData.base64, 'base64');
        await file.save(buffer, {
          metadata: {
            contentType: fileData.mimeType || 'application/octet-stream',
          },
        });

        const [url] = await file.getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 year
        });

        note.fileUrl = url;
        note.fileName = fileData.name;
        note.fileSize = fileData.size;
      } catch (uploadError) {
        console.error('File upload error:', uploadError);
        return res.status(500).json({ error: 'File upload failed' });
      }
    }

    // Save note to database
    await db.ref(`notes/${noteId}`).set(note);
    await db.ref(`user_notes/${user.userId}/${noteId}`).set(true);

    return res.status(201).json({
      success: true,
      message: 'Note created successfully',
      note,
    });
  } catch (error) {
    console.error('Create note error:', error);
    return res.status(500).json({ error: 'Failed to create note' });
  }
}

/**
 * PUT - Update note
 */
async function handleUpdateNote(user, noteId, body, res) {
  try {
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const noteSnapshot = await db.ref(`notes/${noteId}`).get();
    if (!noteSnapshot.exists()) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = noteSnapshot.val();

    // Check ownership
    if (note.ownerId !== user.userId) {
      return res.status(403).json({ error: 'You can only edit your own notes' });
    }

    const { title, content, subject, className, isPublic } = body || {};

    // Update fields
    if (title !== undefined) note.title = sanitizeInput(title);
    if (content !== undefined) note.content = sanitizeInput(content);
    if (subject !== undefined) note.subject = sanitizeInput(subject);
    if (className !== undefined) note.className = sanitizeInput(className);
    if (isPublic !== undefined) note.isPublic = isPublic;

    note.updatedAt = Date.now();

    await db.ref(`notes/${noteId}`).set(note);

    return res.status(200).json({
      success: true,
      message: 'Note updated successfully',
      note,
    });
  } catch (error) {
    console.error('Update note error:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
}

/**
 * DELETE - Delete note
 */
async function handleDeleteNote(user, noteId, res) {
  try {
    if (!noteId) {
      return res.status(400).json({ error: 'Note ID is required' });
    }

    const noteSnapshot = await db.ref(`notes/${noteId}`).get();
    if (!noteSnapshot.exists()) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const note = noteSnapshot.val();

    // Check ownership
    if (note.ownerId !== user.userId) {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    // Delete file from storage if exists
    if (note.fileName) {
      try {
        const bucket = storage.bucket();
        const file = bucket.file(`notes/${user.userId}/${note.id}_${note.fileName}`);
        await file.delete();
      } catch (fileError) {
        console.error('File deletion error:', fileError);
        // Continue with note deletion even if file deletion fails
      }
    }

    // Delete from database
    await db.ref(`notes/${noteId}`).remove();
    await db.ref(`user_notes/${user.userId}/${noteId}`).remove();

    return res.status(200).json({
      success: true,
      message: 'Note deleted successfully',
    });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '20mb' },
  },
};
