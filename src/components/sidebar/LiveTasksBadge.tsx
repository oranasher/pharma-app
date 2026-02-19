'use client';

import { useMemo, useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { SidebarMenuBadge } from '@/components/ui/sidebar';

export function LiveTasksBadge() {
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();
  const [openTasksCount, setOpenTasksCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // This query is now just for defining what to count
  const openTasksQuery = useMemo(() => {
    if (!firestore || !user || isAdmin) return null;
    return query(collection(firestore, 'users', user.uid, 'tasks'), where('status', '!=', 'Completed'));
  }, [firestore, user, isAdmin]);

  useEffect(() => {
    // If the query isn't ready, do nothing.
    if (!openTasksQuery) {
      setOpenTasksCount(0);
      setIsLoading(false);
      return;
    }

    // Fetch the count from the server once.
    setIsLoading(true);
    getCountFromServer(openTasksQuery)
      .then((snapshot) => {
        setOpenTasksCount(snapshot.data().count);
      })
      .catch((error) => {
        // Don't show an error for the badge, just log it.
        console.error("Error fetching task count for badge:", error);
        setOpenTasksCount(0);
      })
      .finally(() => {
        setIsLoading(false);
      });
      
    // Note: We are no longer using a real-time listener (useCollection) here
    // to prevent performance issues from frequent re-renders of the entire layout.
    // This hook now runs once on mount or when the user changes.
  }, [openTasksQuery]);


  if (isLoading || openTasksCount === 0) {
    return null;
  }

  return <SidebarMenuBadge>{openTasksCount}</SidebarMenuBadge>;
}
