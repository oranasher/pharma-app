'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

interface EditableDateCellProps {
  task: Task;
  field: 'completedAt';
}

export function EditableDateCell({ task, field }: EditableDateCellProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const initialDate = task[field] instanceof Timestamp ? task[field].toDate() : undefined;
  
  const handleDateSelect = (date: Date | undefined) => {
    if (!date || !firestore || !task.path) return;

    const taskRef = doc(firestore, task.path);
    updateDoc(taskRef, { [field]: date })
      .then(() => {
        toast({ title: 'Date Updated', description: `Task "${task.name}" has been updated.` });
      })
      .catch((error) => {
        console.error("Error updating date:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="group flex min-h-[36px] cursor-pointer items-center justify-between gap-2 rounded-md p-2 -m-2 hover:bg-accent"
        >
          <span className={cn("text-sm", !initialDate && "text-muted-foreground")}>
            {initialDate ? format(initialDate, 'dd/MM/yyyy') : 'Select date'}
          </span>
          <Edit className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={initialDate}
          onSelect={handleDateSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
