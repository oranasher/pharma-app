'use client';

import { useState } from 'react';
import { Task, Equipment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Check, Edit, Loader2, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Link from 'next/link';

interface EditableEquipmentCellProps {
  task: Task;
  equipmentList: Equipment[];
}

export function EditableEquipmentCell({ task, equipmentList }: EditableEquipmentCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(task.equipmentId || '');
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSave = () => {
    if (!firestore || !task.path) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save equipment.' });
      return;
    }

    const selectedEquipment = equipmentList.find(e => e.id === selectedEquipmentId);
    
    setIsSaving(true);
    const taskRef = doc(firestore, task.path);
    
    updateDoc(taskRef, { 
      equipmentId: selectedEquipment?.id || null,
      equipmentName: selectedEquipment?.name || null,
     })
      .then(() => {
        toast({ title: 'Equipment Updated', description: `Equipment for "${task.name}" saved.` });
        setIsEditing(false);
      })
      .catch((error) => {
        console.error("Error updating equipment:", error);
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <Select onValueChange={setSelectedEquipmentId} value={selectedEquipmentId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select Equipment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {equipmentList.map(eq => (
              <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
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
      {task.equipmentId && task.equipmentName ? (
          <Link href={`/dashboard/equipment/${task.equipmentId}`} className="hover:underline text-sm text-foreground truncate" onClick={(e) => e.stopPropagation()}>
              {task.equipmentName}
          </Link>
      ) : (
          <span className="text-sm text-muted-foreground truncate">
              Click to select
          </span>
      )}
      <Edit className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  );
}
