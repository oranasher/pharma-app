'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, doc, Timestamp } from 'firebase/firestore';
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
import { CalendarIcon, AlertCircle, Clock, UserCheck, Users, X } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, startOfQuarter, setMonth, getYear } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AppUser, Task, TaskPriority, TaskTemplate, Equipment, TargetQuarter } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '../ui/badge';

const taskFormSchema = z.object({
  templateId: z.string().optional(),
  name: z.string().min(1, 'Task name is required.'),
  description: z.string().optional(),
  priority: z.enum(['High', 'Medium', 'Low']),
  dueDate: z.date({
    required_error: 'A due date is required.',
  }),
  assigneeId: z.string().min(1, 'Please select a user to assign the task to.'),
  equipmentId: z.string().optional(),
  targetQuarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  startDate: z.date().optional(),
  delayReason: z.string().optional(),
  estimatedDays: z.coerce.number().min(0).default(0),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  mode: 'create' | 'edit';
  task?: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AppUser[] | null;
  templates: TaskTemplate[] | null;
  equipment: Equipment[] | null;
  isLoadingUsers: boolean;
  isLoadingTemplates: boolean;
  isLoadingEquipment: boolean;
}

export function TaskDialog({ mode, task, open, onOpenChange, users, templates, equipment, isLoadingUsers, isLoadingTemplates, isLoadingEquipment }: TaskDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isAdmin } = useUser();
  const isEditMode = mode === 'edit';

  const [calendarMonth, setCalendarMonth] = useState<Date | undefined>(new Date());
  const [showMemberSelect, setShowMemberSelect] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      name: '',
      description: '',
      assigneeId: '',
      priority: 'Medium',
      estimatedDays: 0,
    }
  });

  const selectedDueDate = form.watch('dueDate');
  const currentAssigneeId = form.watch('assigneeId');

  const isDelayDetected = useMemo(() => {
    if (!isEditMode || !task || !task.dueDate) return false;
    const originalDueDate = task.dueDate.toDate();
    const isPushingBack = selectedDueDate && selectedDueDate > originalDueDate;
    return isPushingBack && !task.isDelayApproved;
  }, [isEditMode, task, selectedDueDate]);

  useEffect(() => {
    if (open) {
      if (isEditMode && task) {
        const initialDate = task.dueDate?.toDate() || task.startDate?.toDate() || new Date();
        form.reset({
          name: task.name,
          description: task.description || '',
          assigneeId: task.assigneeId,
          priority: task.priority || 'Medium',
          dueDate: task.dueDate?.toDate(),
          templateId: task.taskTemplateId || '',
          equipmentId: task.equipmentId || '',
          targetQuarter: task.targetQuarter,
          startDate: task.startDate?.toDate(),
          delayReason: task.delayReason || '',
          estimatedDays: task.estimatedDays || 0,
        });
        setCalendarMonth(initialDate);
        setShowMemberSelect(task.assigneeId !== user?.uid);
      } else {
        form.reset({
          name: '',
          description: '',
          assigneeId: user?.uid || '',
          priority: 'Medium',
          templateId: '',
          equipmentId: '',
          dueDate: undefined,
          targetQuarter: undefined,
          startDate: undefined,
          delayReason: '',
          estimatedDays: 0,
        });
        setCalendarMonth(new Date());
        setShowMemberSelect(false);
      }
    }
  }, [open, isEditMode, task, user, form]);

  const handleQuarterChange = (quarter: TargetQuarter) => {
    form.setValue('targetQuarter', quarter);
    const year = getYear(new Date());
    let monthIndex = 0;
    if (quarter === 'Q2') monthIndex = 3;
    if (quarter === 'Q3') monthIndex = 6;
    if (quarter === 'Q4') monthIndex = 9;
    
    const qStartDate = startOfQuarter(setMonth(new Date(year, 0, 1), monthIndex));
    form.setValue('startDate', qStartDate);
    setCalendarMonth(qStartDate);
  };

  const handleTemplateChange = (templateId: string) => {
    if (!isEditMode) {
      const selectedTemplate = templates?.find(t => t.id === templateId);
      if (selectedTemplate) {
        form.setValue('name', selectedTemplate.name);
        form.setValue('description', selectedTemplate.description);
        form.setValue('templateId', selectedTemplate.id);
        if (selectedTemplate.estimatedDays !== undefined) {
          form.setValue('estimatedDays', selectedTemplate.estimatedDays);
        }
      }
    }
  };
  
  const onSubmit = (data: TaskFormValues) => {
    if (!firestore || !user) return;

    if (isDelayDetected && !data.delayReason) {
      form.setError('delayReason', { message: 'Reason for delay is mandatory.' });
      return;
    }

    const assigneeUid = data.assigneeId;
    const allAvailableUsers = users ? [...users] : [];
    const selectedUser = allAvailableUsers.find(u => u.uid === assigneeUid);
    const assigneeName = selectedUser?.displayName || user?.displayName || 'Unnamed User';
      
    const taskData: any = {
        name: data.name,
        description: data.description,
        dueDate: data.dueDate,
        priority: data.priority,
        assigneeId: data.assigneeId,
        assigneeName: assigneeName,
        equipmentId: (data.equipmentId && data.equipmentId !== 'none') ? data.equipmentId : null,
        equipmentName: equipment?.find(e => e.id === data.equipmentId)?.name || null,
        targetQuarter: data.targetQuarter || null,
        startDate: data.startDate ? Timestamp.fromDate(data.startDate) : null,
        delayReason: data.delayReason || null,
        estimatedDays: data.estimatedDays,
    };

    if (isDelayDetected) taskData.isDelayApproved = false;

    if (isEditMode && task) {
        const taskRef = doc(firestore, 'users', task.assigneeId, 'tasks', task.id);
        setDocumentNonBlocking(taskRef, taskData, { merge: true });
        toast({ title: 'Task Updated', description: `Task "${data.name}" has been updated.` });
    } else {
        taskData.status = 'Not Started';
        taskData.createdAt = serverTimestamp();
        taskData.isDelayApproved = false;
        const tasksCollection = collection(firestore, 'users', assigneeUid, 'tasks');
        addDocumentNonBlocking(tasksCollection, taskData);
        toast({ title: 'Task Created', description: `Task "${data.name}" has been assigned.` });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 h-[85vh] flex flex-col border-white/10 bg-slate-950/95 backdrop-blur-2xl overflow-hidden">
        <DialogHeader className="p-6 pb-2 shrink-0">
          <DialogTitle className="text-2xl font-black tracking-tighter text-white uppercase">{isEditMode ? 'Edit Strategy' : 'Initialize New Task'}</DialogTitle>
          <DialogDescription className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Strategic resource allocation & timeline control</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-6">
              {!isEditMode && (
                <FormField control={form.control} name="templateId" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Task Template</FormLabel>
                    <Select onValueChange={handleTemplateChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white/5 border-white/10 text-white h-11"><SelectValue placeholder="Select a protocol template..." /></SelectTrigger></FormControl>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {templates?.map(t => (<SelectItem key={t.id} value={t.id} className="focus:bg-primary/20 focus:text-primary">{t.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mission Name</FormLabel>
                  <FormControl><Input {...field} className="bg-white/5 border-white/10 text-white h-11 font-bold focus:border-primary/50" placeholder="e.g., Equipment Validation AUT-001" /></FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="targetQuarter" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Quarter</FormLabel>
                    <Select onValueChange={handleQuarterChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white/5 border-white/10 text-white h-11"><SelectValue placeholder="Select Quarter" /></SelectTrigger></FormControl>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="Q1">Q1 Foundation</SelectItem>
                        <SelectItem value="Q2">Q2 Production</SelectItem>
                        <SelectItem value="Q3">Q3 Optimization</SelectItem>
                        <SelectItem value="Q4">Q4 Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Commencement Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('h-11 justify-center text-center font-bold bg-white/5 border-white/10 text-white hover:bg-white/10', !field.value && 'text-slate-500')}>
                            {field.value ? format(field.value, 'dd MMM yyyy') : <span>Select Date</span>}
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10"><Calendar mode="single" selected={field.value} onSelect={field.onChange} month={calendarMonth} onMonthChange={setCalendarMonth} initialFocus /></PopoverContent>
                    </Popover>
                  </FormItem>
                )} />
              </div>

              {isAdmin && (
                <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-4 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                  <div className="flex items-center gap-2 text-cyan-400 font-black text-[10px] uppercase tracking-widest"><Clock className="h-3.5 w-3.5" /><span>Manager: Resource Planning</span></div>
                  <FormField control={form.control} name="estimatedDays" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[9px] font-bold uppercase text-cyan-400/60">Estimated Effort (Total Cycles/Days)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))} className="bg-black/40 border-cyan-500/20 text-white h-10 font-mono" /></FormControl>
                    </FormItem>
                  )} />

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className={cn(
                        "h-10 text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all",
                        currentAssigneeId === user?.uid ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                      onClick={() => {
                        form.setValue('assigneeId', user?.uid || '');
                        setShowMemberSelect(false);
                      }}
                    >
                      <UserCheck className="mr-2 h-3.5 w-3.5" /> Assign to Me
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      className={cn(
                        "h-10 text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all",
                        showMemberSelect ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]" : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                      onClick={() => setShowMemberSelect(true)}
                    >
                      <Users className="mr-2 h-3.5 w-3.5" /> Select Member
                    </Button>
                  </div>

                  {showMemberSelect && (
                    <FormField control={form.control} name="assigneeId" render={({ field }) => (
                      <FormItem className="animate-in fade-in slide-in-from-top-2">
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="bg-black/40 border-cyan-500/20 text-white h-10"><SelectValue placeholder="Choose Officer..." /></SelectTrigger></FormControl>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            {users?.map(u => (<SelectItem key={u.uid} value={u.uid} className="focus:bg-cyan-500/20 focus:text-cyan-400">{u.displayName}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <FormField control={form.control} name="priority" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Priority Level</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white/5 border-white/10 text-white h-11"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="High" className="text-red-500 focus:bg-red-500/10 focus:text-red-500">CRITICAL_HIGH</SelectItem>
                        <SelectItem value="Medium" className="text-amber-500 focus:bg-amber-500/10 focus:text-amber-500">STABLE_MEDIUM</SelectItem>
                        <SelectItem value="Low" className="text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-500">ROUTINE_LOW</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Deadline</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={'outline'} className={cn('h-11 justify-center text-center font-bold bg-white/5 border-white/10 text-white hover:bg-white/10', !field.value && 'text-slate-500')}>
                            {field.value ? format(field.value, 'dd MMM yyyy') : <span>Select Deadline</span>}
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-slate-900 border-white/10"><Calendar mode="single" selected={field.value} onSelect={field.onChange} month={calendarMonth} onMonthChange={setCalendarMonth} initialFocus /></PopoverContent>
                    </Popover>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Description & Mission Objectives</FormLabel>
                  <FormControl><Textarea {...field} value={field.value ?? ''} className="min-h-[80px] bg-white/5 border-white/10 text-white focus:border-primary/50 resize-none" placeholder="Detail the validation requirements..." /></FormControl>
                </FormItem>
              )} />
            </div>

            <DialogFooter className="p-6 border-t border-white/5 bg-black/40 shrink-0 flex items-center justify-between sm:justify-between gap-4">
              <Button type="button" variant="ghost" className="text-slate-500 hover:text-white hover:bg-white/5 font-black text-xs uppercase tracking-widest" onClick={() => onOpenChange(false)}>Cancel Protocol</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground font-black px-8 h-12 rounded-xl text-xs uppercase tracking-[0.2em] shadow-lg shadow-primary/20 transition-transform active:scale-95">Commit & Initialize</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}