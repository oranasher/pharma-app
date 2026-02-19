'use client';

import React, { useMemo, useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirestore } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Task } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Zap, 
  X, 
  Fingerprint,
  Sparkles
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { isSameMonth, startOfToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/app/dashboard/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface WorkloadHeatmapProps {
  isActive?: boolean;
}

const CAPACITY_BASELINE = 20;

const Particles = memo(({ isActive }: { isActive: boolean }) => {
  if (!isActive) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: Math.random() * 100 + '%',
            opacity: Math.random() * 0.5,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ y: ['-10%', '110%'], x: ['0%', Math.random() > 0.5 ? '5%' : '-5%'] }}
          transition={{ duration: Math.random() * 20 + 20, repeat: Infinity, ease: "linear" }}
          className="absolute w-1 h-1 bg-cyan-500 rounded-full blur-[1px] will-change-transform"
        />
      ))}
    </div>
  );
});
Particles.displayName = 'Particles';

const CornerBrackets = memo(({ color }: { color: string }) => (
  <>
    <div className={cn("absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 opacity-60", color)} />
    <div className={cn("absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 opacity-60", color)} />
    <div className={cn("absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 opacity-60", color)} />
    <div className={cn("absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 opacity-60", color)} />
  </>
));
CornerBrackets.displayName = 'CornerBrackets';

const WorkloadHeatmapSkeleton = () => (
  <div className="space-y-10 max-w-7xl mx-auto p-4 md:p-8">
    <Skeleton className="h-12 w-96 rounded-lg" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-2xl" />
      ))}
    </div>
  </div>
);

