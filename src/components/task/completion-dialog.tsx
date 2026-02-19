'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Task, TaskStatus } from '@/lib/types';
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
import { triggerConfetti } from '@/lib/confetti';

const completionSchema = z.object({
  finalReportNumber: z.string().min(1, 'מספר דוח הוא שדה חובה.'),
  binderLocation: z.string().min(1, 'מיקום קלסר הוא שדה חובה.'),
});

interface CompletionDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel?: () => void;
}

export function CompletionDialog({ task, open, onOpenChange, onCancel }: CompletionDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof completionSchema>>({
    resolver: zodResolver(completionSchema),
    defaultValues: {
      finalReportNumber: '',
      binderLocation: '',
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        finalReportNumber: task.finalReportNumber || '',
        binderLocation: task.binderLocation || '',
      });
    }
  }, [task, form]);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      if (onCancel) {
        onCancel();
      }
      onOpenChange(false);
    }
  };

  const onSubmit = (data: z.infer<typeof completionSchema>) => {
    if (!task || !firestore) return;

    const taskRef = doc(firestore, task.path);
    
    const updateData: any = {
      status: 'Completed' as TaskStatus,
      completedAt: serverTimestamp(),
      finalReportNumber: data.finalReportNumber,
      binderLocation: data.binderLocation,
    };
    
    // Also mark all subtasks as completed, just in case
    if (task.subtasks && task.subtasks.length > 0) {
        updateData.subtasks = task.subtasks.map(st => ({ ...st, isCompleted: true }));
    }

    updateDocumentNonBlocking(taskRef, updateData);
    triggerConfetti();
    toast({
      title: 'משימה הושלמה!',
      description: `כל הכבוד על סיום "${task.name}".`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>השלמת משימה: {task?.name}</DialogTitle>
          <DialogDescription>
            המשימה מוכנה להשלמה. אנא מלא את הפרטים הסופיים עבור הארכיון.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="finalReportNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מספר דוח סופי</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., VR-2024-05-18" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="binderLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מיקום קלסר בארכיון</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Shelf A-3" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>ביטול</Button>
              <Button type="submit">השלם משימה</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
