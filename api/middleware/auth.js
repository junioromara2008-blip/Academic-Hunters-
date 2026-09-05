/**
 * JWT Authentication Middleware
 * Verifies tokens and attaches user to request
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export function requireAuth(handler) {
  return async (req, res) => {
    try {
      const user = verifyToken(req);
      req.user = user;
      return handler(req, res);
    } catch (error) {
      res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
      return res.status(401).json({ error: error.message });
    }
  };
}
