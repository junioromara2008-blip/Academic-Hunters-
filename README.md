# Academic Hunters 🎓

An educational platform for students in Uganda providing AI-powered tutoring, collaborative learning, and academic resource sharing.

## Features

- **AI Tutors (23 AIs)**: Chat with AI-powered subject experts (Physics, Math, Biology, etc.)
- **Study Notes**: Upload and share PDFs, images, and documents (max 15MB)
- **Free Reading**: Access all study materials for free
- **Gamification**: Streak system, fireball rewards, and leaderboards
- **Peer Learning**: Connect with friends and study groups
- **Offline Support**: Notes stored locally in IndexedDB
- **Dark Mode**: Easy on the eyes for late-night studying
- **Mobile-First**: Optimized for Android and iOS

## Tech Stack

- **Frontend**: HTML5, JavaScript (Vanilla)
- **Backend**: Node.js + Vercel Serverless
- **Database**: IndexedDB (client-side), LocalStorage
- **AI**: OpenAI GPT-3.5-turbo API
- **Storage**: Base64 encoded in-browser storage
- **Deployment**: Vercel

## Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Vercel CLI (for deployment)
- OpenAI API key

### Installation

```bash
# Clone the repo
git clone https://github.com/junioromara2008-blip/Academic-Hunters-.git
cd Academic-Hunters-

# Install dependencies
npm install

# Create .env file
echo "OPENAI_API_KEY=your_key_here" > .env.local
```

### Local Development

```bash
npm run dev
```

Visit `http://localhost:3000`

### Production Build

```bash
npm run build
```

## Environment Variables

Create `.env.local` file:

```env
OPENAI_API_KEY=sk-xxxxxxxxxxxxx
```

## File Structure

```
Academic-Hunters-/
├── index.html          # Main SPA application
├── api/
│   ├── chat.js         # Vercel serverless function for AI chat
│   └── upload.js       # File upload validation endpoint
├── package.json        # Dependencies
├── vercel.json         # Vercel config
├── .env.example        # Environment variables template
├── .gitignore          # Git ignore rules
├── LICENSE             # Apache 2.0
└── README.md           # This file
```

## Key Features Explained

### File Upload Validation
- **Frontend**: 15MB size limit check + file type validation
- **Backend**: Server-side multer validation (15MB limit, PDF/image/doc only)
- **Pre-check**: `/api/upload` endpoint validates before upload
- **Allowed types**: PDF, JPG, PNG, GIF, DOC, DOCX

### AI Chat
- Conversational AI powered by GPT-3.5-turbo
- Maintains conversation history (last 10 messages)
- Educational context: helps students learn, prevents exam cheating
- Error handling with fallback messages

### Note Management
- Upload PDFs, images, documents
- Preview images and PDFs inline
- Search and filter by class/subject
- Like, bookmark, and mark as studied
- Download for offline access (requires payment)

### Gamification
- Daily login streaks
- Fireball rewards for engagement
- Share & Earn system
- Leaderboard rankings
- View count tracking for popular notes

### User Authentication
- Phone number login (Uganda: MTN/Airtel)
- Demo OTP: 123456
- Profile with picture and status
- Persistent sessions via localStorage

## API Endpoints

### POST /api/chat

Send message to AI tutor.

**Request:**
```json
{
  "message": "How do I solve quadratic equations?",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "assistant": "Ocet Robert",
  "subject": "Physics Main"
}
```

**Response:**
```json
{
  "text": "To solve quadratic equations..."
}
```

**Error Codes:**
- `400`: Missing/invalid message
- `413`: File too large (>15MB)
- `415`: Invalid file type
- `500`: Server error

### POST /api/upload

Validate file before upload.

**Request:**
```json
{
  "fileName": "math-notes.pdf",
  "fileSize": 5242880,
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "success": true,
  "fileName": "math-notes.pdf",
  "fileSize": 5242880,
  "fileSizeMB": "5.00",
  "extension": ".pdf"
}
```

## Database Structure

### IndexedDB (AHNotesDB)
- **Store**: `files`
- **Key**: `id` (timestamp)
- **Fields**: id, title, content, file (Base64), fileName, views, hot, downloadUnlocked

### LocalStorage Keys
- `ah_user`: Current logged-in user
- `ah_notes_text`: Text notes
- `ah_friends`: Friends list
- `ah_bookmarks`: Bookmarked notes
- `ah_likes`: Like counts
- `ah_fire`: Fireball points
- `ah_streak`: Login streak count
- `ah_dark`: Dark mode preference

## Deployment to Vercel

### 1. Push to GitHub
```bash
git add .
git commit -m "Your message"
git push
```

### 2. Deploy via Vercel
```bash
npm install -g vercel
vercel
```

Or connect GitHub repo directly at [vercel.com/new](https://vercel.com/new)

### 3. Set Environment Variable
In Vercel dashboard:
- Settings → Environment Variables
- Add `OPENAI_API_KEY` with your API key

### 4. Redeploy
```bash
vercel --prod
```

## Security Notes

⚠️ **Important:**
- Never commit `.env` files
- OpenAI API key is server-side only
- User data stored locally in browser
- File uploads limited to 15MB
- Admin phone numbers hardcoded (demo only - use secure auth in production)
- CORS headers configured for frontend access
- Input validation on all API endpoints

## Performance Optimizations

- Single-page application (no page reloads)
- IndexedDB for large file storage
- LocalStorage for metadata
- Base64 encoding for file transfers
- Lazy loading of notes
- Service worker ready (PWA)
- Vercel edge caching

## Known Limitations

- Files stored as Base64 in browser (limited by IndexedDB quota ~50MB)
- No backend database (all data client-side)
- No push notifications (web push ready but not configured)
- Demo OTP (123456 for testing)
- Admin access is phone number-based (not production-ready)

## Future Enhancements

- [ ] Database backend (MongoDB/Firebase)
- [ ] Real user authentication (OTP via Firebase)
- [ ] Mobile app (React Native)
- [ ] Real-time collaboration
- [ ] Video call support
- [ ] Payment integration (M-Pesa)
- [ ] Content moderation
- [ ] Analytics dashboard
- [ ] Teacher/admin panel
- [ ] Multi-language support
- [ ] Offline mode
- [ ] Search indexing

## Contributing

Pull requests welcome! Please follow:
1. Fork the repo
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open Pull Request

## License

Apache License 2.0 - See LICENSE file

## Support

- 📧 Email: junioromara2008@gmail.com
- 🌐 Live: https://academic-hunters.vercel.app
- 🇺🇬 Made for Uganda students
- 💬 Issues: https://github.com/junioromara2008-blip/Academic-Hunters-/issues

## Credits

Created by Junior Omara & Team

---

**Happy Learning! 📚🔥**
