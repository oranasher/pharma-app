
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { motion } from 'framer-motion';
import { Logo } from '@/components/logo';

export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-950 gap-12 p-6">
      <div className="relative flex items-center justify-center">
        {/* Glowing Tech Ring */}
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute h-40 w-40 rounded-full border-2 border-dashed border-primary/20"
        />
        <motion.div 
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute h-48 w-48 rounded-full border border-primary/10"
        />
        <motion.div
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative z-10"
        >
          <Logo className="h-20 w-20 text-primary drop-shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="text-center space-y-1">
          <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white">System Authorization</h2>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Establishing Uplink</p>
        </div>
        
        <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: '100%' }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 w-1/2 bg-primary shadow-[0_0_20px_rgba(var(--primary),0.8)]"
          />
        </div>
        
        <div className="flex justify-between w-full px-1">
          <span className="text-[8px] font-mono text-slate-500 uppercase">Protocol: Secure</span>
          <span className="text-[8px] font-mono text-slate-500 uppercase">Ready</span>
        </div>
      </div>
    </div>
  );
}
