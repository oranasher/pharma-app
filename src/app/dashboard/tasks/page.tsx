'use client';

import { useCollection, useFirestore } from '@/firebase';
import { useUser } from '@/firebase';
import { collection, query, orderBy, collectionGroup, Query, doc } from 'firebase/firestore';
import type { Task, AppUser, TaskTemplate, Equipment } from '@/lib/types';
import { getTaskColumns } from '@/components/task/task-columns';
import { DataTable } from '@/components/task/data-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Loader2, Upload, Download } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { differenceInCalendarDays, startOfToday } from 'date-fns';
import { TaskDialog } from '@/components/task/task-dialog';
import { ImportDialog } from '@/components/task/import-dialog';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { KanbanBoard } from '@/components/task/kanban/kanban-board';
import { KanbanToolbar } from '@/components/task/kanban/kanban-toolbar';
import { useToast } from '@/hooks/use-toast';
import { unparse } from 'papaparse';
import { format } from 'date-fns';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { CompletionDialog } from '@/components/task/completion-dialog';


function TasksPageContent({
    tasksQuery,
    usersQuery,
    templatesQuery,
    equipmentQuery,
    isAdmin
}: {
    tasksQuery: Query<Task>,
    usersQuery: Query<AppUser> | null,
    templatesQuery: Query<TaskTemplate>,
    equipmentQuery: Query<Equipment>,
    isAdmin: boolean
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const filter = searchParams.get('filter');
    const { user, appUser } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isImportDialogOpen, setImportDialogOpen] = useState(false);
    const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
    
    // State for Kanban filters
    const [kanbanNameFilter, setKanbanNameFilter] = useState('');
    const [kanbanStatusFilter, setKanbanStatusFilter] = useState('');
    const [kanbanPriorityFilter, setKanbanPriorityFilter] = useState('');
    const [kanbanAssigneeFilter, setKanbanAssigneeFilter] = useState<string>('all');
    
    const hideCompleted = appUser?.tasksViewPreferences?.hideCompleted ?? true;
    
    const handleHideCompletedChange = (checked: boolean) => {
        if (!user || !firestore) return;
        const userDocRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, {
            'tasksViewPreferences.hideCompleted': checked,
        });
    };

    const [dialogState, setDialogState] = useState<{
        open: boolean;
        mode: 'create' | 'edit';
        task?: Task;
    }>({
        open: false,
        mode: 'create',
    });
    
    useEffect(() => {
        if (searchParams.get('newTask') === 'true') {
            setDialogState({ open: true, mode: 'create', task: undefined });
            const newParams = new URLSearchParams(Array.from(searchParams.entries()));
            newParams.delete('newTask');
            router.replace(`${window.location.pathname}?${newParams.toString()}`);
        }
    }, [searchParams, router]);


    const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(tasksQuery);
    const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
    const { data: templates, isLoading: areTemplatesLoading } = useCollection<TaskTemplate>(templatesQuery);
    const { data: equipment, isLoading: areEquipmentLoading } = useCollection<Equipment>(equipmentQuery);

    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        if (!filter) return tasks;
        const today = startOfToday();
        switch (filter) {
            case 'open':
                return tasks.filter(t => t.status !== 'Completed');
            case 'overdue':
                return tasks.filter(t => t.status !== 'Completed' && t.dueDate && differenceInCalendarDays(t.dueDate.toDate(), today) < 0);
            case 'dueSoon':
                return tasks.filter(t => {
                    if (t.status === 'Completed' || !t.dueDate) return false;
                    const daysDiff = differenceInCalendarDays(t.dueDate.toDate(), today);
                    return daysDiff >= 0 && daysDiff <= 7;
                });
            case 'completed':
                return tasks.filter(t => t.status === 'Completed');
            default:
                return tasks;
        }
    }, [tasks, filter]);

    const kanbanTasks = useMemo(() => {
        let tasksToFilter = tasks ?? [];
    
        if (hideCompleted) {
            tasksToFilter = tasksToFilter.filter(task => task.status !== 'Completed');
        }

        if (kanbanNameFilter) {
            tasksToFilter = tasksToFilter.filter(task => task.name.toLowerCase().includes(kanbanNameFilter.toLowerCase()));
        }
        if (kanbanStatusFilter && kanbanStatusFilter !== 'all') {
            tasksToFilter = tasksToFilter.filter(task => task.status === kanbanStatusFilter);
        }
        if (kanbanPriorityFilter && kanbanPriorityFilter !== 'all') {
            tasksToFilter = tasksToFilter.filter(task => (task.priority || 'Medium') === kanbanPriorityFilter);
        }

        if (isAdmin && kanbanAssigneeFilter !== 'all') {
            tasksToFilter = tasksToFilter.filter(task => task.assigneeId === kanbanAssigneeFilter);
        }
        return tasksToFilter;
    }, [tasks, hideCompleted, kanbanNameFilter, kanbanStatusFilter, kanbanPriorityFilter, kanbanAssigneeFilter, isAdmin]);
    
    const handleExport = () => {
        const viewMode = appUser?.viewPreference ?? 'list';
        const tasksToExport = viewMode === 'list' ? (hideCompleted ? filteredTasks.filter(t => t.status !== 'Completed') : filteredTasks) : kanbanTasks;

        if (!tasksToExport || tasksToExport.length === 0) {
            toast({ variant: "destructive", title: "Export Failed", description: "No tasks to export." });
            return;
        }

        const csv = unparse(tasksToExport.map(task => ({
            "Task Name": task.name,
            "Assignee": task.assigneeName,
            "Status": task.status,
            "Priority": task.priority || 'Medium',
            "Quarter": task.targetQuarter || 'N/A',
            "Due Date": task.dueDate ? format(task.dueDate.toDate(), 'yyyy-MM-dd') : '',
        })));
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.setAttribute('href', URL.createObjectURL(blob));
        link.setAttribute('download', 'pharma_tasks_export.csv');
        link.click();
    };

    const handleOpenEditDialog = useCallback((task: Task) => {
        setDialogState({ open: true, mode: 'edit', task });
    }, []);
    
    const handleOpenCreateDialog = useCallback(() => {
        setDialogState({ open: true, mode: 'create' });
    }, []);

    const handleCloseDialog = useCallback(() => {
        setDialogState(prev => ({ ...prev, open: false }));
    }, []);

    const columns = useMemo(() => getTaskColumns(handleOpenEditDialog, isAdmin, user?.uid), [handleOpenEditDialog, isAdmin, user?.uid]);

    const getTitle = () => {
        const baseTitle = isAdmin ? 'All Tasks' : 'My Tasks';
        if (filter) {
            switch (filter) {
                case 'open': return `${baseTitle} (Open)`;
                case 'overdue': return `${baseTitle} (Overdue)`;
                case 'dueSoon': return `${baseTitle} (Due Soon)`;
                case 'completed': return `${baseTitle} (Completed)`;
            }
        }
        return baseTitle;
    };

    const isLoading = areTasksLoading || (isAdmin && areUsersLoading) || areTemplatesLoading || areEquipmentLoading;
    const viewMode = appUser?.viewPreference ?? 'list';
    
    return (
        <motion.div
            className="grid gap-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className="border-none shadow-sm overflow-hidden">
                <CardHeader className="flex flex-col space-y-4 pb-6 border-b">
                    <div className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl font-bold tracking-tight">{getTitle()}</CardTitle>
                            <CardDescription className="mt-1 text-muted-foreground">
                                {isAdmin ? 'Team-wide annual planning and progress control.' : 'Manage your assigned validation tasks and quarterly targets.'}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 mr-2">
                                <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="h-9 px-3">
                                    <Upload className="mr-2 h-4 w-4" /> Import
                                </Button>
                                <Button variant="outline" size="sm" onClick={handleExport} className="h-9 px-3">
                                    <Download className="mr-2 h-4 w-4" /> Export
                                </Button>
                            </div>
                            <Button onClick={handleOpenCreateDialog} className="h-9 px-4">
                                <PlusCircle className="mr-2 h-4 w-4" /> New Task
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    {viewMode === 'list' ? (
                        <DataTable
                            columns={columns}
                            data={filteredTasks ?? []}
                            isLoading={isLoading}
                            users={users}
                            isLoadingUsers={areUsersLoading}
                            hideCompleted={hideCompleted}
                            onHideCompletedChange={handleHideCompletedChange}
                        />
                    ) : (
                         <>
                            <KanbanToolbar
                                users={users}
                                isLoadingUsers={areUsersLoading}
                                nameFilter={kanbanNameFilter}
                                onNameFilterChange={setKanbanNameFilter}
                                statusFilter={kanbanStatusFilter}
                                onStatusFilterChange={setKanbanStatusFilter}
                                priorityFilter={kanbanPriorityFilter}
                                onPriorityFilterChange={setKanbanPriorityFilter}
                                assigneeFilter={kanbanAssigneeFilter}
                                onAssigneeFilterChange={setKanbanAssigneeFilter}
                                hideCompleted={hideCompleted}
                                onHideCompletedChange={handleHideCompletedChange}
                                showAssigneeFilter={isAdmin}
                            />
                            <KanbanBoard
                                tasks={kanbanTasks ?? []}
                                isLoading={isLoading}
                                onRequestCompletion={setTaskToComplete}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
            
            <TaskDialog
                open={dialogState.open}
                onOpenChange={handleCloseDialog}
                mode={dialogState.mode}
                task={dialogState.task}
                users={users}
                templates={templates}
                equipment={equipment}
                isLoadingUsers={areUsersLoading}
                isLoadingTemplates={areTemplatesLoading}
                isLoadingEquipment={areEquipmentLoading}
            />
        
            <ImportDialog
                open={isImportDialogOpen}
                onOpenChange={setImportDialogOpen}
                users={users}
            />

            <CompletionDialog
                task={taskToComplete}
                open={!!taskToComplete}
                onOpenChange={() => setTaskToComplete(null)}
            />
        </motion.div>
    );
}


export default function DashboardTasksPage() {
    const { user, isAdmin, isUserLoading } = useUser();
    const firestore = useFirestore();

    const tasksQuery = useMemo(() => {
        if (!firestore || !user) return null;
        if (isAdmin) {
            return query(collectionGroup(firestore, 'tasks'));
        } else {
            return query(collection(firestore, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
        }
    }, [firestore, user, isAdmin]);

    const usersQuery = useMemo(() => {
        if (!isAdmin || !firestore) return null;
        return query(collection(firestore, 'public_users'), orderBy('displayName', 'asc'));
    }, [isAdmin, firestore]);

    const templatesQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'taskTemplates'), orderBy('name', 'asc'));
    }, [firestore]);
    
    const equipmentQuery = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'equipment'), orderBy('name', 'asc'));
    }, [firestore]);

    if (isUserLoading || !tasksQuery) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <TasksPageContent
            tasksQuery={tasksQuery as Query<Task>}
            usersQuery={usersQuery as Query<AppUser> | null}
            templatesQuery={templatesQuery as Query<TaskTemplate>}
            equipmentQuery={equipmentQuery as Query<Equipment>}
            isAdmin={isAdmin}
        />
    );
}
