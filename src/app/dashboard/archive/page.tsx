'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, where, orderBy, collectionGroup, Query } from 'firebase/firestore';
import type { AppUser, Task } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/archive/data-table';
import { getArchiveColumns, getValidationType } from '@/components/archive/archive-columns';
import { Loader2, Upload, Download, PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArchiveImportDialog } from '@/components/archive/archive-import-dialog';
import { ArchiveEntryDialog } from '@/components/archive/archive-entry-dialog';
import { unparse } from 'papaparse';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

function ArchivePageContent() {
    const { user, isAdmin, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isImportDialogOpen, setImportDialogOpen] = useState(false);
    const [isEntryDialogOpen, setEntryDialogOpen] = useState(false);

    const tasksQuery = useMemo(() => {
        if (!firestore || !user) return null;
        // Everyone now accesses the team-wide task vault for historical data
        // collectionGroup allows reading 'tasks' from all users' subcollections
        return query(collectionGroup(firestore, 'tasks'));
    }, [firestore, user]);

    const usersQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'public_users'));
    }, [firestore]);

    const { data: allTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery as Query<Task>);
    const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);


    const completedTasks = useMemo(() => {
        if (!allTasks) return [];
        // Global archive logic: show all tasks marked as 'Completed' across the entire system
        return allTasks.filter(task => task.status === 'Completed');
    }, [allTasks]);

    const columns = useMemo(() => getArchiveColumns(isAdmin), [isAdmin]);
    
    const usersById = useMemo(() => new Map(users?.map(u => [u.uid, u])), [users]);

    const handleExport = () => {
        if (!completedTasks || completedTasks.length === 0) {
            toast({
                variant: "destructive",
                title: "ייצוא נכשל",
                description: "אין משימות לייצא.",
            });
            return;
        }

        const dataToExport = completedTasks.map(task => {
            const completedAtDate = task.completedAt ? task.completedAt.toDate() : null;
            const assignee = usersById.get(task.assigneeId);
            return {
                "name": task.name,
                "assigneeName": task.assigneeName,
                "assigneeEmail": assignee?.email ?? '',
                "department": task.department || '',
                "equipmentName": task.equipmentName || '',
                "rin": task.rin || '',
                "validationType": task.validationType || getValidationType(task.name),
                "completedAt": completedAtDate ? format(completedAtDate, 'yyyy-MM-dd') : '',
                "binderLocation": task.binderLocation || '',
                "description": task.description || '',
            };
        });

        const csv = unparse(dataToExport);
        
        const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'archive_export.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (isUserLoading) {
         return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    const isLoading = areTasksLoading || areUsersLoading;

    return (
        <>
            <motion.div
                className="grid gap-6"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card className='shadow-sm'>
                    <CardHeader className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                        <div>
                            <CardTitle>ארכיון</CardTitle>
                            <CardDescription className='mt-1'>
                                צפייה במשימות שהושלמו ועדכון המיקום הפיזי של קלסרי הפרוטוקול.
                            </CardDescription>
                        </div>
                        <div className="ml-auto flex w-full flex-wrap items-center gap-2 md:w-auto">
                            <Button onClick={() => setEntryDialogOpen(true)}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                הוספת רשומה
                            </Button>
                            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" />
                                ייבוא
                            </Button>
                            <Button onClick={handleExport}>
                                <Download className="mr-2 h-4 w-4" />
                                ייצוא
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <DataTable
                            columns={columns}
                            data={completedTasks ?? []}
                            isLoading={isLoading}
                        />
                    </CardContent>
                </Card>
            </motion.div>
            <ArchiveImportDialog
                open={isImportDialogOpen}
                onOpenChange={setImportDialogOpen}
                users={users}
            />
            <ArchiveEntryDialog
                open={isEntryDialogOpen}
                onOpenChange={setEntryDialogOpen}
                users={users}
            />
        </>
    );
}

export default function ArchivePage() {
    // Layout handles auth and loading state
    return <ArchivePageContent />;
}
