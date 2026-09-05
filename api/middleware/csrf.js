/**
 * CSRF Protection Middleware
 */

import crypto from 'crypto';

const CSRF_TOKEN_LENGTH = 32;
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * CSRF verification middleware
 */
export function verifyCsrf(req, res, next) {
  // GET and HEAD requests don't need CSRF check
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next ? next() : true;
  }

  const token = req.headers[CSRF_HEADER_NAME] || req.body?.csrfToken;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    const statusCode = 403;
    const response = { error: 'CSRF token validation failed' };
    
    if (res.status) {
      return res.status(statusCode).json(response);
    }
    
    return false;
  }

  return next ? next() : true;
}
