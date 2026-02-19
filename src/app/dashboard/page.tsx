'use client';

import { useUser } from '@/firebase';
import { collection, collectionGroup, query, Query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import type { Task, AppUser } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OverviewCards } from '@/components/dashboard/overview-cards';
import { TasksByMonthChart } from '@/components/dashboard/tasks-by-month-chart';
import { TasksByUserChart } from '@/components/dashboard/tasks-by-user-chart';
import { CapacityOverview } from '@/components/dashboard/capacity-overview';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { UserOverviewCards } from '@/components/dashboard/user-overview-cards';
import { UserStatusOrb } from '@/components/dashboard/user-status-orb';
import { motion } from 'framer-motion';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { DraggableCard } from '@/components/dashboard/DraggableCard';


function AdminDashboardContent({ allTasksQuery, allUsersQuery }: { allTasksQuery: Query | null, allUsersQuery: Query | null }) {
  const { data: allTasks, isLoading: areTasksLoading, error: tasksError } = useCollection<Task>(allTasksQuery);
  const { data: allUsers, isLoading: areUsersLoading } = useCollection<AppUser>(allUsersQuery);

  const [order, setOrder] = useState<string[]>(['capacity', 'users-pie', 'velocity']);

  useEffect(() => {
    const savedOrder = localStorage.getItem('admin-dashboard-order');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        // Safety check to ensure all required items are present in saved layout
        if (Array.isArray(parsed) && parsed.includes('capacity') && parsed.includes('users-pie') && parsed.includes('velocity')) {
            setOrder(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved dashboard layout", e);
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem('admin-dashboard-order', JSON.stringify(newOrder));
        return newOrder;
      });
    }
  };

  const isLoading = areTasksLoading || areUsersLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }
  
  if (tasksError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was an issue fetching the dashboard data.</p>
          <p className="mt-2 text-xs text-muted-foreground">{tasksError.message}</p>
        </CardContent>
      </Card>
    );
  }

  const renderItem = (id: string) => {
    switch (id) {
      case 'capacity':
        return (
          <DraggableCard key="capacity" id="capacity" className="h-full">
            <CapacityOverview tasks={allTasks ?? []} users={allUsers ?? []} />
          </DraggableCard>
        );
      case 'users-pie':
        return (
          <DraggableCard key="users-pie" id="users-pie" className="h-full">
            <TasksByUserChart tasks={allTasks ?? []} />
          </DraggableCard>
        );
      case 'velocity':
        return (
          <DraggableCard key="velocity" id="velocity" className="col-span-1 lg:col-span-2 h-full">
            <TasksByMonthChart tasks={allTasks ?? []} />
          </DraggableCard>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <OverviewCards tasks={allTasks ?? []} />
        </div>
        
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={order}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {order.map(renderItem)}
            </div>
          </SortableContext>
        </DndContext>
    </motion.div>
  );
}


function UserDashboardContent({ userTasksQuery }: { userTasksQuery: Query }) {
  const { data: userTasks, isLoading: areTasksLoading, error } = useCollection<Task>(userTasksQuery);

  if (areTasksLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Your Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There was an issue fetching your tasks.</p>
          <p className="mt-2 text-xs text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <UserOverviewCards tasks={userTasks ?? []} />
      </div>
      <div className="w-full h-full">
        <UserStatusOrb tasks={userTasks ?? []} />
      </div>
    </motion.div>
  );
}


export default function DashboardOverviewPage() {
  const { user, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();

  const allTasksQuery = useMemo(() => {
    if (isAdmin && firestore) {
      // NOTE: Sorting on a collection group requires a composite index.
      // This has been removed to prevent the app from crashing.
      return query(collectionGroup(firestore, 'tasks'));
    }
    return null;
  }, [isAdmin, firestore]);

  const allUsersQuery = useMemo(() => {
    if (isAdmin && firestore) {
      return query(collection(firestore, 'public_users'), orderBy('displayName', 'asc'));
    }
    return null;
  }, [isAdmin, firestore]);

  const userTasksQuery = useMemo(() => {
    if (firestore && user && !isAdmin) {
      return query(collection(firestore, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
    }
    return null;
  }, [firestore, user, isAdmin]);

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (isAdmin) {
    return <AdminDashboardContent allTasksQuery={allTasksQuery} allUsersQuery={allUsersQuery} />;
  } else {
    if (user && userTasksQuery) {
      return <UserDashboardContent userTasksQuery={userTasksQuery} />;
    }
  }

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}
