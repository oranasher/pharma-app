'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Equipment } from '@/lib/types';
import { DataTableColumnHeader } from '@/components/task/data-table-column-header';
import { Server } from 'lucide-react';
import { DataTableRowActions } from './data-table-row-actions';
import Link from 'next/link';

export const getEquipmentColumns = (onEdit: (equipment: Equipment) => void): ColumnDef<Equipment>[] => {
  
  const columns: ColumnDef<Equipment>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Equipment" />,
      cell: ({ row }) => (
        <Link href={`/dashboard/equipment/${row.original.id}`} className="hover:underline">
          <div className="flex items-center gap-2">
              <Server className='h-4 w-4 text-muted-foreground' />
              <span className="font-medium">{row.original.name}</span>
          </div>
        </Link>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'rin',
      header: ({ column }) => <DataTableColumnHeader column={column} title="RIN" />,
      cell: ({ row }) => <span>{row.original.rin}</span>,
      enableSorting: true,
    },
    {
      accessorKey: 'lastRevalidationDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Last Re-Validation" />,
      cell: ({ row }) => {
        return <span>{row.original.lastRevalidationDate || 'N/A'}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'validationDueDate',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Validation Due Date" />,
      cell: ({ row }) => {
        const dueDate = row.original.validationDueDate;
        return <span>{dueDate || 'N/A'}</span>;
      },
      enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} onEdit={onEdit} />,
    },
  ];

  return columns;
};
