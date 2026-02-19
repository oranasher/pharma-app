'use client'

import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { X, ChevronDown, Trash2, CheckCircle, Users, Download, CalendarRange, UserCircle, Search, FilterX } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AppUser, Task, TaskPriority, TaskStatus, FieldValue, TargetQuarter } from '@/lib/types'
import { useFirestore, useUser } from '@/firebase'
import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { useToast } from '@/hooks/use-toast'
import { unparse } from 'papaparse';
import { format } from 'date-fns';
import { Switch } from '../ui/switch'
import { Label } from '../ui/label'
import { Separator } from '../ui/separator'
import { triggerConfetti } from '@/lib/confetti'
import { cn } from '@/lib/utils'


interface DataTableToolbarProps<TData> {
  table: Table<TData>
  users: AppUser[] | null;
  isLoadingUsers: boolean;
  hideCompleted: boolean;
  setHideCompleted: (value: boolean) => void;
}

export function DataTableToolbar<TData>({ table, users, isLoadingUsers, hideCompleted, setHideCompleted }: DataTableToolbarProps<TData>) {
  const [isDeleteAlertOpen, setDeleteAlertOpen] = React.useState(false);
  const [isStatusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [newStatus, setNewStatus] = React.useState<TaskStatus | ''>('');
  
  const { user, isAdmin } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const statuses: TaskStatus[] = ["Not Started", "In Progress", "Completed"];
  const quarters: TargetQuarter[] = ["Q1", "Q2", "Q3", "Q4"];
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const currentQuarterFilter = table.getColumn('targetQuarter')?.getFilterValue() as string[] | undefined;
  const currentAssigneeFilter = table.getColumn('assigneeName')?.getFilterValue() as string | undefined;
  const currentStatusFilter = table.getColumn('status')?.getFilterValue() as string | undefined;
  const nameFilterValue = (table.getColumn('name')?.getFilterValue() as string) ?? '';

  const isFiltered = !!(currentQuarterFilter?.length || currentAssigneeFilter || currentStatusFilter || nameFilterValue);

  const handleBulkDelete = () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    selectedRows.forEach(row => {
        const task = row.original as Task;
        if (task.path) {
            const docRef = doc(firestore, task.path);
            batch.delete(docRef);
        }
    });

    batch.commit().then(() => {
        toast({ title: 'הצלחה', description: `${selectedRows.length} משימות נמחקו.` });
        table.resetRowSelection();
    }).catch(err => {
        console.error("Bulk delete error: ", err);
        toast({ variant: 'destructive', title: 'שגיאה', description: 'לא ניתן למחוק את המשימות.' });
    });
    setDeleteAlertOpen(false);
  }

  const handleBulkStatusChange = () => {
    if (!firestore || !newStatus) return;
    const batch = writeBatch(firestore);
    let justCompleted = false;
    selectedRows.forEach(row => {
      const task = row.original as Task;
       if (task.path) {
          const docRef = doc(firestore, task.path);
          const updateData: { status: TaskStatus; completedAt?: FieldValue } = { status: newStatus };
          if (newStatus === 'Completed' && task.status !== 'Completed') {
              updateData.completedAt = serverTimestamp();
              justCompleted = true;
          }
          batch.update(docRef, updateData);
       }
    });

    batch.commit().then(() => {
        toast({ title: 'הצלחה', description: `הסטטוס עודכן עבור ${selectedRows.length} משימות.` });
        if (justCompleted) triggerConfetti();
        table.resetRowSelection();
    });
    setStatusDialogOpen(false);
    setNewStatus('');
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חפש משימה..."
            value={nameFilterValue}
            onChange={(event) => table.getColumn('name')?.setFilterValue(event.target.value)}
            className="h-9 pl-9 bg-background/50 focus:bg-background transition-colors"
          />
        </div>
        
        <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
            {/* Quarter Filter */}
            <Select
                value={currentQuarterFilter?.[0] ?? 'all'}
                onValueChange={(value) => table.getColumn('targetQuarter')?.setFilterValue(value === 'all' ? null : [value])}
            >
                <SelectTrigger className={cn(
                    "h-9 w-auto min-w-[120px] transition-all",
                    currentQuarterFilter?.length && "border-indigo-500/50 bg-indigo-50/10"
                )}>
                    <CalendarRange className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue>
                        {currentQuarterFilter?.length ? `Selected: ${currentQuarterFilter[0]}` : 'Quarter'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Quarters</SelectItem>
                    {quarters.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                </SelectContent>
            </Select>

            {/* Assignee Filter (Admin only) */}
            {isAdmin && (
                <Select
                    value={currentAssigneeFilter ?? 'all'}
                    onValueChange={(value) => table.getColumn('assigneeName')?.setFilterValue(value === 'all' ? null : value)}
                >
                    <SelectTrigger className={cn(
                        "h-9 w-auto min-w-[140px] transition-all",
                        currentAssigneeFilter && currentAssigneeFilter !== 'all' && "border-indigo-500/50 bg-indigo-50/10"
                    )}>
                        <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                        <SelectValue>
                            {currentAssigneeFilter && currentAssigneeFilter !== 'all' ? `User: ${users?.find(u => u.uid === currentAssigneeFilter)?.displayName || 'Self'}` : 'Assignee'}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Members</SelectItem>
                        {user && (
                            <>
                                <SelectItem value={user.uid}>(אני) המנהל</SelectItem>
                                <SelectSeparator />
                            </>
                        )}
                        {users?.filter(u => u.uid !== user?.uid).map(u => (
                            <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}

            {/* Status Filter */}
            <Select
                value={currentStatusFilter ?? 'all'}
                onValueChange={(value) => table.getColumn('status')?.setFilterValue(value === 'all' ? null : value)}
            >
                <SelectTrigger className={cn(
                    "h-9 w-auto min-w-[130px] transition-all",
                    currentStatusFilter && "border-indigo-500/50 bg-indigo-50/10"
                )}>
                    <SelectValue>
                        {currentStatusFilter ? `Status: ${currentStatusFilter}` : 'All Statuses'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
            </Select>

            {isFiltered && (
                <Button 
                    variant="ghost" 
                    onClick={() => table.resetColumnFilters()} 
                    className="h-9 px-3 text-muted-foreground hover:text-foreground"
                >
                    <FilterX className="mr-2 h-4 w-4" /> Reset
                </Button>
            )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-4">
            {selectedRows.length > 0 && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="sm" className="h-9 px-4">
                            Bulk Actions ({selectedRows.length}) <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Modify Selection</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setStatusDialogOpen(true)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Update Status
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setDeleteAlertOpen(true)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}

            <div className="flex items-center space-x-2 bg-muted/30 rounded-md px-3 h-9 border">
                <Switch
                    id="hide-completed"
                    checked={hideCompleted}
                    onCheckedChange={setHideCompleted}
                    className="scale-75"
                />
                <Label htmlFor="hide-completed" className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hide Done</Label>
            </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>אישור מחיקה גורפת</AlertDialogTitle>
              <AlertDialogDescription>האם למחוק לצמיתות {selectedRows.length} משימות?</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel>ביטול</AlertDialogCancel>
              <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground">מחק</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={isStatusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>עדכון סטטוס</DialogTitle>
                  <DialogDescription>עדכן {selectedRows.length} משימות.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                   <Select onValueChange={(value: TaskStatus) => setNewStatus(value)}>
                      <SelectTrigger><SelectValue placeholder="בחר סטטוס" /></SelectTrigger>
                      <SelectContent>
                          {statuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                      </SelectContent>
                  </Select>
              </div>
              <DialogFooter>
                  <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>ביטול</Button>
                  <Button onClick={handleBulkStatusChange} disabled={!newStatus}>אישור</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  )
}
