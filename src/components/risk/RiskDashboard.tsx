'use client';

import React, { useMemo, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  CheckCircle2, 
  X, 
  Info, 
  Loader2,
  AlertCircle,
  Zap,
  UserPlus,
  CalendarClock
} from 'lucide-react';
import { differenceInCalendarDays, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/app/dashboard/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface RiskDashboardProps {
  isActive?: boolean;
}

const getCellColor = (x: number, y: number) => {
  const score = x + y;
  if (score >= 8) return 'bg-red-950/40';
  if (score >= 6) return 'bg-amber-950/30';
  return 'bg-emerald-950/30';
};

const RiskDashboardSkeleton = () => (
  <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-32 rounded-xl" />
    </div>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="aspect-square md:aspect-[16/9] w-full rounded-[40px]" />
    </div>
  </div>
);

const RiskDashboardComponent = ({ isActive = true }: RiskDashboardProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { allTasks, isLoading } = useDashboardData();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [mitigationText, setMitigationPlan] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const riskBubbles = useMemo(() => {
    if (!allTasks) return [];
    const today = startOfToday();

    return allTasks
      .filter(t => t.status !== 'Completed')
      .map(task => {
        // Impact (Y-Axis) - Based on Priority
        let y = 1; 
        if (task.priority === 'High') y = 5;
        else if (task.priority === 'Medium') y = 3;
        else y = 1;

        // Likelihood (X-Axis) - Based on Due Date
        let x = 1; 
        if (!task.dueDate) {
          x = 1;
        } else {
          const dueDate = task.dueDate.toDate();
          const daysDiff = differenceInCalendarDays(dueDate, today);
          if (daysDiff < 0) x = 5; 
          else if (daysDiff <= 3) x = 4; 
          else if (daysDiff <= 7) x = 3; 
          else if (task.status === 'In Progress') x = 2; 
          else x = 1;
        }

        return { task, x, y };
      });
  }, [allTasks]);

  const stats = useMemo(() => {
    const redZoneCount = riskBubbles.filter(b => b.x >= 4 && b.y >= 4).length;
    const greenZoneCount = riskBubbles.filter(b => b.x <= 2 && b.y <= 2).length;
    const actionRequired = riskBubbles.filter(b => b.y >= 4 && !b.task.mitigationPlan).length;
    const total = riskBubbles.length || 1;
    const health = Math.round((greenZoneCount / total) * 100);

    return { redZoneCount, health, actionRequired };
  }, [riskBubbles]);

  const handleBubbleClick = (task: Task) => {
    setSelectedTask(task);
    setMitigationPlan(task.mitigationPlan || '');
  };

  const handleSavePlan = async () => {
    if (!selectedTask || !firestore || !selectedTask.path) return;
    setIsSaving(true);
    try {
      const taskRef = doc(firestore, selectedTask.path);
      await updateDoc(taskRef, { mitigationPlan: mitigationText });
      toast({ title: "Strategy Committed", description: "The mitigation protocol has been archived." });
      setSelectedTask(prev => prev ? { ...prev, mitigationPlan: mitigationText } : null);
    } catch (e) {
      toast({ variant: "destructive", title: "Update Error" });
    } finally {
      setIsSaving(false);
    }
  };

  const getAiAction = (task: Task) => {
    if (!task.dueDate) return { label: "Standard Review", icon: Activity, description: "Maintain current trajectory with increased oversight." };
    const today = startOfToday();
    const daysDiff = differenceInCalendarDays(task.dueDate.toDate(), today);
    if (task.priority === 'High' && daysDiff < 0) {
      return { label: "Reassign & Escalate", icon: UserPlus, description: "Task is critical and overdue. Immediate resource swap required." };
    }
    if (task.priority === 'High') {
      return { label: "Move to Q4 Roadmap", icon: CalendarClock, description: "High impact but tight timeline. Consider rescheduling." };
    }
    return { label: "Standard Review", icon: Activity, description: "Maintain current trajectory with increased oversight." };
  };

  if (isLoading) return <RiskDashboardSkeleton />;

  return (
    <div className="relative min-h-full" style={{ contentVisibility: 'auto' }}>
      <AnimatePresence>
        {selectedTask && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[90] backdrop-blur-[2px] cursor-pointer"
            onClick={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>

      <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-red-500/50 bg-background/40 backdrop-blur-xl shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-white/10">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-red-400">Critical Risks</CardTitle>
              <ShieldAlert className={cn("h-4 w-4 text-red-500", isActive && "animate-pulse")} />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">{stats.redZoneCount}</div>
              <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter opacity-60">High Impact / High Likelihood</p>
            </CardContent>
          </Card>

          <Card className="border-emerald-500/50 bg-background/40 backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-white/10">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-400">System Health</CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-emerald-500 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">{stats.health}%</div>
              <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter opacity-60">Operations Reliability Index</p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/50 bg-background/40 backdrop-blur-xl shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-white/10">
            <CardHeader className="py-4 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-amber-400">Action Required</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">{stats.actionRequired}</div>
              <p className="text-[10px] text-muted-foreground mt-2 font-bold uppercase tracking-tighter opacity-60">Unmitigated Exposure Points</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tighter flex items-center gap-2 text-foreground">
              Risk Probability & Impact Matrix
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </h2>
            <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Stable</span>
              <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]" /> Elevated</span>
              <span className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" /> Extreme</span>
            </div>
          </div>

          <div className={cn(
            "relative aspect-square md:aspect-[16/9] w-full rounded-[40px] border border-white/10 bg-black/40 backdrop-blur-[15px] overflow-hidden shadow-2xl p-12 flex flex-col transition-all duration-700",
            selectedTask && "ring-2 ring-primary/20 scale-[0.98]"
          )}>
            <div className="absolute left-4 top-1/2 -rotate-90 origin-center text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Impact (Severity)</div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.5em] text-white/30">Likelihood (Probability)</div>

            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: 'radial-gradient(circle at top right, #7f1d1d, #78350f, #064e3b)' }} />

            <div className="flex-1 grid grid-cols-5 grid-rows-5 border-l border-b border-white/10 relative z-0">
              {Array.from({ length: 25 }).map((_, i) => {
                const x = (i % 5) + 1;
                const y = 5 - Math.floor(i / 5);
                return <div key={i} className={cn("border-t border-r border-white/5 transition-colors duration-500", getCellColor(x, y))} />;
              })}
            </div>

            <div className="absolute inset-12 pointer-events-none z-40 overflow-hidden">
              <AnimatePresence>
                {riskBubbles.map((bubble, idx) => {
                  const isFocused = selectedTask?.id === bubble.task.id;
                  const isDimmed = selectedTask && !isFocused;
                  const leftPos = (bubble.x - 0.5) * 20;
                  const bottomPos = Math.max(5, Math.min(95, (bubble.y - 0.5) * 20));

                  return (
                    <motion.div
                      key={bubble.task.id}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ 
                        opacity: isDimmed ? 0.2 : 1, 
                        scale: isFocused ? 1.3 : 1,
                        y: isActive ? [0, -3, 0] : 0, 
                        zIndex: isFocused ? 50 : 20,
                      }}
                      transition={{ 
                        delay: idx * 0.05,
                        y: { repeat: Infinity, duration: 3 + Math.random(), ease: "easeInOut" }
                      }}
                      className="absolute pointer-events-auto cursor-pointer group flex flex-col items-center gap-2 will-change-transform"
                      style={{ left: `${leftPos}%`, bottom: `${bottomPos}%`, transform: 'translate(-50%, 50%)' }}
                      onClick={() => handleBubbleClick(bubble.task)}
                    >
                      <div className={cn(
                        "h-12 w-12 rounded-full relative transition-all duration-500 shadow-2xl group-hover:scale-110",
                        bubble.x >= 4 && bubble.y >= 4 ? "bg-red-500 shadow-[0_0_25px_rgba(239,68,68,0.6)]" :
                        bubble.x >= 3 && bubble.y >= 3 ? "bg-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.6)]" :
                        "bg-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.6)]",
                        isFocused && "ring-4 ring-white shadow-[0_0_40px_rgba(255,255,255,0.4)]"
                      )}>
                        <div className="absolute top-1 left-2 w-4 h-4 rounded-full bg-white/40 blur-[2px]" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-white drop-shadow-md opacity-80" />
                        </div>
                      </div>
                      <motion.span className={cn("text-[9px] font-black text-white text-center whitespace-nowrap bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 transition-opacity", isFocused ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                        {bubble.task.name}
                      </motion.span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedTask && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-screen w-96 bg-slate-950/98 backdrop-blur-[40px] border-l border-white/10 shadow-[-20px_0_100px_rgba(0,0,0,0.8)] z-[100] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between shrink-0">
              <Badge variant="outline" className="h-6 text-[10px] font-black tracking-[0.2em] uppercase text-primary/80 bg-primary/10 border-primary/20">Control Vector</Badge>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-white/10 text-white" onClick={() => setSelectedTask(null)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-8 pr-10">
              <div className="space-y-4">
                <div className="p-1 rounded-2xl bg-gradient-to-r from-primary to-transparent">
                  <div className="bg-slate-950 rounded-[14px] p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20"><Zap className="h-5 w-5 text-primary" /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary">Strategic Action Required</span>
                    </div>
                    <p className="text-sm font-bold text-white leading-snug">{getAiAction(selectedTask).description}</p>
                    <Button 
                      className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-[0.1em] shadow-lg rounded-xl flex items-center justify-center gap-2 group"
                      onClick={() => toast({ title: "Action Initiated", description: "Strategic override successful." })}
                    >
                      {React.createElement(getAiAction(selectedTask).icon, { className: "h-4 w-4 transition-transform group-hover:scale-110" })}
                      Execute: {getAiAction(selectedTask).label}
                    </Button>
                  </div>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Risk Subject</Label>
                <h3 className="text-2xl font-black leading-tight tracking-tighter text-white">{selectedTask.name}</h3>
                <div className="flex items-center gap-2 pt-1">
                  <Avatar className="h-6 w-6 border border-white/10">
                    <AvatarFallback className="bg-slate-800 text-[8px] font-black text-white">{selectedTask.assigneeName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{selectedTask.assigneeName}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Manual Protocols</Label>
                  <div className={cn("p-[1px] rounded-2xl transition-all duration-500", selectedTask.priority === 'High' ? "bg-red-500/30" : "bg-amber-500/30")}>
                    <Textarea 
                      placeholder="Calibrate mitigation steps..."
                      className="min-h-[160px] bg-slate-900 border-none text-slate-200 text-sm font-medium focus:ring-0 transition-all rounded-[15px] resize-none placeholder:opacity-20 p-5"
                      value={mitigationText}
                      onChange={(e) => setMitigationPlan(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-black/40 shrink-0 space-y-3">
              <Button 
                className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-[0.2em] transition-all rounded-2xl border border-white/10"
                onClick={handleSavePlan}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />}
                Commit Strategy
              </Button>
              <Button variant="ghost" className="w-full h-10 text-slate-500 hover:text-white hover:bg-white/5 font-black text-[10px] uppercase tracking-widest transition-all rounded-xl" onClick={() => setSelectedTask(null)}>
                Cancel & Close Panel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const RiskDashboard = memo(RiskDashboardComponent);
