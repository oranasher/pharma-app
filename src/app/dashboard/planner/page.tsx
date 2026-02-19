'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { AppUser, Task, TaskPriority, TargetQuarter } from '@/lib/types';
import { collection, collectionGroup, query, doc, writeBatch, Timestamp, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUp, ArrowRight, ArrowDown, Bot, Calendar as CalendarIcon, Layers, Map, X, ChevronLeft, ChevronRight, Check, RotateCcw, AlertTriangle, Users, Target, Activity, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, addDays, startOfToday, differenceInCalendarDays, isSameDay, isWeekend, subDays, parseISO, addWeeks, addMonths, subMonths } from 'date-fns';
import { cn, getInitials } from '@/lib/utils';
import { DndContext, closestCenter, DragEndEvent, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable, DragOverlay } from '@dnd-kit/core';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { suggestWorkloadBalance, WorkloadSuggestion } from '@/ai/flows/suggest-workload-balance';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { TaskInspector } from '@/components/task/task-inspector';
import { PresenceIndicator } from '@/components/user/presence-indicator';
import { Progress } from '@/components/ui/progress';
import { AiStrategyDrawer } from '@/components/planner/ai-strategy-drawer';

type ViewMode = 'days' | 'weeks' | 'months';

const priorityIcons: { [key in TaskPriority]: React.ComponentType<{ className?: string }> } = {
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
}

const priorityColors: { [key in TaskPriority]: string } = {
  High: 'bg-red-500/20 border-red-500/40 text-red-700',
  Medium: 'bg-amber-500/20 border-amber-500/40 text-amber-700',
  Low: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-700',
};

const getQuarterFromDate = (date: Date): string => {
  const month = date.getMonth();
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};

function Counter({ value, suffix = "" }: { value: number, suffix?: string }) {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        const controls = animate(0, value, {
            duration: 1.5,
            ease: "easeOut",
            onUpdate: (latest) => setDisplayValue(Math.floor(latest))
        });
        return () => controls.stop();
    }, [value]);
    return <span>{displayValue}{suffix}</span>;
}

function PulseBar({ 
    activeUsers, 
    capacity, 
    quarterProgress,
    onCapacityClick 
}: { 
    activeUsers: number, 
    capacity: number, 
    quarterProgress: number,
    onCapacityClick: () => void
}) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-8 px-6 py-3 mb-4 rounded-2xl bg-background/40 backdrop-blur-xl border border-primary/10 shadow-lg"
        >
            <div 
                className="flex items-center gap-4 cursor-pointer group"
                onClick={onCapacityClick}
            >
                <div className="relative flex items-center justify-center">
                    <svg className="w-12 h-12 transform -rotate-90">
                        <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" className="text-muted/20" />
                        <motion.circle 
                            cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" fill="transparent" 
                            strokeDasharray="125.6"
                            initial={{ strokeDashoffset: 125.6 }}
                            animate={{ strokeDashoffset: 125.6 - (125.6 * Math.min(capacity, 100)) / 100 }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={cn(
                                capacity > 90 ? "text-red-500" : capacity > 70 ? "text-amber-500" : "text-emerald-500",
                                "drop-shadow-[0_0_4px_rgba(0,0,0,0.1)]"
                            )}
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                        <Counter value={capacity} suffix="%" />
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Team Capacity</p>
                    <p className="text-xs text-muted-foreground font-medium opacity-60">Avg Workload</p>
                </div>
            </div>

            <Separator orientation="vertical" className="h-10 opacity-20" />

            <div className="flex-1 max-w-xs">
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Quarter Progress</span>
                    </div>
                    <span className="text-[10px] font-black"><Counter value={quarterProgress} suffix="%" /></span>
                </div>
                <Progress value={quarterProgress} className="h-1.5" />
            </div>

            <Separator orientation="vertical" className="h-10 opacity-20" />

            <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center relative">
                        <Activity className="h-5 w-5 text-primary animate-pulse" />
                        <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                    </div>
                </div>
                <div>
                    <p className="text-lg font-black leading-none"><Counter value={activeUsers} /></p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Now</p>
                </div>
            </div>
        </motion.div>
    );
}

