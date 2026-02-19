'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Equipment } from '@/lib/types';

const equipmentFormSchema = z.object({
  name: z.string().min(1, 'Equipment name is required.'),
  rin: z.string().min(1, 'RIN is required.'),
  lastRevalidationDate: z.string().optional(),
  validationDueDate: z.string().min(1, 'Validation due date is required.'),
});

type EquipmentFormValues = z.infer<typeof equipmentFormSchema>;

interface EquipmentDialogProps {
  mode: 'create' | 'edit';
  equipment?: Equipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentDialog({ mode, equipment, open, onOpenChange }: EquipmentDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = mode === 'edit';

  const form = useForm<EquipmentFormValues>({
    resolver: zodResolver(equipmentFormSchema),
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && equipment) {
        form.reset({
          name: equipment.name,
          rin: equipment.rin,
          lastRevalidationDate: equipment.lastRevalidationDate || '',
          validationDueDate: equipment.validationDueDate,
        });
      } else {
        form.reset({
          name: '',
          rin: '',
          lastRevalidationDate: '',
          validationDueDate: '',
        });
      }
    }
  }, [open, isEditMode, equipment, form]);

  const onSubmit = (data: EquipmentFormValues) => {
    if (!firestore) return;

    const equipmentData = {
        ...data,
        // Ensure optional field is not sent as empty string if not filled
        lastRevalidationDate: data.lastRevalidationDate || undefined,
    }

    if (isEditMode && equipment) {
      const equipmentRef = doc(firestore, 'equipment', equipment.id);
      setDocumentNonBlocking(equipmentRef, equipmentData, { merge: true });
      toast({ title: 'Equipment Updated', description: `"${data.name}" has been updated.` });
    } else {
      const equipmentCollection = collection(firestore, 'equipment');
      addDocumentNonBlocking(equipmentCollection, equipmentData);
      toast({ title: 'Equipment Added', description: `"${data.name}" has been added to the registry.` });
    }

    onOpenChange(false);
  };
  
  const dialogTitle = isEditMode ? 'Edit Equipment' : 'Add New Equipment';
  const dialogDescription = isEditMode ? 'Update the details for this piece of equipment.' : 'Fill in the details to add a new piece of equipment to the registry.';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Equipment</FormLabel>
                  <FormControl><Input placeholder="e.g., AUT-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>RIN</FormLabel>
                  <FormControl><Input placeholder="e.g., 12345" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="lastRevalidationDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Last Re-Validation</FormLabel>
                            <FormControl>
                                <Input
                                placeholder="e.g., Q1 2024 or 2024-03-15"
                                {...field}
                                value={field.value ?? ''}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="validationDueDate"
                    render={({ field }) => (
                       <FormItem>
                            <FormLabel>Validation Due Date</FormLabel>
                            <FormControl>
                                <Input
                                placeholder="e.g., Q1 2025 or 2025-03-15"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <DialogFooter>
              <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Equipment'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
