'use client';

import { ColumnDef } from '@tanstack/react-table';
import { Document } from '@/lib/types';
import { DataTableColumnHeader } from '@/components/task/data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';
import { format } from 'date-fns';
import { File } from 'lucide-react';
import Link from 'next/link';

export const getDocumentColumns = (): ColumnDef<Document>[] => {
  
  let columns: ColumnDef<Document>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
      cell: ({ row }) => (
        <Link href={row.original.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
            <File className='h-4 w-4 text-muted-foreground' />
            <span className="font-medium">{row.getValue('name')}</span>
        </Link>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'uploaderName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Uploaded By" />,
      cell: ({ row }) => {
        return <span>{row.original.uploaderName}</span>;
      },
      enableSorting: true,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Upload Date" />,
      cell: ({ row }) => {
        const createdAt = row.getValue('createdAt') as { seconds: number; nanoseconds: number } | null;
        if (!createdAt) return <span>N/A</span>;
        const date = new Date(createdAt.seconds * 1000);
        return <span>{format(date, 'MMM d, yyyy')}</span>;
      },
       enableSorting: true,
    },
    {
      id: 'actions',
      cell: ({ row }) => <DataTableRowActions row={row} />,
    },
  ];

  return columns;
};
