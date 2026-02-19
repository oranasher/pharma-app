'use client';

import { useMemo } from 'react';
import { AppUser, Task } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { getInitials } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { AlertTriangle, Check, Clock, ListChecks } from 'lucide-react';
import { differenceInDays, subDays, startOfToday } from 'date-fns';

interface UserPerformanceDialogProps {
  user: AppUser;
  tasks: Task[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}

export function UserPerformanceDialog({ user, tasks, open, onOpenChange }: UserPerformanceDialogProps) {
  const userTasks = useMemo(() => {
    return tasks.filter(task => task.assigneeId === user.uid);
  }, [tasks, user.uid]);

  const stats = useMemo(() => {
    const today = startOfToday();
    const ninetyDaysAgo = subDays(today, 90);

    const openTasks = userTasks.filter(t => t.status !== 'Completed');
    const overdueTasks = openTasks.filter(t => t.dueDate && differenceInDays(t.dueDate.toDate(), today) < 0).length;

    const completedLast90d = userTasks.filter(t =>
      t.status === 'Completed' &&
      t.completedAt &&
      t.completedAt.toDate() > ninetyDaysAgo
    );

    const completedOnTimeLast90d = completedLast90d.filter(t =>
      t.completedAt && t.dueDate && t.completedAt.toDate() <= t.dueDate.toDate()
    ).length;

    const onTimePercentage = completedLast90d.length > 0
      ? Math.round((completedOnTimeLast90d / completedLast90d.length) * 100)
      : 100;

    return {
      openTasks: openTasks.length,
      overdueTasks,
      completedLast90d: completedLast90d.length,
      onTimePercentage: `${onTimePercentage}%`,
    };
  }, [userTasks]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
              <AvatarFallback className="text-xl font-semibold">
                {getInitials(user.displayName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-2xl">{user.displayName}</DialogTitle>
              <DialogDescription>{user.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            <h3 className='font-semibold text-lg'>Performance Snapshot</h3>
           <div className="grid grid-cols-2 gap-4">
                <StatCard title="Open Tasks" value={stats.openTasks} icon={ListChecks} />
                <StatCard title="Overdue Tasks" value={stats.overdueTasks} icon={AlertTriangle} />
                <StatCard title="Completed (90d)" value={stats.completedLast90d} icon={Check} />
                <StatCard title="On-Time Rate (90d)" value={stats.onTimePercentage} icon={Clock} />
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

    