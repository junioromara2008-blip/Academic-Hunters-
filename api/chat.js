import multer from 'multer';
import { json } from 'body-parser';

// Configure multer with 15MB file size limit
const upload = multer({
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF, images, and document files
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Accepted: PDF, JPG, PNG, GIF, DOC, DOCX`));
    }
  }
});

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
      return res.status(500).json({
        error: 'OPENAI_API_KEY is not configured on Vercel.'
      });
    }

    const { message, history = [], file, fileName } = req.body || {};

    // Validate file size if file is provided
    if (file) {
      const fileSizeInBytes = Buffer.byteLength(file, 'base64');
      const maxSizeInBytes = 15 * 1024 * 1024; // 15MB

      if (fileSizeInBytes > maxSizeInBytes) {
        return res.status(413).json({
          error: `File too large. Maximum size is 15MB. Received: ${(fileSizeInBytes / 1024 / 1024).toFixed(2)}MB`
        });
      }

      // Validate file type from filename
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.doc', '.docx'];
      const fileExtension = fileName ? fileName.substring(fileName.lastIndexOf('.')).toLowerCase() : '';
      
      if (!allowedExtensions.includes(fileExtension)) {
        return res.status(415).json({
          error: `Invalid file type. Allowed: PDF, JPG, PNG, GIF, DOC, DOCX. Received: ${fileExtension}`
        });
      }
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Please enter a message.'
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-10).map(item => ({
          role: item.role === 'assistant' ? 'assistant' : 'user',
          content: String(item.content || '').slice(0, 3000)
        }))
      : [];

    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are Academic Hunters AI. Help students understand school subjects clearly and step by step. Use simple educational language. Do not help students cheat in live examinations.'
            },
            ...safeHistory,
            {
              role: 'user',
              content: message.trim().slice(0, 4000)
            }
          ],
          max_tokens: 1200
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', data);

      return res.status(response.status).json({
        error: data?.error?.message || 'AI service error.'
      });
    }

    return res.status(200).json({
      text: data.choices[0]?.message?.content || 'Sorry, I could not generate an answer.'
    });

  } catch (error) {
    console.error('Server error:', error);

    // Handle multer file size errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large. Maximum size is 15MB.'
      });
    }

    if (error.message.includes('File type not allowed')) {
      return res.status(415).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: 'Server error. Please try again.'
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb'
    }
  }
};