const WorkloadHeatmapComponent = ({ isActive = true }: WorkloadHeatmapProps) => {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { allTasks, allUsers, isLoading, computedMetrics } = useDashboardData();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [bridgeTargetId, setBridgeTargetId] = useState<string | null>(null);

  const teamMetrics = useMemo(() => {
    if (!allTasks || !allUsers || !computedMetrics) return [];
    
    return allUsers.map(user => {
      const metric = computedMetrics.workload.find(m => m.uid === user.uid);
      const userTasks = allTasks.filter(t => t.assigneeId === user.uid && t.status !== 'Completed' && t.dueDate && isSameMonth(t.dueDate.toDate(), startOfToday()));
      const totalLoad = metric?.totalLoad || 0;
      const percentage = Math.round((totalLoad / CAPACITY_BASELINE) * 100);
      let status: 'stable' | 'warning' | 'critical' = 'stable';
      if (percentage > 90) status = 'critical';
      else if (percentage > 70) status = 'warning';
      return { user, tasks: userTasks, totalLoad, percentage, status };
    }).sort((a, b) => b.totalLoad - a.totalLoad);
  }, [allTasks, allUsers, computedMetrics]);

  const selectedMetric = useMemo(() => 
    teamMetrics.find(m => m.user.uid === selectedUserId), 
    [teamMetrics, selectedUserId]
  );

  const bestCandidate = useMemo(() => {
    if (!selectedMetric || selectedMetric.status !== 'critical') return null;
    return teamMetrics
        .filter(m => m.user.uid !== selectedUserId && m.status === 'stable')
        .sort((a, b) => a.totalLoad - b.totalLoad)[0] || null;
  }, [selectedMetric, teamMetrics]);

  useEffect(() => {
    if (selectedMetric?.status === 'critical' && bestCandidate) {
        setBridgeTargetId(bestCandidate.user.uid);
    } else {
        setBridgeTargetId(null);
    }
  }, [selectedMetric, bestCandidate]);

  const handleAuthorizeLoadBalance = async () => {
    if (!selectedMetric || !bestCandidate || !firestore) return;
    const heaviestTask = [...selectedMetric.tasks].sort((a,b) => (b.estimatedDays || 0) - (a.estimatedDays || 0))[0];
    if (!heaviestTask || !heaviestTask.path) return;
    try {
        const taskRef = doc(firestore, heaviestTask.path);
        await updateDoc(taskRef, { assigneeId: bestCandidate.user.uid, assigneeName: bestCandidate.user.displayName });
        toast({ title: "BIOMETRIC SYNC COMPLETE", description: "Resource relocated via neural bridge." });
        setSelectedUserId(null);
    } catch (e) { toast({ variant: "destructive", title: "AUTH ERROR" }); }
  };

  if (isLoading) return <WorkloadHeatmapSkeleton />;

  return (
    <div className="relative min-h-full overflow-hidden p-4 md:p-8 bg-[#020617]" style={{ contentVisibility: 'auto' }}>
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
        <div className={cn("absolute inset-0", isActive && "animate-pulse")} style={{ backgroundImage: `linear-gradient(to right, #ffffff05 1px, transparent 1px), linear-gradient(to bottom, #ffffff05 1px, transparent 1px)`, backgroundSize: '60px 60px' }} />
      </div>
      <Particles isActive={isActive} />
      <div className="relative z-10 max-w-7xl mx-auto space-y-10">
        <header className="space-y-3">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-4">
            <h1 className="text-5xl font-black tracking-tighter text-white font-mono flex items-center gap-4 uppercase">Workload Heatmap</h1>
            <Badge variant="outline" className="bg-cyan-500/5 text-cyan-400 border-cyan-500/20 px-3 py-1 font-mono uppercase tracking-widest text-[10px]">SYSTEM_LIVE_V2.4</Badge>
          </motion.div>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative">
          {teamMetrics.map((metric, idx) => {
            const isTarget = bridgeTargetId === metric.user.uid;
            const isSelected = selectedUserId === metric.user.uid;
            return (
                <motion.div 
                  key={metric.user.uid} 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ 
                    opacity: selectedUserId && !isSelected && !isTarget ? 0.3 : 1, 
                    scale: isSelected ? 1.05 : 1, 
                    y: isTarget ? -10 : 0 
                  }} 
                  transition={{ delay: idx * 0.05 }} 
                  onClick={() => setSelectedUserId(isSelected ? null : metric.user.uid)} 
                  className={cn(
                    "group cursor-pointer bg-slate-900/90 backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-500", 
                    isSelected ? "border-primary/60 ring-2 ring-primary/20" : "hover:border-white/30", 
                    isTarget && "border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
                  )}
                >
                <CornerBrackets color={metric.status === 'critical' ? 'text-glow-rose text-rose-500' : metric.status === 'warning' ? 'text-glow-amber text-amber-500' : 'text-glow-cyan text-cyan-400'} />
                <div className="flex items-center gap-5 mb-8 relative">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-white/10 relative z-10">
                        <AvatarImage src={metric.user.photoURL ?? ''} />
                        <AvatarFallback className="bg-slate-800 text-xs font-mono font-black text-white">
                          {getInitials(metric.user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn(
                        "absolute -inset-1 rounded-full border border-dashed opacity-40",
                        isActive && "animate-[spin_10s_linear_infinite]",
                        metric.status === 'critical' ? "border-rose-500" : metric.status === 'warning' ? "border-amber-500" : "border-cyan-400"
                      )} />
                    </div>
                    <div>
                      <h3 className="font-mono font-black text-white tracking-tighter text-lg uppercase truncate max-w-[150px]">{metric.user.displayName}</h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">{metric.user.role}</p>
                    </div>
                </div>
                <div className="space-y-5 relative">
                    <div className="flex justify-between items-end">
                      <span className="text-[8px] font-mono font-black uppercase tracking-[0.3em] text-slate-500">Monthly Pressure</span>
                      <span className={cn("text-2xl font-mono font-black transition-all", 
                        metric.status === 'critical' ? "text-rose-500 text-glow-rose" : 
                        metric.status === 'warning' ? "text-amber-500 text-glow-amber" : 
                        "text-cyan-400 text-glow-cyan"
                      )}>
                        {metric.percentage}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden relative border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }} 
                        animate={{ width: `${Math.min(metric.percentage, 100)}%` }} 
                        className={cn(
                          "absolute top-0 left-0 h-full transition-all duration-1000", 
                          metric.status === 'critical' ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" : 
                          metric.status === 'warning' ? "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" : 
                          "bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                        )} 
                      />
                    </div>
                </div>
                <div className="absolute top-2 right-3 flex gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                  <span className="text-[7px] font-mono text-white">LATENCY: 12ms</span>
                  <span className="text-[7px] font-mono text-white">SYNC: OK</span>
                </div>
                </motion.div>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {selectedUserId && selectedMetric && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={() => setSelectedUserId(null)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-2xl bg-slate-950 border border-white/10 rounded-[40px] shadow-[0_0_150px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
              <div className="p-10 border-b border-white/5 bg-white/[0.01] flex items-center justify-between relative">
                <div className="flex items-center gap-8">
                  <Avatar className="h-20 w-20 ring-2 ring-primary/20"><AvatarImage src={selectedMetric.user.photoURL ?? ''} /><AvatarFallback className="text-2xl font-mono font-black text-white bg-slate-900">{getInitials(selectedMetric.user.displayName)}</AvatarFallback></Avatar>
                  <div className="space-y-1"><h2 className="text-4xl font-mono font-black tracking-tighter text-white uppercase">{selectedMetric.user.displayName}</h2><p className="text-slate-500 font-mono font-bold uppercase tracking-[0.2em] text-[10px]">{selectedMetric.user.email}</p></div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-14 w-14 hover:bg-white/10 text-white" onClick={() => setSelectedUserId(null)}><X size={28} /></Button>
              </div>
              <ScrollArea className="flex-1 p-10 bg-black/20">
                <div className="grid gap-5">
                    {selectedMetric.tasks.map((task, idx) => (
                        <div key={task.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-white tracking-tighter text-lg uppercase">{task.name}</span>
                              {(idx === 0 && selectedMetric.status === 'critical') && <Sparkles className="h-4 w-4 text-primary animate-pulse" />}
                            </div>
                            <div className="flex items-center gap-4 text-[9px] font-mono font-black text-slate-500 uppercase tracking-widest">
                              <span>Effort: {task.estimatedDays || 0} Cycles</span>
                              <span className="h-1 w-1 rounded-full bg-slate-800" />
                              <span>Priority: {task.priority}</span>
                            </div>
                          </div>
                        </div>
                    ))}
                </div>
              </ScrollArea>
              <div className="p-10 border-t border-white/5 bg-slate-950">
                <div className="flex items-center justify-between gap-12">
                  <p className="text-xs text-slate-400 font-mono italic">{selectedMetric.status === 'critical' && bestCandidate ? `System detected critical load. Offloading recommended to ${bestCandidate.user.displayName}.` : "System equilibrium stable."}</p>
                  {selectedMetric.status === 'critical' && bestCandidate && (
                    <Button 
                      className="h-16 px-8 relative overflow-hidden group bg-slate-950 border border-white/10 hover:border-primary/50 transition-all rounded-2xl font-mono font-black text-xs uppercase tracking-[0.2em] text-white hover:text-primary" 
                      onClick={handleAuthorizeLoadBalance}
                    >
                      <Fingerprint className="mr-2 h-5 w-5" />
                      [ AUTHORIZE LOAD BALANCE ]
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const WorkloadHeatmap = memo(WorkloadHeatmapComponent);
