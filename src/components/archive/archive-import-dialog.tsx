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
import { AppUser } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const importFormSchema = z.object({
  file: z.instanceof(File).refine(file => file.type === 'text/csv', 'Please upload a valid CSV file.'),
});

type ImportFormValues = z.infer<typeof importFormSchema>;

interface CsvRow {
    name: string;
    assigneeName?: string;
    assigneeEmail: string;
    completedAt: string; // Expecting date string
    department?: string;
    equipmentName?: string;
    rin?: string;
    validationType?: string;
    binderLocation?: string;
    description?: string;
}

interface ArchiveImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[] | null;
}

export function ArchiveImportDialog({ open, onOpenChange, users }: ArchiveImportDialogProps) {
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
                toast({ variant: 'destructive', title: 'Parsing Error', description: `Could not parse CSV file. Error: ${results.errors[0].message}` });
                setIsImporting(false);
                return;
            }

            const requiredHeaders = ['name', 'assigneeEmail', 'completedAt'];
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
                    if (!row.name || !row.assigneeEmail || !row.completedAt) {
                        console.warn("Skipping invalid row:", row);
                        continue;
                    }
                    
                    const assignee = usersByEmail.get(row.assigneeEmail.trim());
                    if (!assignee) {
                        console.warn(`Skipping task for unknown user: ${row.assigneeEmail}`);
                        continue;
                    }

                    const completedAtDate = new Date(row.completedAt);
                    if (isNaN(completedAtDate.getTime())) {
                        console.warn(`Skipping task with invalid completed date: ${row.completedAt}`);
                        continue;
                    }

                    const tasksCollection = collection(firestore, 'users', assignee.uid, 'tasks');
                    const newTaskRef = doc(tasksCollection);

                    batch.set(newTaskRef, {
                        name: row.name,
                        assigneeId: assignee.uid,
                        assigneeName: assignee.displayName,
                        // Archive specific fields
                        department: row.department || null,
                        equipmentName: row.equipmentName || null,
                        rin: row.rin || null,
                        validationType: row.validationType || null,
                        binderLocation: row.binderLocation || null,
                        description: row.description || null,
                        // Default task fields
                        status: 'Completed',
                        completedAt: Timestamp.fromDate(completedAtDate),
                        dueDate: Timestamp.fromDate(completedAtDate), // Set due date same as completion for archive
                        createdAt: serverTimestamp(),
                        subtasks: [],
                        priority: 'Medium',
                    });
                    tasksToCreate++;
                }

                if (tasksToCreate === 0) {
                     toast({ variant: 'warning', title: 'ייבוא הושלם', description: 'לא נמצאו משימות תקינות לייבוא.' });
                } else {
                    await batch.commit();
                    toast({ title: 'ייבוא הושלם בהצלחה', description: `${tasksToCreate} משימות יובאו לארכיון.` });
                }
                
                form.reset();
                onOpenChange(false);
            } catch (error: any) {
                console.error("Firestore batch write error:", error);
                toast({ variant: 'destructive', title: 'Import Failed', description: error.message || 'An unexpected error occurred.' });
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
          <DialogTitle>ייבוא לארכיון מ-CSV</DialogTitle>
          <DialogDescription>העלה קובץ CSV כדי להוסיף משימות שהושלמו לארכיון. הקובץ חייב להכיל עמודות מסוימות.</DialogDescription>
        </DialogHeader>
        
        <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>פורמט CSV נדרש</AlertTitle>
            <AlertDescription>
                <p>קובץ ה-CSV שלך חייב להכיל שורת כותרת עם העמודות הבאות (באנגלית):</p>
                <ul className="list-disc pl-5 mt-2 text-xs font-mono">
                    <li>`name` (שם המשימה)</li>
                    <li>`assigneeEmail` (האימייל של המשתמש)</li>
                    <li>`completedAt` (בפורמט YYYY-MM-DD)</li>
                </ul>
                 <p className="mt-2">עמודות אופציונליות (באנגלית):</p>
                <ul className="list-disc pl-5 mt-2 text-xs font-mono">
                    <li>`assigneeName`</li>
                    <li>`department`</li>
                    <li>`equipmentName`</li>
                    <li>`rin`</li>
                    <li>`validationType`</li>
                    <li>`binderLocation`</li>
                    <li>`description`</li>
                </ul>
                 <p className="mt-2">הדרך הקלה ביותר היא לייצא את הארכיון הקיים, לערוך את הקובץ, ולייבא אותו מחדש.</p>
            </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
             <FormField
                control={form.control}
                name="file"
                render={({ field: { onChange, value, ...rest } }) => (
                    <FormItem>
                    <FormLabel>קובץ CSV</FormLabel>
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>ביטול</Button>
              <Button type="submit" disabled={isImporting}>
                {isImporting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מייבא...</>
                ) : (
                  <><Upload className="mr-2 h-4 w-4" /> ייבא משימות</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
