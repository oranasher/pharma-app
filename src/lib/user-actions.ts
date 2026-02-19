import { doc, writeBatch, Firestore } from 'firebase/firestore';
import { User, updateProfile } from 'firebase/auth';

/**
 * Initializes a user in Firestore after sign-up by creating their user and public_user documents.
 * This is intended to be called by the client right after a new user is created and signed in.
 *
 * @param firestore - The Firestore instance.
 * @param user - The Firebase Auth user object from the client.
 * @param displayName - The user's display name.
 */
export async function initializeUser(firestore: Firestore, user: User, displayName: string): Promise<void> {
  const userDocRef = doc(firestore, 'users', user.uid);
  const publicUserDocRef = doc(firestore, 'public_users', user.uid);

  const batch = writeBatch(firestore);

  const privateUserData = {
    uid: user.uid,
    email: user.email,
    displayName: displayName,
    role: 'user', // New users are always 'user' role by default. Admins are hardcoded.
    photoURL: user.photoURL,
    notificationPreferences: {
      emailEnabled: true,
      onStatusChange: true,
      onNewAssignment: true,
      dueSoonReminderDays: 3,
      onOverdue: true,
    },
    reportSettings: {
      frequency: 'never',
    },
    viewPreference: 'list',
    tasksViewPreferences: {
        hideCompleted: true,
    },
  };
  
  const publicUserData = {
     uid: user.uid,
    email: user.email,
    displayName: displayName,
    role: 'user',
    photoURL: user.photoURL,
  }

  batch.set(userDocRef, privateUserData);
  batch.set(publicUserDocRef, publicUserData);

  try {
    await batch.commit();
  } catch (error) {
    console.error("Error initializing user documents: ", error);
    // This could fail if security rules are incorrect.
    // The current rules should allow this:
    // /users/{userId} -> allow write: if isOwner(userId)
    // /public_users/{userId} -> allow create: if request.auth.uid != null
    throw error;
  }
}

/**
 * Updates a user's profile in both Firebase Auth and Firestore.
 *
 * @param firestore - The Firestore instance.
 * @param user - The Firebase Auth user object to update.
 * @param data - The data to update, e.g., { displayName: 'New Name' }.
 */
export async function updateUserProfile(firestore: Firestore, user: User, data: { displayName: string }): Promise<void> {
  // 1. Update Firebase Auth profile
  await updateProfile(user, { displayName: data.displayName });

  // 2. Update Firestore documents in a batch for atomicity
  const userDocRef = doc(firestore, 'users', user.uid);
  const publicUserDocRef = doc(firestore, 'public_users', user.uid);
  const batch = writeBatch(firestore);

  batch.update(userDocRef, { displayName: data.displayName });
  batch.update(publicUserDocRef, { displayName: data.displayName });
  
  await batch.commit();

  // 3. Force token refresh to propagate changes to the client-side user object.
  await user.getIdToken(true);
}
