/**
 * Input Validation & Sanitization Utilities
 */

import DOMPurify from 'dompurify';

/**
 * Validate Uganda phone number
 * Accepts: 077, 078, 076, 070, 075, 074 + 7 digits
 */
export function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') return null;
  
  const clean = phone.replace(/[^0-9]/g, '');
  
  // Handle 9-digit numbers (add leading 0)
  if (clean.length === 9) {
    return '0' + clean;
  }
  
  // Validate 10-digit Uganda format
  if (!/^(077|078|076|070|075|074|039|041)\d{7}$/.test(clean)) {
    return null;
  }
  
  return clean;
}

/**
 * Sanitize HTML to prevent XSS attacks
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Validate email address
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate file type and size
 */
export function validateFile(file) {
  const MAX_SIZE = 15 * 1024 * 1024; // 15MB
  const ALLOWED_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const errors = [];

  if (!file) {
    errors.push('File is required');
  }

  if (file.size > MAX_SIZE) {
    errors.push(`File too large. Maximum ${MAX_SIZE / 1024 / 1024}MB`);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    errors.push(`Invalid file type: ${file.type}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Sanitize user input text
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .substring(0, 5000) // Max 5000 chars
    .replace(/[<>"']/g, (char) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return escapeMap[char];
    });
}

/**
 * Validate JWT token format
 */
export function isValidJWT(token) {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(key, maxRequests = 100, windowMs = 900000) {
  // This should use Redis in production
  // For now, simple in-memory implementation
  const store = global.rateLimitStore || {};
  const now = Date.now();
  
  if (!store[key]) {
    store[key] = { count: 1, resetTime: now + windowMs };
    global.rateLimitStore = store;
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  const entry = store[key];
  
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  entry.count++;
  const allowed = entry.count <= maxRequests;
  const remaining = Math.max(0, maxRequests - entry.count);
  
  return { allowed, remaining, resetTime: entry.resetTime };
}
