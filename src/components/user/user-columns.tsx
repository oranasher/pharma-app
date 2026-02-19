'use client';

import { ColumnDef } from '@tanstack/react-table';
import { AppUser, UserRole } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/task/data-table-column-header';
import { cn, getInitials } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { PresenceIndicator } from './presence-indicator';
import { 
  MoreHorizontal, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  RotateCcw, 
  UserMinus 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useFirestore, useAuth } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';

const roleStyles: { [key in UserRole]: string } = {
  admin: 'bg-red-500',
  user: 'bg-blue-500',
};

export const getUserColumns = (onViewProfile: (user: AppUser) => void): ColumnDef<AppUser>[] => {
  const columns: ColumnDef<AppUser>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'displayName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Officer Name" />,
      cell: ({ row }) => {
        const user = row.original;
        const isLocked = user.accountStatus === 'locked';
        return (
          <div className={cn("flex items-center gap-3 transition-opacity", isLocked && "opacity-40")}>
             <div className="relative group">
                <Avatar className="h-9 w-9 ring-2 ring-primary/5 transition-all group-hover:ring-primary/20">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                    <AvatarFallback className="text-xs font-semibold">
                        {getInitials(user.displayName)}
                    </AvatarFallback>
                </Avatar>
                <PresenceIndicator user={user} variant="dot" />
             </div>
            <div className="flex flex-col">
                <Button variant="link" className="p-0 h-auto font-bold justify-start text-foreground hover:no-underline" onClick={() => onViewProfile(user)}>
                    {user.displayName}
                </Button>
                <PresenceIndicator user={user} className="mt-0.5" />
            </div>
          </div>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Comm Vector (Email)" />,
      cell: ({ row }) => {
        return <div className="text-muted-foreground font-mono text-xs">{row.getValue('email')}</div>;
      },
    },
    {
      accessorKey: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Clearance" />,
      cell: ({ row }) => {
        const user = row.original;
        const firestore = useFirestore();
        const { toast } = useToast();
        
        const handleToggleRole = async () => {
            const newRole = user.role === 'admin' ? 'user' : 'admin';
            try {
                const userRef = doc(firestore, 'users', user.uid);
                const publicRef = doc(firestore, 'public_users', user.uid);
                await updateDoc(userRef, { role: newRole });
                await updateDoc(publicRef, { role: newRole });
                toast({ title: "Clearance Updated", description: `${user.displayName} is now ${newRole.toUpperCase()}.` });
            } catch (e) {
                toast({ variant: "destructive", title: "Override Failed" });
            }
        };

        return (
          <div className="flex items-center gap-3">
            <Switch 
                checked={user.role === 'admin'} 
                onCheckedChange={handleToggleRole}
                className="data-[state=checked]:bg-primary"
            />
            <Badge className={cn(roleStyles[user.role], 'hover:text-white capitalize text-[10px] font-black tracking-widest')} variant="outline">
                {user.role}
            </Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
        accessorKey: 'accountStatus',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
        cell: ({ row }) => {
            const status = row.original.accountStatus || 'active';
            const isLocked = status === 'locked';
            return (
                <div className="flex items-center gap-2">
                    <div className={cn("h-1.5 w-1.5 rounded-full", isLocked ? "bg-red-500 animate-pulse" : "bg-emerald-500")} />
                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isLocked ? "text-red-500" : "text-emerald-500")}>
                        {isLocked ? 'Frozen' : 'Operational'}
                    </span>
                </div>
            );
        }
    },
    {
      id: 'actions',
      header: () => <div className="text-right">Control</div>,
      cell: ({ row }) => {
        const user = row.original;
        const firestore = useFirestore();
        const auth = useAuth();
        const { toast } = useToast();

        const handleToggleLock = async () => {
            const newStatus = user.accountStatus === 'locked' ? 'active' : 'locked';
            try {
                const userRef = doc(firestore, 'users', user.uid);
                await updateDoc(userRef, { accountStatus: newStatus });
                toast({ 
                    title: newStatus === 'locked' ? "Account Frozen" : "Operational Status Restored", 
                    description: `Officer ${user.displayName} updated.` 
                });
            } catch (e) {
                toast({ variant: "destructive", title: "Update Error" });
            }
        };

        const handlePasswordReset = async () => {
            if (!auth || !user.email) return;
            try {
                await sendPasswordResetEmail(auth, user.email);
                toast({ title: "Signal Sent", description: "Password reset uplink transmitted to officer email." });
            } catch (e) {
                toast({ variant: "destructive", title: "Transmission Error" });
            }
        };

        return (
            <div className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-950 border-white/10 rounded-2xl p-2 shadow-2xl">
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-500 px-3 py-2">Officer Access Control</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        <DropdownMenuItem className="rounded-xl focus:bg-white/5 focus:text-white gap-3 cursor-pointer" onClick={handleToggleLock}>
                            {user.accountStatus === 'locked' ? <Unlock size={16} /> : <Lock size={16} />}
                            <span className="text-sm font-bold">{user.accountStatus === 'locked' ? 'Unfreeze Access' : 'Freeze Account'}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-xl focus:bg-white/5 focus:text-white gap-3 cursor-pointer" onClick={handlePasswordReset}>
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
            </div>
        );
      }
    }
  ];
  return columns;
};
