'use client';

import { useEffect, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc } from 'firebase/firestore';
import { PlusCircle, Trash2, Clock } from 'lucide-react';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { TaskTemplate } from '@/lib/types';

const templateFormSchema = z.object({
  name: z.string().min(1, 'Template name is required.'),
  description: z.string().min(1, 'Description is required.'),
  estimatedDays: z.preprocess((val) => (val === '' ? 0 : Number(val)), z.number().min(0).default(0)),
  subtasks: z.array(z.object({ name: z.string().min(1, 'Subtask name cannot be empty.') })),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateDialogProps {
  template?: TaskTemplate;
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TemplateDialog({ template, children, open: openProp, onOpenChange: onOpenChangeProp }: TemplateDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!template;

  const open = openProp !== undefined ? openProp : internalOpen;
  const onOpenChange = onOpenChangeProp !== undefined ? onOpenChangeProp : setInternalOpen;

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: isEditMode
      ? {
          name: template.name,
          description: template.description,
          estimatedDays: template.estimatedDays || 0,
          subtasks: template.subtasks.length > 0 ? template.subtasks : [{ name: '' }],
        }
      : {
          name: '',
          description: '',
          estimatedDays: 0,
          subtasks: [{ name: '' }],
        },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'subtasks',
  });

  useEffect(() => {
    if (open) {
      form.reset(
        isEditMode
          ? {
              name: template.name,
              description: template.description,
              estimatedDays: template.estimatedDays || 0,
              subtasks: template.subtasks.length > 0 ? template.subtasks : [{ name: '' }],
            }
          : {
              name: '',
              description: '',
              estimatedDays: 0,
              subtasks: [{ name: '' }],
            }
      );
    }
  }, [open, isEditMode, template, form]);

  const onSubmit = async (data: TemplateFormValues) => {
    if (!firestore) return;
    if (isEditMode && template?.id) {
      const templateRef = doc(firestore, 'taskTemplates', template.id);
      setDocumentNonBlocking(templateRef, data, { merge: true });
      toast({ title: 'Template Updated' });
    } else {
      const templateCollection = collection(firestore, 'taskTemplates');
      addDocumentNonBlocking(templateCollection, data);
      toast({ title: 'Template Created' });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{isEditMode ? 'Edit Template' : 'New Template'}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Template Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>)} />
            <FormField control={form.control} name="estimatedDays" render={({ field }) => (
              <FormItem><FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4" />Duration (Days)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} /></FormControl></FormItem>
            )} />
            <DialogFooter className="pt-4"><Button type="submit">Save Template</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}