function GanttCell({ userId, date, isToday, isWeekendDay, width, isHighlighted }: { userId: string, date: Date, isToday: boolean, isWeekendDay: boolean, width: number, isHighlighted: boolean }) {
    const dateKey = format(date, 'yyyy-MM-dd');
    const { setNodeRef, isOver } = useDroppable({
        id: `cell:${userId}:${dateKey}`,
        data: { userId, date: dateKey }
    });

    return (
        <div 
            ref={setNodeRef}
            style={{ width }} 
            className={cn(
                "shrink-0 border-r border-muted/10 h-full transition-all relative",
                isWeekendDay ? "bg-muted/30" : "bg-transparent",
                isToday && "bg-primary/5",
                isOver && "bg-primary/20 z-10",
                isHighlighted && "bg-blue-500/10 z-10 shadow-[inset_0_0_15px_rgba(59,130,246,0.2)]"
            )}
        >
            {isOver && <div className="absolute inset-0 border-2 border-primary border-dashed opacity-30" />}
        </div>
    );
}

function DraggableGanttTask({ 
    task, 
    timelineStart, 
    timelineEnd, 
    viewMode, 
    onSelect, 
    isSelected,
    isHighlighted 
}: { 
    task: Task, 
    timelineStart: Date, 
    timelineEnd: Date, 
    viewMode: ViewMode, 
    onSelect: (taskId: string) => void, 
    isSelected: boolean,
    isHighlighted: boolean
}) {
    const startDate = task.startDate?.toDate() || timelineStart;
    const dueDate = task.dueDate?.toDate() || addDays(startDate, task.estimatedDays || 1);
    
    if (dueDate < timelineStart || startDate > timelineEnd) return null;

    const duration = task.estimatedDays || 1;
    const pixelsPerDay = viewMode === 'days' ? 45 : viewMode === 'weeks' ? 100/7 : 150/30;
    
    const left = differenceInCalendarDays(startDate, timelineStart) * pixelsPerDay;
    const width = Math.max(duration * pixelsPerDay, 4);

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: { task }
    });

    const style = { 
        left, 
        width, 
        position: 'absolute' as const,
        zIndex: isSelected || isHighlighted ? 100 : 20
    };

    const PriorityIcon = priorityIcons[task.priority || 'Medium'];
    const showLabel = viewMode === 'days' && width > 60;

    return (
        <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                    <motion.div 
                        layout
                        ref={setNodeRef}
                        {...listeners}
                        {...attributes}
                        onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelect(task.id);
                        }}
                        className={cn(
                            "absolute h-6 rounded-sm border flex items-center px-1.5 cursor-grab active:cursor-grabbing group transition-all backdrop-blur-md overflow-hidden shadow-sm",
                            isDragging ? "opacity-0 pointer-events-none" : priorityColors[task.priority || 'Medium'],
                            isSelected && "ring-2 ring-primary ring-offset-1 brightness-110",
                            isHighlighted && "ring-2 ring-blue-500 ring-offset-1 shadow-[0_0_15px_rgba(59,130,246,0.6)] brightness-110 scale-[1.02]",
                            "hover:shadow-md hover:brightness-105"
                        )}
                        style={style as any}
                    >
                        <div className="flex items-center gap-1 truncate whitespace-nowrap overflow-hidden pointer-events-none">
                            <PriorityIcon className="h-3 w-3 flex-shrink-0" />
                            {showLabel && <span className="text-[9px] font-bold tracking-tight uppercase truncate">{task.name}</span>}
                        </div>
                    </motion.div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-popover/95 backdrop-blur-xl border-primary/20 text-[10px] p-2 shadow-2xl z-[100] min-w-[180px]">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-4">
                            <p className="font-bold text-foreground truncate">{task.name}</p>
                            <Badge variant="outline" className={cn("text-[8px] h-4 shrink-0", priorityColors[task.priority || 'Medium'])}>{task.priority || 'Medium'}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{duration} days estimated</span>
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function GanttTaskBarOverlay({ task, viewMode }: { task: Task, viewMode: ViewMode }) {
    const duration = task.estimatedDays || 1;
    const pixelsPerDay = viewMode === 'days' ? 45 : viewMode === 'weeks' ? 100/7 : 150/30;
    const width = duration * pixelsPerDay;
    const PriorityIcon = priorityIcons[task.priority || 'Medium'];

    return (
        <div 
            className={cn(
                "h-6 rounded-sm border flex items-center px-1.5 shadow-2xl opacity-90 backdrop-blur-xl",
                priorityColors[task.priority || 'Medium']
            )}
            style={{ width }}
        >
            <div className="flex items-center gap-1 truncate">
                <PriorityIcon className="h-3 w-3" />
                <span className="text-[9px] font-bold uppercase">{task.name}</span>
            </div>
        </div>
    );
}

