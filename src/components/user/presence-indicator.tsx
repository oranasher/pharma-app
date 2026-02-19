'use client';

import { AppUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';

interface PresenceIndicatorProps {
  user?: AppUser;
  userId?: string;
  users?: AppUser[] | null;
  hideText?: boolean;
  className?: string;
  variant?: 'dot' | 'label';
}

export function PresenceIndicator({ 
  user, 
  userId, 
  users, 
  hideText = false, 
  className,
  variant = 'label'
}: PresenceIndicatorProps) {
  const targetUser = useMemo(() => {
    if (user) return user;
    if (userId && users) {
      return users.find(u => u.uid === userId);
    }
    return null;
  }, [user, userId, users]);

  const isOnline = useMemo(() => {
    if (!targetUser?.lastSeen) return false;
    if (targetUser.status === 'offline') return false;
    
    // Consider online if lastSeen is within the last 2 minutes
    const lastSeenDate = targetUser.lastSeen.toDate();
    const diff = Date.now() - lastSeenDate.getTime();
    return diff < 120000; // 2 minutes
  }, [targetUser]);

  if (!targetUser) return null;

  if (variant === 'dot') {
    return (
      <div className={cn("absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background", className)}>
        {isOnline && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={cn(
          "relative block h-full w-full rounded-full",
          isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-300"
        )}></span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-2 w-2">
        {isOnline && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
        )}
        <span className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" : "bg-slate-300"
        )}></span>
      </div>
      
      {!hideText && !isOnline && targetUser.lastSeen && (
        <span className="text-[10px] text-muted-foreground italic whitespace-nowrap">
          Last seen {formatDistanceToNow(targetUser.lastSeen.toDate(), { addSuffix: true })}
        </span>
      )}
      
      {!hideText && isOnline && (
        <span className="text-[10px] text-green-600 font-bold uppercase tracking-tight">
          Active
        </span>
      )}
    </div>
  );
}
