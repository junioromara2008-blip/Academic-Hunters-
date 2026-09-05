# Academic Hunters - Setup Guide

## Environment Variables

Create `.env.local` in the root directory with these variables:

### OpenAI Configuration
```
OPENAI_API_KEY=sk-your_actual_api_key_here
```

### Firebase Configuration
```
FIREBASE_API_KEY=AIzaSy...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}
```

### Security Configuration
```
JWT_SECRET=your_very_secure_random_string_minimum_32_characters_long
```

### Payment Configuration (M-Pesa)
```
MOMO_API_KEY=your_momo_api_key
MOMO_MERCHANT_ID=your_merchant_id
```

### Deployment Configuration
```
VERCEL_URL=https://academic-hunters.vercel.app
ALLOWED_ORIGINS=https://academic-hunters.vercel.app,http://localhost:3000
NODE_ENV=production
```

### Rate Limiting
```
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Installation

```bash
# Clone repository
git clone https://github.com/junioromara2008-blip/Academic-Hunters-.git
cd Academic-Hunters-

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Edit .env.local with your actual values
nano .env.local
```

## Local Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## Testing API Endpoints

### 1. Send OTP
```bash
curl -X POST http://localhost:3000/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0771234567","fullName":"Test User"}'
```

### 2. Verify OTP
```bash
curl -X POST http://localhost:3000/api/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber":"0771234567","otp":"123456","sessionId":"<sessionId_from_step_1">'
```

### 3. Create Note (Requires JWT Token)
```bash
curl -X POST http://localhost:3000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_from_step_2>" \
  -d '{"title":"Math Notes","content":"Chapter 1 content","subject":"Mathematics","className":"S4"}'
```

### 4. Get Notes
```bash
curl -X GET http://localhost:3000/api/notes \
  -H "Authorization: Bearer <token>"
```

### 5. Initiate Payment
```bash
curl -X POST http://localhost:3000/api/payment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"noteId":"note_123","amount":5000,"phoneNumber":"0771234567"}'
```

## Deployment to Vercel

### 1. Connect Repository
```bash
vercel
```

### 2. Set Environment Variables in Vercel Dashboard
- Go to Settings → Environment Variables
- Add all variables from `.env.example`

### 3. Deploy
```bash
vercel --prod
```

## Firebase Setup

1. Create Firebase Project at https://console.firebase.google.com
2. Enable Realtime Database
3. Enable Cloud Storage
4. Create service account key (Settings → Service Accounts → Generate)
5. Add all credentials to environment variables

## M-Pesa Integration

1. Sign up at M-Pesa Developer Portal
2. Get API Key and Merchant ID
3. Update environment variables
4. Replace sandbox API URL with production in `api/payment.js`

## Database Structure

```
users/
  {userId}/
    phone: string
    fullName: string
    createdAt: timestamp
    lastLogin: timestamp
    verified: boolean

notes/
  {noteId}/
    id: string
    title: string
    content: string
    subject: string
    className: string
    ownerId: string
    ownerName: string
    isPublic: boolean
    createdAt: timestamp
    updatedAt: timestamp
    views: number
    likes: number
    fileUrl: string
    fileName: string
    fileSize: number

user_notes/
  {userId}/
    {noteId}: true

bookmarks/
  {userId}/
    {noteId}: timestamp

likes/
  {noteId}/
    {userId}: timestamp

payments/
  {referenceId}/
    id: string
    userId: string
    noteId: string
    amount: number
    phoneNumber: string
    status: 'pending' | 'completed' | 'failed' | 'expired'
    createdAt: timestamp
    expiresAt: timestamp
    completedAt: timestamp
    transactionId: string

downloads/
  {userId}/
    {noteId}:
      unlockedAt: timestamp
      paymentId: string

otp_sessions/
  {phoneNumber}/
    otp: string
    sessionId: string
    fullName: string
    sentAt: timestamp
    expiresAt: timestamp
    attempts: number
```

## Troubleshooting

### Firebase Connection Issues
- Verify all Firebase credentials are correct
- Check CORS settings in Firebase Console
- Ensure service account has proper permissions

### Payment Integration Issues
- Check M-Pesa credentials
- Verify API endpoints in code match your provider
- Test with sandbox environment first

### Rate Limiting
- Default: 100 requests per 15 minutes
- AI chat: 50 requests per hour per user
- Adjust in environment variables

## Security Checklist

- [ ] Never commit `.env` files
- [ ] Rotate JWT_SECRET regularly
- [ ] Use strong, unique Firebase service account
- [ ] Enable HTTPS for production
- [ ] Configure proper CORS origins
- [ ] Set up Firebase security rules
- [ ] Enable Firebase audit logging
- [ ] Regular security audits

## Support

- Email: junioromara2008@gmail.com
- GitHub Issues: https://github.com/junioromara2008-blip/Academic-Hunters-/issues
- Live Demo: https://academic-hunters.vercel.app
