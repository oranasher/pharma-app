'use client'

import * as React from 'react'
import { Table } from '@tanstack/react-table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getValidationType } from './archive-columns'
import { Task } from '@/lib/types'

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

// Helper to get unique string values from a column, including calculated ones
const getUniqueValues = (table: Table<any>, columnId: string, customGetValue?: (row: any) => string): string[] => {
    const uniqueValues = new Set<string>();
    table.getPreFilteredRowModel().rows.forEach(row => {
        let value: string;
        if (customGetValue) {
            value = customGetValue(row.original as Task);
        } else {
            value = row.getValue(columnId);
        }
        if (value) {
            uniqueValues.add(value);
        }
    });
    return Array.from(uniqueValues).sort();
}

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0 || !!table.getState().globalFilter
  
  const departmentOptions = React.useMemo(() => getUniqueValues(table, 'department'), [table.getPreFilteredRowModel()]);
  const rinOptions = React.useMemo(() => getUniqueValues(table, 'rin'), [table.getPreFilteredRowModel()]);
  const validationTypeOptions = React.useMemo(() => getUniqueValues(table, 'validationType', (task) => task.validationType || getValidationType(task.name)), [table.getPreFilteredRowModel()]);
  const yearOptions = React.useMemo(() => getUniqueValues(table, 'year'), [table.getPreFilteredRowModel()]);


  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2 flex-wrap gap-2">
        <Input
          placeholder="סנן רשומות..."
          value={(table.getState().globalFilter as string) ?? ''}
          onChange={(event) =>
            table.setGlobalFilter(event.target.value)
          }
          className="h-9 w-[150px] lg:w-[250px]"
        />
        
        {/* Department Filter */}
        <Select
          value={(table.getColumn('department')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) => table.getColumn('department')?.setFilterValue(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[130px] hidden sm:flex">
            <SelectValue placeholder="סנן לפי מחלקה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל המחלקות</SelectItem>
            {departmentOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* RIN Filter */}
         <Select
          value={(table.getColumn('rin')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) => table.getColumn('rin')?.setFilterValue(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[130px] hidden sm:flex">
            <SelectValue placeholder="סנן לפי RIN" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל ה-RINs</SelectItem>
            {rinOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Validation Type Filter */}
        <Select
          value={(table.getColumn('validationType')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) => table.getColumn('validationType')?.setFilterValue(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[160px] hidden sm:flex">
            <SelectValue placeholder="סנן לפי סוג ולידציה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסוגים</SelectItem>
            {validationTypeOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Filter */}
        <Select
          value={(table.getColumn('year')?.getFilterValue() as string) ?? ''}
          onValueChange={(value) => table.getColumn('year')?.setFilterValue(value === 'all' ? null : value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-[120px] hidden sm:flex">
            <SelectValue placeholder="סנן לפי שנה" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל השנים</SelectItem>
            {yearOptions.map(option => (
              <SelectItem key={option} value={option}>{option}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
                table.resetColumnFilters();
                table.setGlobalFilter('');
            }}
            className="h-9 px-2 lg:px-3"
          >
            אפס
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
