/**
 * Updated chat endpoint with security enhancements
 * - Input sanitization
 * - Rate limiting
 * - Token verification
 * - Error handling
 */

import { verifyToken, requireAuth } from '../middleware/auth.js';
import { sanitizeInput, checkRateLimit } from '../../utils/validation.js';
import fetch from 'node-fetch';

const API_KEY = process.env.OPENAI_API_KEY;
const RATE_LIMIT_MAX = 50; // Lower limit for AI requests
const RATE_LIMIT_WINDOW = 3600000; // 1 hour

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    let user;
    try {
      user = verifyToken(req);
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Rate limiting per user
    const rateLimitKey = `chat:${user.userId}`;
    const rateLimit = await checkRateLimit(rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW);

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
      });
    }

    // Validate API key
    if (!API_KEY) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(500).json({
        error: 'AI service not configured',
      });
    }

    // Extract and sanitize input
    const { message, history = [], assistant = '', subject = '' } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required',
      });
    }

    // Sanitize user input
    const cleanMessage = sanitizeInput(message);
    if (!cleanMessage) {
      return res.status(400).json({
        error: 'Message cannot be empty',
      });
    }

    // Validate and sanitize history
    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map((item) => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: sanitizeInput(item.content || ''),
        }))
      : [];

    // Create educational system prompt
    let systemPrompt =
      'You are Academic Hunters AI, a helpful educational tutor. Help students understand school subjects clearly and step by step. Use simple, educational language appropriate for students. Do not help with exam cheating or homework completion - focus on teaching concepts.';

    if (assistant && subject) {
      systemPrompt = `You are ${sanitizeInput(assistant)}, a ${sanitizeInput(subject)} tutor at Academic Hunters. Help students understand ${sanitizeInput(subject)} clearly and step by step. Use simple educational language. Do not help students cheat on exams.`;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using cheaper model
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeHistory,
          { role: 'user', content: cleanMessage },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);

      if (data?.error?.code === 'invalid_api_key') {
        return res.status(401).json({
          error: 'API configuration error',
        });
      }

      if (data?.error?.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          error: 'AI service rate limited. Please try again in a moment.',
        });
      }

      return res.status(response.status || 500).json({
        error: 'AI service error. Please try again.',
      });
    }

    const answer = data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

    return res.status(200).json({
      text: sanitizeInput(answer),
      tokensUsed: data.usage?.total_tokens || 0,
    });
  } catch (error) {
    console.error('Chat error:', error);

    if (error.message.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Cannot reach AI service. Check your connection.',
      });
    }

    return res.status(500).json({
      error: 'Server error. Please try again later.',
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
};
