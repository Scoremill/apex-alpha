import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isConfigured = firebaseConfig.apiKey && firebaseConfig.projectId;

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isConfigured) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Helper to get Firestore (throws if not configured)
export function getDb(): Firestore {
  if (!db) {
    throw new Error('Firebase is not configured. Please add your Firebase credentials to .env.local');
  }
  return db;
}

// Helper to get Auth (throws if not configured)
export function getAuthInstance(): Auth {
  if (!auth) {
    throw new Error('Firebase is not configured. Please add your Firebase credentials to .env.local');
  }
  return auth;
}

// Export instances (may be null if not configured)
export { db, auth };

// Collection references (safe to call, will throw if db is null when accessed)
export const tickersCollection = () => {
  const firestore = getDb();
  return collection(firestore, 'tickers');
};

export const watchlistsCollection = () => {
  const firestore = getDb();
  return collection(firestore, 'watchlists');
};

export const signalsCollection = () => {
  const firestore = getDb();
  return collection(firestore, 'signals');
};

export const sentimentCollection = () => {
  const firestore = getDb();
  return collection(firestore, 'sentiments');
};

export const sentimentHistoryCollection = (symbol: string) => {
  const firestore = getDb();
  return collection(firestore, 'sentiments', symbol, 'history');
};

// Document references
export const tickerDoc = (symbol: string) => {
  const firestore = getDb();
  return doc(firestore, 'tickers', symbol);
};

export const sentimentDoc = (symbol: string) => {
  const firestore = getDb();
  return doc(firestore, 'sentiments', symbol);
};

export const watchlistDoc = (id: string) => {
  const firestore = getDb();
  return doc(firestore, 'watchlists', id);
};

export default app;
