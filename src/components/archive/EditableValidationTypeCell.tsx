'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit, Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface EditableValidationTypeCellProps {
  task: Task;
  getInitialValue: (taskName: string) => string;
}

const validationTypes = ['Validation', 'Re-Validation', 'Periodic Review', 'Other'];

export function EditableValidationTypeCell({ task, getInitialValue }: EditableValidationTypeCellProps) {
  const initialValue = task.validationType || getInitialValue(task.name);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!firestore || !task.path) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save validation type.' });
      return;
    }
    
    setIsSaving(true);
    const taskRef = doc(firestore, task.path);
    
    updateDoc(taskRef, { 
      validationType: selectedValue
     })
      .then(() => {
        toast({ title: 'Validation Type Updated', description: `Type for "${task.name}" saved.` });
        setIsEditing(false);
      })
      .catch((error) => {
        console.error("Error updating validation type:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Select onValueChange={setSelectedValue} value={selectedValue}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select Type" />
          </SelectTrigger>
          <SelectContent>
            {validationTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={handleSave} size="icon" className="h-9 w-9 shrink-0" disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            <span className="sr-only">Save</span>
        </Button>
         <Button onClick={() => setIsEditing(false)} variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isSaving}>
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel</span>
        </Button>
      </div>
    );
  }

  return (
    <div
      className="group flex min-h-[36px] cursor-pointer items-center justify-between gap-2 rounded-md p-2 -m-2 hover:bg-accent"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm text-foreground truncate">
        {initialValue}
      </span>
      <Edit className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
