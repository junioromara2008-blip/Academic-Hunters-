export default async function handler(req, res) {
  // Set CORS headers
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
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error('OPENAI_API_KEY is not configured on Vercel');
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured. Contact administrator.'
      });
    }

    const { message, history = [], assistant = '', subject = '' } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Please enter a message.'
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message cannot be empty.'
      });
    }

    // Validate and sanitize history
    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: String(item.content || '').trim().slice(0, 3000)
        }))
      : [];

    // Create system prompt based on AI personality
    let systemPrompt = 'You are Academic Hunters AI, a helpful educational tutor. Help students understand school subjects clearly and step by step. Use simple, educational language appropriate for secondary school students. Do not help students cheat in live exams. Focus on teaching and explanation.';
    
    if (assistant && subject) {
      systemPrompt = `You are ${assistant}, a ${subject} tutor at Academic Hunters. Help students understand ${subject} clearly and step by step. Use simple educational language. Do not help students cheat in live exams. Focus on teaching and building understanding.`;
    }

    // Make request to OpenAI API
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            ...safeHistory,
            {
              role: 'user',
              content: message.trim().slice(0, 4000)
            }
          ],
          max_tokens: 1200,
          temperature: 0.7
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI API error:', data);

      // Handle specific OpenAI errors
      if (data?.error?.code === 'invalid_api_key') {
        return res.status(401).json({
          error: 'API key is invalid. Contact administrator.'
        });
      }

      if (data?.error?.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          error: 'Too many requests. Please try again in a moment.'
        });
      }

      if (data?.error?.code === 'context_length_exceeded') {
        return res.status(400).json({
          error: 'Message is too long. Please shorten your input.'
        });
      }

      return res.status(response.status).json({
        error: data?.error?.message || 'AI service error. Please try again.'
      });
    }

    const answer = data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

    return res.status(200).json({
      text: answer
    });

  } catch (error) {
    console.error('Server error:', error);

    // Handle network errors
    if (error.message.includes('fetch failed')) {
      return res.status(503).json({
        error: 'Cannot reach AI service. Please check your internet connection.'
      });
    }

    // Generic error response
    return res.status(500).json({
      error: 'Server error. Please try again later.'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb'
    }
  }
};
