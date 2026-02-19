'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Papa from 'papaparse';
import { collection, writeBatch, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
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
import { Loader2, Upload, Terminal } from 'lucide-react';
import { AppUser, TaskPriority, TaskStatus } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const importFormSchema = z.object({
  file: z.instanceof(File).refine(file => file.type === 'text/csv', 'Please upload a valid CSV file.'),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[] | null;
}

// Define the expected shape of a row from the CSV
interface CsvRow {
    name: string;
    description?: string;
    priority?: TaskPriority;
    dueDate: string; // Expecting string from CSV, will parse to Date
    assigneeEmail: string;
}

export function ImportDialog({ open, onOpenChange, users }: ImportDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [isImporting, setIsImporting] = useState(false);
  const usersByEmail = new Map(users?.map(u => [u.email, u]));

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(importFormSchema),
  });
  
  const onSubmit = (data: ImportFormValues) => {
    if (!firestore || !user) {
      toast({ variant: 'destructive', title: 'Error', description: 'User not authenticated.' });
      return;
    }

    setIsImporting(true);
    
    Papa.parse<CsvRow>(data.file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
            if (results.errors.length) {
                console.error("CSV Parsing errors:", results.errors);
                toast({ variant: 'destructive', title: 'Parsing Error', description: `Could not parse CSV file. Please check the format. Error: ${results.errors[0].message}` });
                setIsImporting(false);
                return;
            }

            const requiredHeaders = ['name', 'dueDate', 'assigneeEmail'];
            const actualHeaders = results.meta.fields;
            const missingHeaders = requiredHeaders.filter(h => !actualHeaders?.includes(h));

            if (missingHeaders.length > 0) {
                 toast({ variant: 'destructive', title: 'Invalid CSV Format', description: `Missing required columns: ${missingHeaders.join(', ')}` });
                 setIsImporting(false);
                 return;
            }

            try {
                const batch = writeBatch(firestore);
                let tasksToCreate = 0;

                for (const row of results.data) {
                    if (!row.name || !row.dueDate || !row.assigneeEmail) {
                        console.warn("Skipping invalid row:", row);
                        continue;
                    }
                    
                    const assignee = usersByEmail.get(row.assigneeEmail.trim());
                    if (!assignee) {
                        console.warn(`Skipping task for unknown user: ${row.assigneeEmail}`);
                        continue;
                    }

                    const dueDate = new Date(row.dueDate);
                    if (isNaN(dueDate.getTime())) {
                        console.warn(`Skipping task with invalid due date: ${row.dueDate}`);
                        continue;
                    }

                    const tasksCollection = collection(firestore, 'users', assignee.uid, 'tasks');
                    const newTaskRef = doc(tasksCollection); // Create a new doc ref in the subcollection

                    batch.set(newTaskRef, {
                        name: row.name,
                        description: row.description || '',
                        priority: ['High', 'Medium', 'Low'].includes(row.priority || '') ? row.priority : 'Medium',
                        status: 'Not Started' as TaskStatus,
                        dueDate: Timestamp.fromDate(dueDate),
                        createdAt: serverTimestamp(),
                        assigneeId: assignee.uid,
                        assigneeName: assignee.displayName,
                        subtasks: [],
                    });
                    tasksToCreate++;
                }

                if (tasksToCreate === 0) {
                     toast({ variant: 'warning', title: 'Import Complete', description: 'No valid tasks were found to import.' });
                } else {
                    await batch.commit();
                    toast({ title: 'Import Successful', description: `${tasksToCreate} tasks have been imported and assigned.` });
                }
                
                form.reset();
                onOpenChange(false);
            } catch (error: any) {
                console.error("Firestore batch write error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'An unexpected error occurred during the import.' });
            } finally {
                setIsImporting(false);
            }
        },
        error: (error: Error) => {
            console.error("PapaParse error:", error);
            toast({ variant: 'destructive', title: 'File Read Error', description: error.message });
            setIsImporting(false);
        }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isImporting) {
            onOpenChange(isOpen);
            form.reset();
        }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Tasks from CSV</DialogTitle>
          <DialogDescription>Upload a CSV file to bulk-create tasks. The file must contain specific columns.</DialogDescription>
        </DialogHeader>
        
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Required CSV Format</AlertTitle>
            <AlertDescription>
                <p>Your CSV file must have a header row with the following columns:</p>
                <ul className="list-disc pl-5 mt-2 text-xs">
                    <li>`name` (Task title)</li>
                    <li>`assigneeEmail` (The email of the user to assign the task to)</li>
                    <li>`dueDate` (In YYYY-MM-DD format)</li>
                </ul>
                 <p className="mt-2">Optional columns:</p>
                <ul className="list-disc pl-5 mt-2 text-xs">
                    <li>`description` (Task description)</li>
                    <li>`priority` (High, Medium, or Low. Defaults to Medium)</li>
                </ul>
            </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>CSV File</FormLabel>
                    <FormControl>
                        <Input
                            type="file"
                            accept=".csv"
                            {...rest}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) onChange(file);
                            }}
                            disabled={isImporting}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>Cancel</Button>
              <Button type="submit" disabled={isImporting}>
                {isImporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> Import Tasks</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
