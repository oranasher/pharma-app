'use client';

import { useEffect } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * PresenceManager handles the heartbeat for the current user.
 * It updates the user's lastSeen timestamp every 30 seconds.
 */
export function PresenceManager() {
  const { user } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!user || !firestore) return;

    const userRef = doc(firestore, 'public_users', user.uid);
    const privateRef = doc(firestore, 'users', user.uid);

    const updatePresence = (status: 'online' | 'offline') => {
      const data = {
        status,
        lastSeen: serverTimestamp(),
      };
      // Update both public and private profiles for consistency
      updateDoc(userRef, data).catch(() => {});
      updateDoc(privateRef, data).catch(() => {});
    };

    // Initial online status
    updatePresence('online');

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      }
    }, 30000);

    // Set offline on tab close/unload
    const handleUnload = () => {
      updatePresence('offline');
    };

    window.addEventListener('beforeunload', handleUnload);
    
    // Visibility change handling
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence('online');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, firestore]);

  return null;
}
