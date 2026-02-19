'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AppUser, TaskPriority, TaskStatus } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';

const archiveEntrySchema = z.object({
  name: z.string().min(1, 'שם המשימה הוא שדה חובה.'),
  assigneeId: z.string().min(1, 'חובה לבחור משתמש.'),
  completedAt: z.date({ required_error: 'תאריך השלמה הוא שדה חובה.' }),
  finalReportNumber: z.string().min(1, 'מספר דוח סופי הוא שדה חובה.'),
  binderLocation: z.string().min(1, 'מיקום קלסר הוא שדה חובה.'),
  department: z.string().optional(),
  rin: z.string().optional(),
  validationType: z.string().optional(),
  description: z.string().optional(),
});

type ArchiveEntryFormValues = z.infer<typeof archiveEntrySchema>;

interface ArchiveEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[] | null;
}

const validationTypes = ['Validation', 'Re-Validation', 'Periodic Review', 'Other'];


export function ArchiveEntryDialog({ open, onOpenChange, users }: ArchiveEntryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<ArchiveEntryFormValues>({
    resolver: zodResolver(archiveEntrySchema),
    defaultValues: {
      name: '',
      assigneeId: '',
      finalReportNumber: '',
      binderLocation: '',
      department: '',
      rin: '',
      validationType: '',
      description: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset();
    }
  }, [open, form]);

  const onSubmit = (data: ArchiveEntryFormValues) => {
    if (!firestore || !users) return;

    const selectedUser = users.find(u => u.uid === data.assigneeId);
    if (!selectedUser) {
        toast({ variant: 'destructive', title: 'שגיאה', description: 'המשתמש שנבחר לא נמצא.' });
        return;
    }

    const tasksCollection = collection(firestore, 'users', selectedUser.uid, 'tasks');
    
    const taskData = {
        name: data.name,
        assigneeId: selectedUser.uid,
        assigneeName: selectedUser.displayName,
        department: data.department || null,
        rin: data.rin || null,
        validationType: data.validationType || null,
        binderLocation: data.binderLocation,
        description: data.description || null,
        finalReportNumber: data.finalReportNumber,
        status: 'Completed' as TaskStatus,
        completedAt: Timestamp.fromDate(data.completedAt),
        dueDate: Timestamp.fromDate(data.completedAt), // Set due date to completion date
        createdAt: serverTimestamp(),
        subtasks: [],
        priority: 'Medium' as TaskPriority,
    };
    
    addDocumentNonBlocking(tasksCollection, taskData)
        .then(() => {
            toast({ title: 'רשומה נוצרה', description: `הרשומה "${data.name}" נוספה בהצלחה לארכיון.` });
            onOpenChange(false);
        })
        .catch((error) => {
            // Error is handled globally by the emitter in non-blocking-updates
            console.error("Error creating archive entry:", error);
            // We might still want a toast here as a fallback
            toast({ variant: 'destructive', title: 'שגיאה ביצירת רשומה', description: 'אירעה שגיאה. נסה שוב.' });
        });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>הוספת רשומה חדשה לארכיון</DialogTitle>
          <DialogDescription>הזן את פרטי המשימה שהושלמה כדי להוסיף אותה ידנית לארכיון.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>שם המשימה</FormLabel>
                  <FormControl><Input placeholder="לדוגמה: ולידציית ציוד AUT-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>משתמש</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger disabled={!users}>
                        <SelectValue placeholder="בחר משתמש" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {!users ? (
                        <SelectItem value="loading" disabled>טוען משתמשים...</SelectItem>
                        ) : (
                        <>
                            {user && (
                            <>
                                <SelectItem value={user.uid}>(אני) {user.displayName}</SelectItem>
                                <SelectSeparator />
                            </>
                            )}
                            {users.filter(u => u.uid !== user?.uid).map(u => (
                            <SelectItem key={u.uid} value={u.uid}>
                                {u.displayName}
                            </SelectItem>
                            ))}
                        </>
                        )}
                    </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />

            <FormField
                control={form.control}
                name="completedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>תאריך השלמה</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                          >
                            {field.value ? format(field.value, 'PPP') : <span>בחר תאריך</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <FormField
              control={form.control}
              name="finalReportNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מספר דוח סופי</FormLabel>
                  <FormControl><Input placeholder="e.g., VR-2024-05-20" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="binderLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>מיקום קלסר</FormLabel>
                  <FormControl><Input placeholder="e.g., Shelf A-3" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <h3 className="text-sm font-medium text-muted-foreground pt-4">פרטים אופציונליים</h3>
            <div className="space-y-4 rounded-md border p-4">
                <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>מחלקה</FormLabel>
                        <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                        </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="rin"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>RIN</FormLabel>
                        <FormControl><Input {...field}  value={field.value ?? ''}/></FormControl>
                        <FormMessage />
                        </FormItem>
                )} />
                <FormField
                    control={form.control}
                    name="validationType"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>סוג ולידציה</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {validationTypes.map(type => (
                                <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>הערות</FormLabel>
                        <FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage />
                        </FormItem>
                )} />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>ביטול</Button>
              <Button type="submit">הוסף רשומה</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
