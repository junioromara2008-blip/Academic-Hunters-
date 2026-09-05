// Firebase configuration - use environment variables
// This file is NOT committed with real keys - keys come from Vercel environment

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

if (typeof window !== 'undefined') {
  // Client-side Firebase initialization
  const firebase = require('firebase/app');
  require('firebase/auth');
  require('firebase/database');
  require('firebase/storage');

  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  module.exports = firebase;
} else {
  // Server-side - export config only
  module.exports = { firebaseConfig };
}
