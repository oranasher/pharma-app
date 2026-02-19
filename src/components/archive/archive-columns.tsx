'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Task } from '@/lib/types';
import { DataTableColumnHeader } from '@/components/task/data-table-column-header';
import { format } from 'date-fns';
import { BinderLocationCell } from './binder-location-cell';
import { EditableTextCell } from './EditableTextCell';
import { EditableDateCell } from './EditableDateCell';
import { EditableValidationTypeCell } from './EditableValidationTypeCell';
import { ArchiveRowActions } from './archive-row-actions';


export const getValidationType = (taskName: string): string => {
    const lowerCaseName = taskName.toLowerCase();
    if (lowerCaseName.includes('re-validation') || lowerCaseName.includes('revalidation')) {
        return 'Re-Validation';
    }
    if (lowerCaseName.includes('validation')) {
        return 'Validation';
    }
    if (lowerCaseName.includes('periodic review')) {
        return 'Periodic Review';
    }
    return 'Other';
};


export const getArchiveColumns = (isAdmin: boolean): ColumnDef<Task>[] => {
  
  const columns: ColumnDef<Task>[] = [
    {
      accessorKey: 'department',
      header: ({ column }) => <DataTableColumnHeader column={column} title="מחלקה" />,
      cell: ({ row }) => <EditableTextCell task={row.original} field="department" placeholder="Set department" />,
      filterFn: (row, id, value) => {
        return value ? value === row.getValue(id) : true;
      },
    },
    {
      accessorKey: 'equipmentName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="ציוד" />,
      cell: ({ row }) => <EditableTextCell task={row.original} field="equipmentName" placeholder="הכנס ציוד" />,
      enableSorting: true,
    },
    {
        accessorKey: 'rin',
        header: ({ column }) => <DataTableColumnHeader column={column} title="RIN" />,
        cell: ({ row }) => <EditableTextCell task={row.original} field="rin" placeholder="הכנס RIN" />,
        enableSorting: true,
        filterFn: (row, id, value) => {
            return value ? value === row.getValue(id) : true;
        },
    },
    {
        accessorKey: 'validationType',
        header: ({ column }) => <DataTableColumnHeader column={column} title="סוג ולידציה" />,
        cell: ({ row }) => <EditableValidationTypeCell task={row.original} getInitialValue={getValidationType} />,
        enableSorting: true,
        sortingFn: (rowA, rowB, columnId) => {
            const typeA = rowA.original.validationType || getValidationType(rowA.original.name);
            const typeB = rowB.original.validationType || getValidationType(rowB.original.name);
            return typeA.localeCompare(typeB);
        },
        filterFn: (row, id, value) => {
            if (!value) return true;
            const rowValue = row.original.validationType || getValidationType(row.original.name);
            return value === rowValue;
        }
    },
    {
      accessorKey: 'completedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="תאריך ביצוע" />,
      cell: ({ row }) => <EditableDateCell task={row.original} field="completedAt" />,
      enableSorting: true,
    },
     {
        id: 'year',
        accessorFn: row => row.completedAt ? new Date(row.completedAt.seconds * 1000).getFullYear().toString() : '',
        header: ({ column }) => <DataTableColumnHeader column={column} title="שנה" />,
        cell: ({ row }) => {
            const completedAt = row.original.completedAt as { seconds: number; nanoseconds: number } | null;
            if (!completedAt) return <span>-</span>;
            const date = new Date(completedAt.seconds * 1000);
            return <span>{format(date, 'yyyy')}</span>;
        },
        enableSorting: true,
        sortingFn: (rowA, rowB, columnId) => {
             const dateA = rowA.original.completedAt ? new Date(rowA.original.completedAt.seconds * 1000).getFullYear() : 0;
             const dateB = rowB.original.completedAt ? new Date(rowB.original.completedAt.seconds * 1000).getFullYear() : 0;
             return dateA - dateB;
        },
        filterFn: (row, id, value) => {
            if (!value) return true;
            const rowYear = row.original.completedAt ? new Date(row.original.completedAt.seconds * 1000).getFullYear().toString() : '';
            return value === rowYear;
        }
    },
    {
      accessorKey: 'binderLocation',
      header: ({ column }) => <DataTableColumnHeader column={column} title="מיקום" />,
      cell: ({ row }) => <BinderLocationCell task={row.original} />,
      enableSorting: true,
    },
     {
      accessorKey: 'description',
      header: ({ column }) => <DataTableColumnHeader column={column} title="הערות" />,
      cell: ({ row }) => <EditableTextCell task={row.original} field="description" placeholder="Add comments" isTextarea={true} />,
      enableSorting: false,
    },
  ];

  if (isAdmin) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => <ArchiveRowActions row={row} />,
    });
  }

  return columns;
};
