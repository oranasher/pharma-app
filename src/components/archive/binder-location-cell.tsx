'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit, Loader2, X } from 'lucide-react';

interface BinderLocationCellProps {
  task: Task;
}

export function BinderLocationCell({ task }: BinderLocationCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState(task.binderLocation || '');
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!firestore || !task.path) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save location.' });
      return;
    }
    setIsSaving(true);
    const taskRef = doc(firestore, task.path);
    
    updateDoc(taskRef, { binderLocation: location })
      .then(() => {
        toast({ title: 'Location Updated', description: `Binder location for "${task.name}" saved.` });
        setIsEditing(false);
      })
      .catch((error) => {
        console.error("Error updating location:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g., Shelf A-3"
          className="h-9"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setIsEditing(false); }}
        />
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
      <span className="text-sm text-muted-foreground truncate">
        {task.binderLocation || 'Click to set location'}
      </span>
      <Edit className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
