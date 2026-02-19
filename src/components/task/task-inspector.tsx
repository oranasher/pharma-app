'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, User, Calendar as CalendarIcon, Hash, Info, AlertTriangle } from 'lucide-react';
import { Task, AppUser, TaskStatus, TargetQuarter } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { triggerConfetti } from '@/lib/confetti';
import { Timestamp } from 'firebase/firestore';

interface TaskInspectorProps {
  task: Task | null;
  users: AppUser[];
  onClose: () => void;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
}

const statusOptions: TaskStatus[] = ['Not Started', 'In Progress', 'Completed'];
const quarterOptions: TargetQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const getQuarterFromDate = (date: Date): string => {
  const month = date.getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};

export function TaskInspector({ task, users, onClose, onUpdate }: TaskInspectorProps) {
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    if (task) {
      setLocalName(task.name);
    }
  }, [task]);

  const quarterMismatch = useMemo(() => {
    if (!task || !task.startDate || !task.targetQuarter) return false;
    const actualQuarter = getQuarterFromDate(task.startDate.toDate());
    return actualQuarter !== task.targetQuarter;
  }, [task]);

  if (!task) return null;

  const handleStatusChange = (status: TaskStatus) => {
    if (status === 'Completed' && task.status !== 'Completed') {
      triggerConfetti();
    }
    onUpdate(task.id, { status });
  };

  const handleNameBlur = () => {
    if (localName !== task.name) {
      onUpdate(task.id, { name: localName });
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 h-screen w-85 bg-background/90 backdrop-blur-2xl border-l border-primary/10 shadow-[-20px_0_50px_rgba(0,0,0,0.1)] z-[100] flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-4 border-b bg-muted/20 flex items-center justify-between shrink-0">
        <Badge variant="outline" className="h-5 text-[10px] uppercase font-black text-primary/70 tracking-widest">Task Inspector</Badge>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/10" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Title</Label>
          <Input value={localName} onChange={(e) => setLocalName(e.target.value)} onBlur={handleNameBlur} className="text-xl font-black border-none bg-transparent p-0 focus-visible:ring-0 shadow-none h-auto" />
        </div>

        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Workflow Status</Label>
          <Select value={task.status} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
            <SelectTrigger className="h-10 font-black text-xs transition-all border-none bg-muted/50"><SelectValue /></SelectTrigger>
            <SelectContent>{statusOptions.map(opt => (<SelectItem key={opt} value={opt} className="text-xs font-bold">{opt}</SelectItem>))}</SelectContent>
          </Select>
        </div>

        <Separator className="opacity-50" />

        <div className="grid gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5"><Clock className="h-3 w-3" /> Effort (Days)</Label>
            <Input 
              type="number" 
              value={task.estimatedDays ?? 0} 
              onChange={(e) => onUpdate(task.id, { estimatedDays: e.target.value === '' ? 0 : Number(e.target.value) })}
              className="h-10 bg-muted/20 border-primary/5 text-sm font-black"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5"><User className="h-3 w-3" /> Resource</Label>
            <Select value={task.assigneeId} onValueChange={(val) => onUpdate(task.id, { assigneeId: val, assigneeName: users.find(u => u.uid === val)?.displayName || 'Unknown' })}>
              <SelectTrigger className="h-10 text-xs font-black bg-muted/20 border-primary/5"><SelectValue /></SelectTrigger>
              <SelectContent>{users.map(u => (<SelectItem key={u.uid} value={u.uid} className="text-xs font-bold">{u.displayName}</SelectItem>))}</SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5"><Hash className="h-3 w-3" /> Quarter</Label>
              <Select value={task.targetQuarter || 'Q1'} onValueChange={(v) => onUpdate(task.id, { targetQuarter: v as TargetQuarter })}>
                <SelectTrigger className="h-10 text-xs font-black bg-muted/20 border-primary/5"><SelectValue /></SelectTrigger>
                <SelectContent>{quarterOptions.map(q => <SelectItem key={q} value={q} className="text-xs font-bold">{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5"><CalendarIcon className="h-3 w-3" /> Start</Label>
              <Popover><PopoverTrigger asChild><Button variant="outline" className="h-10 w-full justify-start text-[10px] font-black bg-muted/20 border-primary/5">{task.startDate ? format(task.startDate.toDate(), 'dd MMM yy') : 'Set Date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 border-none"><Calendar mode="single" selected={task.startDate?.toDate()} onSelect={(d) => d && onUpdate(task.id, { startDate: Timestamp.fromDate(d) as any })} /></PopoverContent></Popover>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 border-t bg-muted/10"><Button variant="outline" className="w-full h-11 text-[10px] font-black uppercase tracking-widest" onClick={onClose}>Commit & Close</Button></div>
    </motion.div>
  );
}