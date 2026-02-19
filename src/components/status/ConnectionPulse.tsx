'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ConnectionPulse() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(window.navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
      <div className="relative flex h-2 w-2">
        <AnimatePresence>
          {!isOnline && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"
            />
          )}
        </AnimatePresence>
        <span className={cn(
          "relative inline-flex h-2 w-2 rounded-full transition-colors duration-500",
          isOnline ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
        )} />
      </div>
      
      <span className={cn(
        "text-[9px] font-black uppercase tracking-[0.2em] hidden sm:block",
        isOnline ? "text-emerald-500/70" : "text-amber-500"
      )}>
        {isOnline ? "System Synced" : "Offline Mode"}
      </span>
      
      {isOnline ? <Wifi size={12} className="text-white/20" /> : <WifiOff size={12} className="text-amber-500 animate-pulse" />}
    </div>
  );
}
