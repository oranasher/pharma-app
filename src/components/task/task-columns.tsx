'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Task, TaskPriority, TaskStatus, TargetQuarter } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, Check, AlertCircle, CheckCircle2, CalendarDays } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '../ui/button';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_UID } from '@/lib/admin';

const statusStyles: { [key in TaskStatus]: string } = {
  'Not Started': 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  'In Progress': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_8px_theme(colors.cyan.500/0.5)]',
  'Completed': 'bg-green-500/10 text-green-400 border-green-500/20',
};

const priorityStyles: { [key in TaskPriority]: string } = {
  High: 'text-red-500',
  Medium: 'text-yellow-500',
  Low: 'text-gray-500',
};

const priorityIcons: { [key in TaskPriority]: React.ComponentType<{ className?: string }> } = {
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
}

const quarterStyles: { [key in TargetQuarter]: string } = {
  Q1: 'bg-blue-100 text-blue-700 border-blue-200',
  Q2: 'bg-purple-100 text-purple-700 border-purple-200',
  Q3: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Q4: 'bg-pink-100 text-pink-700 border-pink-200',
};

export const getTaskColumns = (onEdit: (task: Task) => void, isAdmin?: boolean, currentUserId?: string): ColumnDef<Task>[] => {
  
  let columns: ColumnDef<Task>[] = [
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
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="משימה" />,
      cell: ({ row }) => {
        const task = row.original;
        return (
          <Link href={`/dashboard/tasks/${task.id}?userId=${task.assigneeId}`} className="hover:underline">
            <div className="font-semibold">{task.name}</div>
          </Link>
        );
      },
      enableSorting: true,
      enableHiding: false,
    },
    {
      accessorKey: 'targetQuarter',
      header: ({ column }) => <DataTableColumnHeader column={column} title="רבעון" />,
      cell: ({ row }) => {
        const quarter = row.original.targetQuarter;
        if (!quarter) return <span className="text-muted-foreground text-xs italic">לא הוגדר</span>;
        return (
          <Badge variant="outline" className={cn("uppercase font-bold", quarterStyles[quarter])}>
            {quarter}
          </Badge>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    }
  ];

  if (isAdmin) {
    columns.push({
      accessorKey: 'assigneeName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="אחראי" />,
      cell: ({ row }) => {
        const assigneeName = row.original.assigneeName || 'N/A';
        const initials = assigneeName.split(' ').map((n) => n[0]).join('').toUpperCase() || '?';
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 text-xs">
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{assigneeName}</span>
          </div>
        );
      },
      enableSorting: true,
      filterFn: (row, id, value) => {
        if (value === 'all') return true;
        return row.original.assigneeId === value;
      },
    });
  }

  columns = columns.concat([
    {
      accessorKey: 'priority',
      header: ({ column }) => <DataTableColumnHeader column={column} title="עדיפות" />,
      cell: ({ row }) => {
        const priority: TaskPriority = row.getValue('priority') || 'Medium';
        const Icon = priorityIcons[priority];
        return (
          <div className="flex items-center gap-2">
            <Icon className={cn('h-4 w-4', priorityStyles[priority])} />
            <span className={cn(priorityStyles[priority])}>{priority}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="סטטוס" />,
      cell: ({ row }) => {
        const status: TaskStatus = row.getValue('status');
        const isCompleted = status === 'Completed';
        return (
          <Badge className={cn('flex items-center gap-1.5', statusStyles[status])} variant="outline">
            {isCompleted && <Check className="h-3.5 w-3.5 animate-check" />}
            {status}
          </Badge>
        );
      },
    },
    {
      id: 'delay',
      header: ({ column }) => <DataTableColumnHeader column={column} title="בקרת לו״ז" />,
      cell: ({ row }) => {
        const task = row.original;
        const firestore = useFirestore();
        const { toast } = useToast();
        const needsApproval = task.delayReason && !task.isDelayApproved;

        if (!task.delayReason) return <span className="text-muted-foreground text-xs italic">במסלול</span>;

        return (
          <div className="flex flex-col gap-1 items-start">
            {needsApproval ? (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 flex gap-1 items-center">
                <AlertCircle className="h-3 w-3" /> ממתין לאישור עיכוב
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200 flex gap-1 items-center">
                <CheckCircle2 className="h-3 w-3" /> עיכוב אושר
              </Badge>
            )}
            {isAdmin && currentUserId === ADMIN_UID && needsApproval && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-[10px] px-2 text-primary hover:text-primary hover:bg-primary/5"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!firestore || !task.path) return;
                  updateDoc(doc(firestore, task.path), { isDelayApproved: true })
                    .then(() => toast({ title: "העיכוב אושר", description: "לוח הזמנים עודכן בהצלחה." }));
                }}
              >
                אשר עיכוב
              </Button>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'dueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="תאריך יעד" />,
      cell: ({ row }) => {
        const dueDate = row.getValue('dueDate') as { seconds: number; nanoseconds: number } | null;
        if (!dueDate) return <span>אין תאריך</span>;
        const date = new Date(dueDate.seconds * 1000);
        const formattedDate = format(date, 'MMM d, yyyy');
        const daysDiff = differenceInCalendarDays(date, startOfToday());

        if (row.original.status === 'Completed') return <span>{formattedDate}</span>;
        if (daysDiff < 0) return <Badge variant="destructive">{formattedDate}</Badge>;
        if (daysDiff <= 7) return <Badge variant="warning">{formattedDate}</Badge>;
        return <span>{formattedDate}</span>;
      },
    },
  ]);

  columns.push({
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} />,
  });

  return columns;
};
