'use client';

import { useEffect, useMemo } from 'react';
import { useSidebar } from '@/components/ui/sidebar';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { collection, query, where, orderBy, Query } from 'firebase/firestore';
import type { Task } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/empty-state';
import { motion } from 'framer-motion';

const priorityOrder: Record<string, number> = { High: 1, Medium: 2, Low: 3 };

function FocusTaskItem({ task }: { task: Task }) {
  if (!task.dueDate) return null;
  
  const dueDate = task.dueDate.toDate();
  const daysDiff = differenceInCalendarDays(dueDate, startOfToday());
  let dueDateBadgeVariant: 'destructive' | 'warning' | 'outline' = 'outline';

  if (daysDiff < 0) {
    dueDateBadgeVariant = 'destructive';
  } else if (daysDiff <= 3) {
    dueDateBadgeVariant = 'warning';
  }

  return (
    <Link href={`/dashboard/tasks/${task.id}?userId=${task.assigneeId}`}>
      <div className="flex items-center justify-between rounded-lg border bg-card p-4 transition-all hover:bg-accent hover:shadow-md">
        <div>
          <p className="font-semibold">{task.name}</p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Priority: {task.priority || 'Medium'}</span>
            <span>Due: {format(dueDate, 'MMM d')}</span>
          </div>
        </div>
        <Badge variant={dueDateBadgeVariant} className="hidden sm:inline-flex">
          {daysDiff < 0 ? `${Math.abs(daysDiff)}d overdue` : `in ${daysDiff}d`}
        </Badge>
        <ArrowRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function FocusPage() {
  const { setFocusMode } = useSidebar();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    setFocusMode(true);
    // Cleanup function to exit focus mode when the component unmounts
    return () => setFocusMode(false);
  }, [setFocusMode]);

  const userTasksQuery = useMemo(() => {
    if (firestore && user) {
      return query(
        collection(firestore, 'users', user.uid, 'tasks'),
        where('status', '!=', 'Completed')
      );
    }
    return null;
  }, [firestore, user]);

  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(userTasksQuery as Query<Task>);

  const importantTasks = useMemo(() => {
    if (!tasks) return [];
    const today = startOfToday();
    
    return [...tasks]
      .sort((a, b) => {
        // Safety: handle missing dates
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;

        const aDate = a.dueDate.toDate();
        const bDate = b.dueDate.toDate();

        // 1. Overdue tasks first
        const aIsOverdue = differenceInCalendarDays(aDate, today) < 0;
        const bIsOverdue = differenceInCalendarDays(bDate, today) < 0;
        if (aIsOverdue !== bIsOverdue) return aIsOverdue ? -1 : 1;

        // 2. Sort by priority
        const aPriority = priorityOrder[a.priority || 'Medium'] || 2;
        const bPriority = priorityOrder[b.priority || 'Medium'] || 2;
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        // 3. Sort by due date
        return aDate.getTime() - bDate.getTime();
      })
      .slice(0, 5);
  }, [tasks]);

  const isLoading = isUserLoading || areTasksLoading;

  return (
    <motion.div 
      className="mx-auto max-w-4xl py-8"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="text-2xl">Today's Focus</span>
            <Button variant="ghost" onClick={() => router.push('/dashboard')}>
              Exit Focus Mode
            </Button>
          </CardTitle>
          <CardDescription>Your top 5 most important tasks to tackle today. No distractions.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : importantTasks.length > 0 ? (
            <div className="space-y-4">
              {importantTasks.map(task => (
                <FocusTaskItem key={task.id} task={task} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="All Clear!"
              description="You have no open tasks to focus on. Great job!"
              icon={<Zap className="h-16 w-16 text-green-500" />}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
