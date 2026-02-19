'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useCollection, useFirestore, useUser } from '@/firebase';
import { doc, query, collectionGroup, Query } from 'firebase/firestore';
import type { Equipment, Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Server } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTaskColumns } from '@/components/task/task-columns';
import { DataTable } from '@/components/task/data-table';
import { EmptyState } from '@/components/empty-state';
import { ClipboardList } from 'lucide-react';
import { motion } from 'framer-motion';

function EquipmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const firestore = useFirestore();
  const { isAdmin } = useUser();
  const equipmentId = params.equipmentId as string;

  const equipmentDocRef = useMemo(() => {
    if (!firestore || !equipmentId) return null;
    return doc(firestore, 'equipment', equipmentId);
  }, [firestore, equipmentId]);

  const tasksQuery = useMemo(() => {
    // Only run this query if the user is an admin to avoid permission issues
    if (!firestore || !isAdmin) return null;
    // Fetch all tasks to filter client-side, avoiding the need for a specific index.
    return query(collectionGroup(firestore, 'tasks'));
  }, [firestore, isAdmin]);

  const { data: equipment, isLoading: isEquipmentLoading, error: equipmentError } = useDoc<Equipment>(equipmentDocRef);
  const { data: allTasks, isLoading: areTasksLoading, error: tasksError } = useCollection<Task>(tasksQuery as Query<Task>);

  const tasks = useMemo(() => {
    if (!allTasks || !equipmentId) return [];
    return allTasks.filter(task => task.equipmentId === equipmentId);
  }, [allTasks, equipmentId]);


  const columns = useMemo(() => getTaskColumns(() => {}, true), []);

  if (isEquipmentLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-24" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (equipmentError || !equipment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
          <CardDescription>Could not load equipment details. It may not exist or you may not have permission to view it.</CardDescription>
        </CardHeader>
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
      <Button variant="outline" size="sm" onClick={() => router.back()} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Registry
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{equipment.name}</CardTitle>
              <CardDescription className="mt-1">RIN: {equipment.rin}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground">Last Re-Validation</p>
              <p className="text-lg font-semibold">{equipment.lastRevalidationDate || 'N/A'}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="text-sm font-medium text-muted-foreground">Validation Due Date</p>
              <p className="text-lg font-semibold">{equipment.validationDueDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Associated Tasks</CardTitle>
          <CardDescription>All tasks that have been linked to this piece of equipment.</CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
             areTasksLoading ? (
              <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : tasks && tasks.length > 0 ? (
              <DataTable
                columns={columns}
                data={tasks}
                isLoading={areTasksLoading}
                users={null} // Not needed for this view
                isLoadingUsers={false}
              />
            ) : (
              <EmptyState
                title="No Associated Tasks"
                description="No tasks have been linked to this equipment yet."
                icon={<ClipboardList className="mx-auto h-12 w-12 text-gray-400" />}
              />
            )
          ) : (
            <EmptyState
              title="Admin View Only"
              description="A list of tasks associated with this equipment is available to administrators."
              icon={<ClipboardList className="mx-auto h-12 w-12 text-gray-400" />}
            />
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default EquipmentDetailsPage;
