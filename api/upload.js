/**
 * File upload validation endpoint
 * Validates file size and type before processing
 */

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileSize, mimeType } = req.body || {};

    // Validate inputs
    if (!fileName || !fileSize) {
      return res.status(400).json({
        error: 'Missing fileName or fileSize',
        code: 'MISSING_PARAMS'
      });
    }

    // Convert to number if string
    const size = typeof fileSize === 'string' ? parseInt(fileSize) : fileSize;

    // Check file size
    if (size > MAX_FILE_SIZE) {
      return res.status(413).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file: ${(size / 1024 / 1024).toFixed(2)}MB`,
        code: 'FILE_TOO_LARGE',
        maxSize: MAX_FILE_SIZE,
        receivedSize: size
      });
    }

    // Check file extension
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
    
    if (!allowedExtensions.includes(ext)) {
      return res.status(415).json({
        error: `Invalid file type '${ext}'. Allowed: PDF, JPG, PNG, GIF, DOC, DOCX`,
        code: 'INVALID_FILE_TYPE',
        received: ext,
        allowed: allowedExtensions
      });
    }

    // Check MIME type if provided
    if (mimeType && !Object.keys(ALLOWED_TYPES).includes(mimeType)) {
      return res.status(415).json({
        error: `Invalid MIME type '${mimeType}'`,
        code: 'INVALID_MIME_TYPE',
        received: mimeType,
        allowed: Object.keys(ALLOWED_TYPES)
      });
    }

    // Validation passed
    return res.status(200).json({
      success: true,
      message: 'File validation passed',
      fileName,
      fileSize: size,
      fileSizeMB: (size / 1024 / 1024).toFixed(2),
      extension: ext,
      mimeType: mimeType || 'unknown'
    });

  } catch (error) {
    console.error('Upload validation error:', error);

    return res.status(500).json({
      error: 'Validation server error',
      code: 'SERVER_ERROR',
      message: error.message
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    }
  }
};
