'use client';

import React from 'react';
import { useUser } from '@/firebase';
import { AdminConsole } from '@/components/admin/AdminConsole';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShieldAlert, Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { isAdmin, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-lg border-red-500/50 bg-red-500/5 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-red-500/20 w-fit">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-white tracking-tighter uppercase">Access Denied</CardTitle>
              <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Level 4 Clearance Required</p>
            </div>
          </CardHeader>
          <CardContent className="text-center text-slate-400 text-sm font-medium leading-relaxed">
            Your biometric signature does not match the required authorization level for the System Administration Console. This attempt has been logged in the Data Vault.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AdminConsole />;
}
