'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useFirestore, useUser, useAuth } from '@/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { AppUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShieldCheck, 
  UserMinus, 
  Lock, 
  Unlock, 
  RotateCcw, 
  UserPlus, 
  Search,
  MoreVertical,
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/app/dashboard/layout';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';

export function AdminConsole() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { appUser } = useUser();
  const { allUsers, isLoading } = useDashboardData();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const handleToggleRole = async (user: AppUser) => {
    if (!firestore) return;
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      const userRef = doc(firestore, 'users', user.uid);
      const publicRef = doc(firestore, 'public_users', user.uid);
      await updateDoc(userRef, { role: newRole });
      await updateDoc(publicRef, { role: newRole });
      toast({ title: "Role Escalated", description: `${user.displayName} is now ${newRole.toUpperCase()}.` });
    } catch (e) {
      toast({ variant: "destructive", title: "Override Failed" });
    }
  };

  const handleToggleLock = async (user: AppUser) => {
    if (!firestore) return;
    const newStatus = user.accountStatus === 'locked' ? 'active' : 'locked';
    try {
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, { accountStatus: newStatus });
      toast({ 
        title: newStatus === 'locked' ? "Account Frozen" : "Access Restored", 
        description: `Operational status for ${user.displayName} updated.` 
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Update Error" });
    }
  };

  const handlePasswordReset = async (email: string) => {
    if (!auth || !email) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Signal Sent", description: "Password reset uplink transmitted to user email." });
    } catch (e) {
      toast({ variant: "destructive", title: "Transmission Error" });
    }
  };

  if (isLoading) return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase flex items-center gap-4">
            System Administration
            <Badge className="bg-primary/20 text-primary border-primary/30 h-6">Clearance Level 4</Badge>
          </h1>
          <p className="text-slate-400 font-medium text-sm">Centralized control for PharmaTask personnel and security protocols.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search personnel..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-slate-900/50 border-white/10 text-white"
            />
          </div>
          <Button asChild className="bg-primary hover:bg-primary/90 text-slate-950 font-black">
            <Link href="/signup">
              <UserPlus className="mr-2 h-4 w-4" /> Initialize Officer
            </Link>
          </Button>
        </div>
      </header>

      <Card className="border-white/10 bg-slate-900/60 backdrop-blur-2xl overflow-hidden shadow-2xl rounded-3xl">
        <Table>
          <TableHeader className="bg-white/[0.02]">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest pl-8">Officer</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Email Vector</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Role</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Clearance</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest">Status</TableHead>
              <TableHead className="text-slate-500 font-black uppercase text-[10px] tracking-widest text-right pr-8">Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.uid} className={cn(
                "border-white/5 transition-all duration-300 group",
                user.accountStatus === 'locked' && "opacity-40 grayscale"
              )}>
                <TableCell className="pl-8">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-white/5 group-hover:ring-primary/20 transition-all">
                      <AvatarImage src={user.photoURL ?? ''} />
                      <AvatarFallback className="bg-slate-800 text-xs font-black text-white">{getInitials(user.displayName)}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-white tracking-tight">{user.displayName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-400 font-mono text-xs">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "uppercase font-black text-[9px] tracking-widest px-3 h-6",
                    user.role === 'admin' ? "border-primary/40 text-primary bg-primary/10" : "border-slate-700 text-slate-400"
                  )}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={user.role === 'admin'} 
                      onCheckedChange={() => handleToggleRole(user)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <ShieldCheck className={cn("h-4 w-4 transition-colors", user.role === 'admin' ? "text-primary" : "text-slate-700")} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full shadow-[0_0_8px_currentColor]", user.accountStatus === 'locked' ? "bg-red-500 text-red-500" : "bg-emerald-500 text-emerald-500")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", user.accountStatus === 'locked' ? "text-red-500" : "text-emerald-500")}>
                      {user.accountStatus === 'locked' ? 'Frozen' : 'Active'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-8">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-white/5 rounded-full">
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-950 border-white/10 rounded-2xl p-2 shadow-2xl">
                      <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-3 py-2">Officer Control</DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="rounded-xl focus:bg-white/5 focus:text-white gap-3 cursor-pointer" onClick={() => handleToggleLock(user)}>
                        {user.accountStatus === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}
                        <span className="text-sm font-bold">{user.accountStatus === 'locked' ? 'Unfreeze Access' : 'Freeze Account'}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-xl focus:bg-white/5 focus:text-white gap-3 cursor-pointer" onClick={() => handlePasswordReset(user.email!)}>
                        <RotateCcw size={16} />
                        <span className="text-sm font-bold">Transmit Reset Link</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/5" />
                      <DropdownMenuItem className="rounded-xl focus:bg-rose-500/10 focus:text-rose-500 gap-3 cursor-pointer text-rose-500/70">
                        <UserMinus size={16} />
                        <span className="text-sm font-bold">Decommission Agent</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