function CapacityRibbon({ userTasks, timelineUnits, unitWidth, viewMode }: { userTasks: Task[], timelineUnits: Date[], unitWidth: number, viewMode: ViewMode }) {
    const loadPerUnit = useMemo(() => {
        return timelineUnits.map((unit) => {
            const rangeStart = unit;
            const rangeEnd = 
                viewMode === 'days' ? addDays(unit, 1) : 
                viewMode === 'weeks' ? addWeeks(unit, 1) : 
                addMonths(unit, 1);
            
            const overlapping = userTasks.filter(task => {
                const taskStart = task.startDate?.toDate() || rangeStart;
                const taskEnd = task.dueDate?.toDate() || addDays(taskStart, task.estimatedDays || 1);
                return (taskStart < rangeEnd && taskEnd > rangeStart);
            });
            return overlapping.length;
        });
    }, [timelineUnits, userTasks, viewMode]);

    return (
        <div className="flex h-[4px] absolute top-0 left-0 right-0 pointer-events-none z-10">
            {loadPerUnit.map((load, i) => (
                <div 
                    key={i} 
                    style={{ width: unitWidth }} 
                    className={cn(
                        "h-full transition-colors duration-500",
                        load === 0 ? "bg-transparent" :
                        load === 1 ? "bg-emerald-400/70" :
                        load === 2 ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" :
                        "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)] animate-pulse"
                    )}
                />
            ))}
        </div>
    );
}

