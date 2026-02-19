/**
 * Firebase client-side configuration.
 * Using environment variables for security and flexibility across different hosting providers (Vercel, Netlify, etc.).
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCBzKtlLLH-mmu0fIj2ROQxZEHKEkAt7ZU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8601165454-ca26c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8601165454-ca26c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "studio-8601165454-ca26c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1090240770131",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1090240770131:web:bc89a4a8460f1ccd69d6a6",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ""
};
