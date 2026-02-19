'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, collectionGroup } from 'firebase/firestore';
import type { AppUser, Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DataTable } from '@/components/user/data-table';
import { getUserColumns } from '@/components/user/user-columns';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { PlusCircle, Users as UsersIcon, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { UserPerformanceDialog } from '@/components/user/user-performance-dialog';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';

function UsersPageContent() {
  const firestore = useFirestore();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  const usersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'public_users'), orderBy('displayName', 'asc'));
  }, [firestore]);

  const tasksQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collectionGroup(firestore, 'tasks'));
  }, [firestore]);
  
  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);

  const presenceStats = useMemo(() => {
    if (!users) return { online: 0, offline: 0 };
    const onlineThreshold = 120000; // 2 minutes
    const now = Date.now();
    
    const online = users.filter(u => {
        if (!u.lastSeen) return false;
        if (u.status === 'offline') return false;
        return (now - u.lastSeen.toDate().getTime()) < onlineThreshold;
    }).length;

    return {
        online,
        offline: users.length - online
    };
  }, [users]);

  const columns = useMemo(() => getUserColumns(setSelectedUser), [setSelectedUser]);
  const isLoading = areUsersLoading || areTasksLoading;

  return (
    <>
      <motion.div 
        className="grid gap-8 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
                <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
                    Personnel Control
                    <Badge className="bg-primary/20 text-primary border-primary/30 h-6">Level 4 Clearance</Badge>
                </h1>
                <p className="text-slate-400 font-medium text-sm">Real-time status and security override for all system officers.</p>
            </div>
            <Button asChild className="bg-primary hover:bg-primary/90 text-slate-950 font-black h-12 px-8 rounded-2xl shadow-lg shadow-primary/20">
                <Link href="/signup">
                    <PlusCircle className="mr-2 h-4 w-4" /> Initialize Officer
                </Link>
            </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-xl bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/10">
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary/60">Active Personnel</CardTitle>
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-black text-white">{presenceStats.online}</div>
                    <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Currently Synced</p>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/10">
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Standby</CardTitle>
                    <div className="h-2 w-2 rounded-full bg-slate-700" />
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-black text-slate-400">{presenceStats.offline}</div>
                    <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Station Offline</p>
                </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-slate-900/60 backdrop-blur-xl ring-1 ring-white/10">
                <CardHeader className="py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-rose-400">Total Force</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-rose-500 opacity-50" />
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-black text-white">{users?.length || 0}</div>
                    <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Registered Profiles</p>
                </CardContent>
            </Card>
        </div>

        <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-2xl rounded-3xl overflow-hidden ring-1 ring-white/5">
          <CardHeader className="border-b border-white/5 bg-white/[0.02] py-6">
            <CardTitle className="text-xl font-bold tracking-tight text-white uppercase">Officer Registry</CardTitle>
            <CardDescription className="text-xs text-slate-500">Global access control and performance monitoring suite.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <DataTable 
              columns={columns} 
              data={users ?? []} 
              isLoading={isLoading}
            />
          </CardContent>
        </Card>
      </motion.div>
      {selectedUser && (
        <UserPerformanceDialog
          user={selectedUser}
          tasks={tasks ?? []}
          open={!!selectedUser}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedUser(null);
            }
          }}
        />
      )}
    </>
  );
}

export default function UsersPage() {
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
            <div className="mx-auto p-4 rounded-full bg-red-500/20 w-fit text-red-500">
              <ShieldAlert className="h-12 w-12" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-white tracking-tighter uppercase">Access Denied</CardTitle>
              <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Level 4 Clearance Required</p>
            </div>
          </CardHeader>
          <CardContent className="text-center text-slate-400 text-sm font-medium leading-relaxed">
            Personnel files and security override modules are restricted to System Administrators. This access attempt has been logged.
          </CardContent>
        </Card>
      </div>
    );
  }

  return <UsersPageContent />;
}