'use client';

import { ColumnDef } from '@tanstack/react-table';
import { TaskTemplate } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableColumnHeader } from '@/components/task/data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

export const columns: ColumnDef<TaskTemplate>[] = [
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
    header: ({ column }) => <DataTableColumnHeader column={column} title="Template Name" />,
    cell: ({ row }) => <div className="font-medium">{row.getValue('name')}</div>,
    enableSorting: true,
    enableHiding: false,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Description" />,
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue('description')}</div>,
  },
   {
    accessorKey: 'subtasks',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Subtasks" />,
    cell: ({ row }) => {
        const subtasks = row.getValue('subtasks') as { name: string }[];
        return <div className="text-sm">{subtasks?.length || 0}</div>
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