function PlannerPageContent() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { appUser } = useUser();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('days');
  const [timelineStart, setTimelineStart] = useState(startOfToday());
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedTasks, setSimulatedTasks] = useState<Task[] | null>(null);
  const [showExitSimDialog, setShowExitSimDialog] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<WorkloadSuggestion[] | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [hoveredAiAction, setHoveredAiAction] = useState<{ taskId?: string; toUserId?: string } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ task: Task; toUserId: string; newStartDate: Date } | null>(null);
  const [focusBottlenecks, setFocusBottlenecks] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const allTasksQuery = useMemo(() => firestore ? query(collectionGroup(firestore, 'tasks')) : null, [firestore]);
  const allUsersQuery = useMemo(() => firestore ? query(collection(firestore, 'public_users')) : null, [firestore]);

  const { data: initialTasks, isLoading: areTasksLoading } = useCollection<Task>(allTasksQuery);
  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(allUsersQuery);

  useEffect(() => {
    if (isSimulating && !simulatedTasks && initialTasks) {
        setSimulatedTasks([...initialTasks]);
    }
  }, [isSimulating, initialTasks, simulatedTasks]);

  const currentTasks = useMemo(() => isSimulating ? (simulatedTasks || initialTasks || []) : (initialTasks || []), [isSimulating, simulatedTasks, initialTasks]);

  const allPlannerUsers = useMemo(() => {
    if (!users) return [];
    const list = [...users];
    if (appUser && !list.some(u => u.uid === appUser.uid)) {
        list.push(appUser);
    }
    return list.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
  }, [users, appUser]);

  const selectedTask = useMemo(() => currentTasks.find(t => t.id === selectedTaskId) || null, [currentTasks, selectedTaskId]);

  const unitWidth = viewMode === 'days' ? 45 : viewMode === 'weeks' ? 100 : 150;
  const unitCount = viewMode === 'days' ? 30 : viewMode === 'weeks' ? 12 : 12;

  const timelineUnits = useMemo(() => {
      return Array.from({ length: unitCount }).map((_, i) => 
          viewMode === 'days' ? addDays(timelineStart, i) : 
          viewMode === 'weeks' ? addWeeks(timelineStart, i) :
          addMonths(timelineStart, i)
      );
  }, [timelineStart, viewMode, unitCount]);

  const timelineEnd = useMemo(() => {
      const lastUnit = timelineUnits[timelineUnits.length - 1];
      return viewMode === 'days' ? addDays(lastUnit, 1) : 
             viewMode === 'weeks' ? addWeeks(lastUnit, 1) :
             addMonths(lastUnit, 1);
  }, [timelineUnits, viewMode]);

  const todayLineOffset = useMemo(() => {
      const today = startOfToday();
      const diff = differenceInCalendarDays(today, timelineStart);
      if (diff >= 0 && diff < unitCount) {
          return diff * (viewMode === 'days' ? 45 : viewMode === 'weeks' ? 100/7 : 150/30);
      }
      return null;
  }, [timelineStart, unitCount, viewMode]);

  const kpis = useMemo(() => {
      const activeUsersCount = allPlannerUsers.filter(u => {
          if (!u.lastSeen) return false;
          if (u.status === 'offline') return false;
          return (Date.now() - u.lastSeen.toDate().getTime()) < 120000;
      }).length;

      const totalCapacity = allPlannerUsers.length * 20; 
      const totalPlannedEffort = currentTasks
          .filter(t => t.status !== 'Completed')
          .reduce((sum, t) => sum + (t.estimatedDays || 0), 0);
      const capacityUtilization = totalCapacity > 0 ? Math.round((totalPlannedEffort / totalCapacity) * 100) : 0;

      const currentQuarter = getQuarterFromDate(new Date());
      const quarterTasks = currentTasks.filter(t => t.targetQuarter === currentQuarter);
      const completedQuarterTasks = quarterTasks.filter(t => t.status === 'Completed').length;
      const quarterProgress = quarterTasks.length > 0 ? Math.round((completedQuarterTasks / quarterTasks.length) * 100) : 0;

      return { activeUsersCount, capacityUtilization, quarterProgress };
  }, [allPlannerUsers, currentTasks]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }));

  const handleDragStart = (event: DragStartEvent) => {
    const task = event.active.data.current?.task as Task;
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = active.data.current?.task as Task;
    if (!task) return;

    const overId = over.id as string;
    if (overId.startsWith('cell:')) {
        const [, toUserId, dateStr] = overId.split(':');
        const newStartDate = parseISO(dateStr);
        const currentStart = task.startDate?.toDate() || new Date();
        if (toUserId === task.assigneeId && isSameDay(newStartDate, currentStart)) return;
        setPendingMove({ task, toUserId, newStartDate });
    }
  };

  const confirmMove = async (taskToMove?: Task, toUserIdMove?: string, newStartDateMove?: Date) => {
    const task = taskToMove || pendingMove?.task;
    const toUserId = toUserIdMove || pendingMove?.toUserId;
    const newStartDate = newStartDateMove || pendingMove?.newStartDate;

    if (!task || !toUserId || !newStartDate) return;

    const toUser = allPlannerUsers?.find(u => u.uid === toUserId);
    const newStartDateTimestamp = Timestamp.fromDate(newStartDate);
    const newDueDateTimestamp = Timestamp.fromDate(addDays(newStartDate, task.estimatedDays || 1));

    if (isSimulating) {
        setSimulatedTasks(prev => {
            if (!prev) return null;
            // Preserving ID and Path is CRITICAL for the simulation to remain functional
            return prev.map(t => t.id === task.id ? { 
                ...t, 
                assigneeId: toUserId, 
                assigneeName: toUser?.displayName || 'Unknown', 
                startDate: newStartDateTimestamp, 
                dueDate: newDueDateTimestamp 
            } : t);
        });
        toast({ title: "Sandbox Updated" });
        setPendingMove(null);
    } else {
        if (!firestore || !task.path) return;
        const batch = writeBatch(firestore);
        const oldTaskRef = doc(firestore, task.path);
        const newTaskRef = doc(firestore, 'users', toUserId, 'tasks', task.id);
        
        // Prepare clean document data for Firestore (excluding id and path)
        const updatedData = { 
            ...task, 
            assigneeId: toUserId, 
            assigneeName: toUser?.displayName || 'Unknown', 
            startDate: newStartDateTimestamp, 
            dueDate: newDueDateTimestamp 
        };
        delete (updatedData as any).id;
        delete (updatedData as any).path;
        
        batch.set(newTaskRef, updatedData);
        if (task.assigneeId !== toUserId) batch.delete(oldTaskRef);
        
        try { 
            await batch.commit(); 
            toast({ title: "Resource Updated" }); 
        } catch (e) { 
            toast({ variant: "destructive", title: "Error" }); 
        } finally { 
            setPendingMove(null); 
        }
    }
  };

  const handleUpdateTaskFromInspector = async (taskId: string, updates: Partial<Task>) => {
    const task = currentTasks.find(t => t.id === taskId);
    if (!task) return;
    let finalUpdates = { ...updates };
    if (updates.estimatedDays !== undefined || updates.startDate !== undefined) {
        const start = (updates.startDate || task.startDate)?.toDate() || new Date();
        const duration = updates.estimatedDays !== undefined ? updates.estimatedDays : (task.estimatedDays || 1);
        finalUpdates.dueDate = Timestamp.fromDate(addDays(start, duration)) as any;
    }
    if (isSimulating) {
        setSimulatedTasks(prev => {
            if (!prev) return null;
            return prev.map(t => t.id === taskId ? { ...t, ...finalUpdates } : t);
        });
    } else {
        if (!firestore || !task.path) return;
        try {
            const taskRef = doc(firestore, task.path);
            if (updates.assigneeId && updates.assigneeId !== task.assigneeId) {
                const batch = writeBatch(firestore);
                const newTaskRef = doc(firestore, 'users', updates.assigneeId, 'tasks', task.id);
                const data = { ...task, ...finalUpdates };
                delete (data as any).id; delete (data as any).path;
                batch.set(newTaskRef, data); batch.delete(taskRef);
                await batch.commit();
            } else { await updateDoc(taskRef, finalUpdates); }
            toast({ title: "Updated" });
        } catch (e) { toast({ variant: "destructive", title: "Error" }); }
    }
  };

  const toggleSimulation = () => {
    if (isSimulating) {
        const hasChanges = JSON.stringify(simulatedTasks) !== JSON.stringify(initialTasks);
        if (hasChanges) setShowExitSimDialog(true);
        else { setIsSimulating(false); setSimulatedTasks(null); }
    } else {
        setIsSimulating(true);
        setSimulatedTasks(initialTasks ? [...initialTasks] : []);
        toast({ title: "Entering Simulation Mode" });
    }
  };

  const handleApplySimChanges = async () => {
    if (!firestore || !simulatedTasks || !initialTasks) return;
    const batch = writeBatch(firestore);
    let changeCount = 0;
    simulatedTasks.forEach(simTask => {
        const originalTask = initialTasks.find(t => t.id === simTask.id);
        if (JSON.stringify(simTask) !== JSON.stringify(originalTask)) {
            const oldTaskRef = doc(firestore, originalTask?.path || simTask.path);
            const newTaskRef = doc(firestore, 'users', simTask.assigneeId, 'tasks', simTask.id);
            const updatedData = { ...simTask };
            delete (updatedData as any).id; delete (updatedData as any).path;
            batch.set(newTaskRef, updatedData);
            if (originalTask && simTask.assigneeId !== originalTask.assigneeId) batch.delete(oldTaskRef);
            changeCount++;
        }
    });
    try { if (changeCount > 0) { await batch.commit(); toast({ title: "Simulation Applied" }); } } 
    catch (e) { toast({ variant: "destructive", title: "Error" }); } 
    finally { setIsSimulating(false); setSimulatedTasks(null); setShowExitSimDialog(false); }
  };

  const jumpToToday = () => {
      setTimelineStart(startOfToday());
  };

  const navigateTimeline = (direction: 'next' | 'prev') => {
      if (viewMode === 'days') {
          setTimelineStart(direction === 'next' ? addDays(timelineStart, 30) : subDays(timelineStart, 30));
      } else if (viewMode === 'weeks') {
          setTimelineStart(direction === 'next' ? addWeeks(timelineStart, 12) : subDays(timelineStart, 12 * 7));
      } else {
          setTimelineStart(direction === 'next' ? addMonths(timelineStart, 12) : subMonths(timelineStart, 12));
      }
  }

  const handleAiSuggestTrigger = async () => {
    if (!currentTasks || !allPlannerUsers) return;
    setIsSuggesting(true);
    setIsAiDrawerOpen(true);
    try {
        const result = await suggestWorkloadBalance({
            tasks: currentTasks.map(t => ({ id: t.id, name: t.name, assigneeId: t.assigneeId, priority: t.priority, dueDate: { seconds: t.dueDate.seconds, nanoseconds: t.dueDate.nanoseconds } } as any)),
            users: allPlannerUsers.map(u => ({ uid: u.uid, displayName: u.displayName })),
        });
        setSuggestions(result.suggestions);
    } catch (e) { 
        toast({ variant: "destructive", title: "AI Error" }); 
        setIsAiDrawerOpen(false);
    } finally { 
        setIsSuggesting(false); 
    }
  };

  const isQuarterMismatch = useMemo(() => {
    if (!pendingMove || !pendingMove.task.targetQuarter) return false;
    const newQuarter = getQuarterFromDate(pendingMove.newStartDate);
    return newQuarter !== pendingMove.task.targetQuarter;
  }, [pendingMove]);

  if (areTasksLoading || areUsersLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <motion.div 
        className="space-y-4 h-[calc(100vh-120px)] flex flex-col relative overflow-hidden max-w-full"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTaskId(null);
        }}
    >
      <PulseBar 
        activeUsers={kpis.activeUsersCount} 
        capacity={kpis.capacityUtilization} 
        quarterProgress={kpis.quarterProgress}
        onCapacityClick={() => setFocusBottlenecks(!focusBottlenecks)}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-1">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">Resource Management</h1>
            <p className="text-xs text-muted-foreground">Focus Window: {unitCount} units visible control.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center bg-muted/30 p-1 rounded-lg border shadow-inner">
                <Button variant={viewMode === 'days' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3 text-[10px] uppercase font-bold" onClick={() => setViewMode('days')}>Day</Button>
                <Button variant={viewMode === 'weeks' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3 text-[10px] uppercase font-bold" onClick={() => setViewMode('weeks')}>Week</Button>
                <Button variant={viewMode === 'months' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-3 text-[10px] uppercase font-bold" onClick={() => setViewMode('months')}>Quarter</Button>
            </div>
            <Separator orientation="vertical" className="h-8 mx-1" />
            <Button variant={isSimulating ? "secondary" : "outline"} size="sm" className={cn("h-8 text-xs", isSimulating && "bg-blue-500/10 border-blue-500/50 text-blue-600")} onClick={toggleSimulation}>
                <Map className={cn("mr-2 h-3.5 w-3.5", isSimulating && "text-blue-500 animate-pulse")} /> 
                {isSimulating ? "Simulation ON" : "Simulate"}
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFocusBottlenecks(!focusBottlenecks)}>
                <Layers className={cn("mr-2 h-3.5 w-3.5", focusBottlenecks && "text-red-500")} /> 
                {focusBottlenecks ? "Focus ON" : "Bottlenecks"}
            </Button>
            <Button size="sm" onClick={handleAiSuggestTrigger} disabled={isSuggesting} className="h-8 bg-primary/90 text-xs shadow-lg">
                {isSuggesting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Bot className="mr-2 h-3.5 w-3.5" />}
                AI Optimize
            </Button>
        </div>
      </div>

      <Card className={cn(
          "border-none shadow-xl flex-1 flex flex-col overflow-hidden transition-all duration-500 relative",
          isSimulating ? "bg-blue-500/5 backdrop-blur-2xl ring-2 ring-blue-500/30" : "bg-background/40 backdrop-blur-xl"
      )}>
        <AnimatePresence>
            {isSuggesting && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-50 pointer-events-none overflow-hidden"
                >
                    <motion.div 
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="h-full w-32 bg-primary/10 blur-3xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[2px]">
                        <div className="flex flex-col items-center gap-4 bg-background/80 p-8 rounded-full border border-primary/20 shadow-2xl animate-pulse">
                            <Bot className="h-12 w-12 text-primary" />
                            <span className="text-xs font-black uppercase tracking-widest text-primary">Scanning Resource Map...</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <CardHeader className="border-b bg-muted/20 py-2 px-4 shrink-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border bg-background/50 p-0.5 shadow-sm">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateTimeline('prev')}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 font-bold text-[10px]" onClick={jumpToToday}>TODAY</Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigateTimeline('next')}><ChevronRight className="h-3.5 w-3.5" /></Button>
                    </div>
                    <div className="text-[10px] font-black uppercase text-primary/70 tracking-widest px-3 border-l ml-1">
                        {viewMode === 'months' ? format(timelineStart, 'yyyy') : format(timelineStart, 'MMMM yyyy')}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[8px] font-bold uppercase text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Balanced</div>
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Medium</div>
                    <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" /> Overload</div>
                </div>
            </div>
        </CardHeader>
        
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div 
                key={viewMode}
                className="relative overflow-x-auto overflow-y-auto custom-scrollbar flex-1 no-scrollbar" 
                ref={scrollContainerRef}
                onClick={(e) => { if(e.target === e.currentTarget) setSelectedTaskId(null); }}
            >
                <div className="min-h-full w-max" style={{ width: 160 + (unitCount * unitWidth) }}>
                    <div className="flex border-b bg-muted/10 sticky top-0 z-[45]">
                        <div className="w-40 shrink-0 border-r bg-background/95 backdrop-blur-md flex items-center px-3 font-black text-[9px] uppercase tracking-widest text-muted-foreground sticky left-0 z-[50] h-8 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">Team Member</div>
                        {timelineUnits.map((unit, i) => (
                            <div key={i} style={{ width: unitWidth }} className={cn("shrink-0 border-r flex flex-col items-center justify-center text-[9px] h-8", (viewMode === 'days' ? isWeekend(unit) : false) ? "bg-muted/30" : "bg-transparent", isSameDay(unit, new Date()) && "bg-primary/10")}>
                                <span className="font-bold">{viewMode === 'days' ? format(unit, 'EEE') : viewMode === 'weeks' ? `W${format(unit, 'w')}` : format(unit, 'MMM')}</span>
                                <span className="opacity-60">{viewMode === 'days' ? format(unit, 'd') : viewMode === 'weeks' ? format(unit, 'MMM d') : format(unit, 'yyyy')}</span>
                            </div>
                        ))}
                    </div>

                    <div className="relative">
                        {todayLineOffset !== null && (
                            <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-primary/40 z-40 pointer-events-none"
                                style={{ left: 160 + todayLineOffset }}
                            />
                        )}

                        {allPlannerUsers?.map(user => {
                            const userTasks = currentTasks?.filter(t => t.assigneeId === user.uid && t.status !== 'Completed') || [];
                            const isUserOverloaded = userTasks.length > 3;
                            const isUserHighlighted = hoveredAiAction?.toUserId === user.uid;

                            return (
                                <div key={user.uid} className={cn("flex h-14 border-b relative transition-all", focusBottlenecks && !isUserOverloaded ? "opacity-10 grayscale" : "opacity-100")}>
                                    <div className={cn(
                                        "w-40 border-r bg-background/95 backdrop-blur-md shrink-0 flex items-center px-3 gap-2 sticky left-0 z-30 h-full shadow-[2px_0_5px_rgba(0,0,0,0.05)] transition-all",
                                        isUserHighlighted && "bg-blue-500/10 border-r-blue-500/50"
                                    )}>
                                        <div className="relative">
                                            <Avatar className="h-7 w-7 ring-1 ring-primary/10">
                                                <AvatarImage src={user.photoURL || ''} />
                                                <AvatarFallback className="bg-secondary text-[10px]">{getInitials(user.displayName)}</AvatarFallback>
                                            </Avatar>
                                            <PresenceIndicator user={user} variant="dot" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn("text-[11px] font-bold truncate", isUserHighlighted && "text-blue-600")}>{user.displayName}</span>
                                            </div>
                                            <span className="text-[8px] text-muted-foreground uppercase mt-1">{user.role}</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 relative h-full">
                                        <CapacityRibbon userTasks={userTasks} timelineUnits={timelineUnits} unitWidth={unitWidth} viewMode={viewMode} />
                                        <div className="relative h-full pt-4 px-0.5">
                                            <AnimatePresence mode="popLayout">
                                                {userTasks.map(task => (
                                                    <DraggableGanttTask 
                                                        key={task.id} 
                                                        task={task} 
                                                        timelineStart={timelineStart} 
                                                        timelineEnd={timelineEnd}
                                                        viewMode={viewMode}
                                                        onSelect={setSelectedTaskId}
                                                        isSelected={selectedTaskId === task.id}
                                                        isHighlighted={hoveredAiAction?.taskId === task.id}
                                                    />
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                        <div className="absolute inset-0 flex pointer-events-none">
                                            {timelineUnits.map((unit, i) => (
                                                <GanttCell key={i} userId={user.uid} date={unit} isToday={isSameDay(unit, new Date())} isWeekendDay={viewMode === 'days' ? isWeekend(unit) : false} width={unitWidth} isHighlighted={isUserHighlighted} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            <DragOverlay dropAnimation={null}>
                {activeTask ? <GanttTaskBarOverlay task={activeTask} viewMode={viewMode} /> : null}
            </DragOverlay>
        </DndContext>
      </Card>

      <AiStrategyDrawer 
        open={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        isSuggesting={isSuggesting}
        suggestions={suggestions}
        onHoverAction={setHoveredAiAction}
        onExecuteAction={(taskId, toUserId) => {
            const task = currentTasks.find(t => t.id === taskId);
            if(task) {
                confirmMove(task, toUserId, task.startDate?.toDate() || new Date());
                setIsAiDrawerOpen(false); // Immediate visual closure
            }
        }}
      />

      <AnimatePresence>
        {selectedTaskId && selectedTask && (
            <TaskInspector 
                task={selectedTask} 
                users={allPlannerUsers} 
                onClose={() => setSelectedTaskId(null)}
                onUpdate={handleUpdateTaskFromInspector}
            />
        )}
      </AnimatePresence>

      <AlertDialog open={!!pendingMove} onOpenChange={() => setPendingMove(null)}>
          <AlertDialogContent className="rounded-xl border-none shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-bold">Reschedule Resource</AlertDialogTitle>
                <div className="text-sm py-2 text-foreground">
                  Moving <strong>"{pendingMove?.task.name}"</strong> to <strong>{allPlannerUsers?.find(u => u.uid === pendingMove?.toUserId)?.displayName}</strong> starting <strong>{pendingMove && format(pendingMove.newStartDate, 'dd/MM/yyyy')}</strong>.
                  
                  {isQuarterMismatch && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                      <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <div className="text-xs text-destructive">
                        <p className="font-bold uppercase tracking-wider mb-1 text-destructive">Quarter Mismatch Warning</p>
                        <p className="text-destructive">This task is assigned to <strong>{pendingMove?.task.targetQuarter}</strong>, but you are moving it to a date in <strong>{pendingMove && getQuarterFromDate(pendingMove.newStartDate)}</strong>.</p>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="h-9 text-xs rounded-lg">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => confirmMove()} className="h-9 text-xs rounded-lg bg-primary hover:bg-primary/90 font-bold px-6 shadow-lg shadow-primary/10">Confirm Change</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showExitSimDialog} onOpenChange={setShowExitSimDialog}>
          <AlertDialogContent className="rounded-xl border-none shadow-2xl">
              <AlertDialogHeader><AlertDialogTitle className="text-xl font-bold flex items-center gap-2"><Map className="h-5 w-5 text-blue-500" />Save Simulation Changes?</AlertDialogTitle><AlertDialogDescription className="text-sm py-2">You have made adjustments to the resource plan. Would you like to commit these changes to the database or discard your session?</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter className="sm:justify-between"><div className="flex gap-2"><Button variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={() => { setIsSimulating(false); setSimulatedTasks(null); setShowExitSimDialog(false); }}><RotateCcw className="mr-2 h-3.5 w-3.5" /> Discard All</Button></div><div className="flex gap-2"><AlertDialogCancel className="h-9 text-xs">Keep Simulating</AlertDialogCancel><AlertDialogAction onClick={handleApplySimChanges} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-6"><Check className="mr-2 h-3.5 w-3.5" /> Save Changes</AlertDialogAction></div></AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}

export default function PlannerPage() {
  const { isAdmin, isUserLoading } = useUser();
  if (isUserLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  if (!isAdmin) return <div className="p-6"><Card className="border-none bg-destructive/5 text-destructive-foreground"><CardHeader><div className="flex items-center gap-3"><CalendarIcon className="h-5 w-5" /><CardTitle className="text-lg">Manager Access Only</CardTitle></div></CardHeader><CardContent><p className="text-sm">Resource planning and team workload balancing is restricted to administrators.</p></CardContent></Card></div>;
  return <PlannerPageContent />;
}
