'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit, Loader2, X } from 'lucide-react';
import { Textarea } from '../ui/textarea';

interface EditableTextCellProps {
  task: Task;
  field: keyof Task;
  placeholder?: string;
  isTextarea?: boolean;
}

export function EditableTextCell({ task, field, placeholder, isTextarea = false }: EditableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState((task[field] as string) || '');
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!firestore || !task.path) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save value.' });
      return;
    }
    setIsSaving(true);
    const taskRef = doc(firestore, task.path);
    
    updateDoc(taskRef, { [field]: value })
      .then(() => {
        toast({ title: 'Field Updated', description: `Task "${task.name}" has been updated.` });
        setIsEditing(false);
      })
      .catch((error) => {
        console.error("Error updating field:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const InputComponent = isTextarea ? Textarea : Input;

  if (isEditing) {
    return (
      <div className="flex items-start gap-2">
        <InputComponent
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder || "Enter value"}
          className="h-9"
          onKeyDown={(e) => { if (e.key === 'Enter' && !isTextarea) { e.preventDefault(); handleSave(); } if (e.key === 'Escape') setIsEditing(false); }}
        />
        <div className="flex flex-col gap-1">
            <Button onClick={handleSave} size="icon" className="h-9 w-9 shrink-0" disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                <span className="sr-only">Save</span>
            </Button>
            <Button onClick={() => setIsEditing(false)} variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={isSaving}>
                <X className="h-4 w-4" />
                <span className="sr-only">Cancel</span>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex min-h-[36px] cursor-pointer items-center justify-between gap-2 rounded-md p-2 -m-2 hover:bg-accent"
      onClick={() => setIsEditing(true)}
    >
      <span className="text-sm text-muted-foreground line-clamp-2">
        {(task[field] as string) || placeholder || 'Click to edit'}
      </span>
      <Edit className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
