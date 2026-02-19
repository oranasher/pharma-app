import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    // When deployed to a Google Cloud environment (like App Hosting or Cloud Functions),
    // the GOOGLE_APPLICATION_CREDENTIALS environment variable is automatically set.
    // initializeApp() will use these credentials by default.
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    console.error('Firebase Admin initialization error', e);
    // In a local development environment, you would typically use a service account key file:
    // const serviceAccount = require('/path/to/your/serviceAccountKey.json');
    // admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
}

// Export the initialized services
export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
