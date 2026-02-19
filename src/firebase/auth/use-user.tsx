'use client';

import { doc } from 'firebase/firestore';
import { useDoc } from '../firestore/use-doc';
import { useFirebase, useFirestore } from '../provider';
import type { AppUser } from '@/lib/types';
import { useMemo } from 'react';
import { ADMIN_UID } from '@/lib/admin';

/**
 * Hook specifically for accessing the authenticated user's state,
 * including their custom app-specific data from Firestore.
 * This version includes a robust, creative fix to prevent race conditions
 * in admin role identification.
 *
 * @returns An object containing:
 *  - `user`: The raw Firebase Auth User object.
 *  - `appUser`: The user's profile data from Firestore, with the role authoritatively corrected.
 *  - `isAdmin`: A boolean indicating if the user has admin privileges.
 *  - `isUserLoading`: True if auth state or user profile is loading.
 *  - `userError`: Any error from the underlying hooks.
 */
export function useUser() {
  const { user, isUserLoading: isAuthLoading, userError: authError } = useFirebase();
  const firestore = useFirestore();

  // Memoized reference to the user's profile document.
  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  // Fetch the user's profile data from Firestore.
  const {
    data: appUser,
    isLoading: isAppUserLoading,
    error: appUserError,
  } = useDoc<AppUser>(userDocRef);
  
  // --- Authoritative Admin Check ---
  // Step 1: The primary and most reliable check is the user's UID from Firebase Auth.
  const isAdminByUID = user ? user.uid === ADMIN_UID : false;

  // Step 2: Create a final, corrected user profile object.
  // This is the "creative fix": we use the definitive UID check to *correct* the data
  // coming from Firestore. This ensures that even if the database has a stale 'user' role,
  // the app's state reflects the reality that this user IS an admin.
  const finalAppUser = useMemo(() => {
      if (!appUser) return null;
      // If the UID check passed, we FORCE the role to be 'admin'.
      // This makes the UID the single source of truth for admin status.
      const role = isAdminByUID ? 'admin' : appUser.role;
      return { ...appUser, role: role };
  }, [appUser, isAdminByUID]);

  // Step 3: The final 'isAdmin' flag for the rest of the app is derived from the *corrected* user profile.
  // This ensures all parts of the app are consistent.
  const isAdmin = finalAppUser?.role === 'admin';

  // The user is considered "loading" until authentication is complete, AND, if a user is logged in,
  // until their Firestore profile has been loaded.
  const isUserLoading = isAuthLoading || (!!user && isAppUserLoading);
  const userError = authError || appUserError;

  return { user, appUser: finalAppUser, isAdmin, isUserLoading, userError };
}
