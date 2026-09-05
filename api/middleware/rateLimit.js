/**
 * Rate limiting middleware
 */

import { checkRateLimit } from '../validation.js';

const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

export async function rateLimit(req, res, next) {
  try {
    // Use IP address or user ID as rate limit key
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const key = `rate_limit:${clientIp}`;

    const result = await checkRateLimit(key, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetTime || Date.now() + RATE_LIMIT_WINDOW);

    if (!result.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
      });
    }

    if (next) return next();
  } catch (error) {
    console.error('Rate limit error:', error);
    if (next) return next();
  }
}

export default rateLimit;
