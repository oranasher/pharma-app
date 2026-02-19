'use client';

import React, { useMemo, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Task, TargetQuarter } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  ChevronRight, 
  CalendarDays, 
  Zap
} from 'lucide-react';
import { getInitials, cn } from '@/lib/utils';
import { getMonth } from 'date-fns';
import { useDashboardData } from '@/app/dashboard/layout';
import { Skeleton } from '@/components/ui/skeleton';

interface RoadmapProps {
  isActive?: boolean;
}

const quarters: TargetQuarter[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const quarterConfigs: Record<TargetQuarter, { title: string; objective: string; color: string; glow: string; border: string }> = {
  Q1: { title: 'Q1 2026', objective: 'Foundation & Setup', color: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(34,211,238,0.2)]', border: 'border-cyan-500/30' },
  Q2: { title: 'Q2 2026', objective: 'Main Validation Phase', color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]', border: 'border-emerald-500/30' },
  Q3: { title: 'Q3 2026', objective: 'Performance Optimization', color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]', border: 'border-amber-500/30' },
  Q4: { title: 'Q4 2026', objective: 'Annual Review & Closure', color: 'text-rose-500', glow: 'shadow-[0_0_20px_rgba(244,63,94,0.2)]', border: 'border-rose-500/30' },
};

const getCurrentQuarter = (): TargetQuarter => {
  const month = getMonth(new Date());
  if (month < 3) return 'Q1';
  if (month < 6) return 'Q2';
  if (month < 9) return 'Q3';
  return 'Q4';
};

const CircularProgress = memo(({ value, total, colorClass }: { value: number; total: number; colorClass: string; isCurrent: boolean; isActive: boolean }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white/5" />
        <motion.circle 
          cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" 
          strokeDasharray={circumference} 
          initial={{ strokeDashoffset: circumference }} 
          animate={{ strokeDashoffset: offset }} 
          transition={{ duration: 1.5, ease: "easeOut" }} 
          className={cn(colorClass, "drop-shadow-[0_0_8px_currentColor]")} 
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={cn("text-2xl font-black tracking-tighter", colorClass)}>{percentage}%</span>
        <span className="text-[9px] text-white/40 font-black uppercase tracking-widest">{value} / {total}</span>
      </div>
    </div>
  );
});
CircularProgress.displayName = 'CircularProgress';

const RoadmapSkeleton = () => (
  <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8">
    <Skeleton className="h-48 w-full rounded-[32px]" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[420px] rounded-[32px]" />
      ))}
    </div>
  </div>
);

const QuarterlyRoadmapComponent = ({ isActive = true }: RoadmapProps) => {
  const { allTasks, isLoading } = useDashboardData();
  const [expandedQuarter, setExpandedQuarter] = useState<TargetQuarter | null>(null);
  const currentQuarter = useMemo(() => getCurrentQuarter(), []);

  const stats = useMemo(() => {
    if (!allTasks) return { overall: 0, byQuarter: {} as any };
    
    const byQuarterData = quarters.reduce((acc, q) => {
      const qTasks = allTasks.filter(t => t.targetQuarter === q);
      const completed = qTasks.filter(t => t.status === 'Completed').length;
      const total = qTasks.length;
      const milestones = qTasks.filter(t => t.priority === 'High').slice(0, 5);
      acc[q] = { completed, total, milestones };
      return acc;
    }, {} as any);

    const totalCompleted = allTasks.filter(t => t.status === 'Completed').length;
    const totalTasks = allTasks.length || 1;
    
    return { overall: Math.round((totalCompleted / totalTasks) * 100), byQuarter: byQuarterData };
  }, [allTasks]);

  if (isLoading) return <RoadmapSkeleton />;

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 md:p-8 pb-24" style={{ contentVisibility: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950 border border-white/10 rounded-[32px] p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 text-primary"><Zap size={140} className={cn(isActive && "animate-pulse")} /></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="space-y-3"><h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-4">STRATEGIC ROADMAP 2026</h1><p className="text-slate-400 font-medium max-w-xl text-sm">Tracking high-impact validation milestones across all pharmaceutical sectors.</p></div>
          <div className="min-w-[300px] space-y-4"><div className="flex justify-between items-end"><span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Yearly Delivery Velocity</span><span className="text-3xl font-black text-primary">{stats.overall}%</span></div><div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${stats.overall}%` }} className="absolute top-0 left-0 h-full bg-primary shadow-[0_0_15px_rgba(167,209,171,0.8)]" /></div></div>
        </div>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quarters.map((q, idx) => {
          const config = quarterConfigs[q];
          const qData = stats.byQuarter[q];
          return (
            <motion.div key={q} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.1 }} whileHover={{ y: -8, scale: 1.02 }} onClick={() => setExpandedQuarter(expandedQuarter === q ? null : q)} className={cn("group cursor-pointer flex flex-col h-[420px] bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 transition-all duration-500 relative overflow-hidden", config.border, currentQuarter === q && "ring-2 ring-white/20")}>
              <div className="absolute -right-4 -bottom-4 text-9xl font-black text-white/[0.03] italic">{q}</div>
              <div className="space-y-2 mb-8 relative z-10"><h3 className={cn("text-[11px] font-black uppercase tracking-[0.2em]", config.color)}>{config.title}</h3><p className="text-xl font-black text-white leading-tight">{config.objective}</p></div>
              <div className="flex flex-1 justify-center items-center py-6 relative z-10"><CircularProgress value={qData.completed} total={qData.total} colorClass={config.color} isCurrent={currentQuarter === q} isActive={isActive} /></div>
              <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between relative z-10"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{expandedQuarter === q ? 'Collapse' : 'View Milestones'}</span><div className={cn("h-8 w-8 rounded-full border border-white/10 flex items-center justify-center transition-all", expandedQuarter === q && "rotate-90 bg-primary text-slate-950")}><ChevronRight size={16} /></div></div>
            </motion.div>
          );
        })}
      </div>
      <AnimatePresence>
        {expandedQuarter && stats.byQuarter[expandedQuarter] && (
          <motion.div key={expandedQuarter} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} className="pt-4">
            <Card className="border-none shadow-2xl bg-slate-950 text-white rounded-[40px] overflow-hidden ring-1 ring-white/10">
              <CardHeader className="bg-white/[0.02] p-10 border-b border-white/5"><div className="flex items-center gap-6"><div className={cn("p-4 rounded-[24px] bg-white/5 border", quarterConfigs[expandedQuarter].border)}><CalendarDays className={quarterConfigs[expandedQuarter].color} size={32} /></div><div><CardTitle className="text-3xl font-black tracking-tighter">Strategic Milestones: {expandedQuarter}</CardTitle></div></div></CardHeader>
              <CardContent className="p-10"><div className="space-y-4">{stats.byQuarter[expandedQuarter].milestones.map((task: Task) => (<div key={task.id} className="flex items-center justify-between p-5 rounded-[24px] bg-white/[0.02] border border-white/5"><div className="flex items-center gap-5"><Avatar className="h-12 w-12"><AvatarFallback className="bg-slate-900 text-xs font-black">{getInitials(task.assigneeName)}</AvatarFallback></Avatar><div><p className="font-black text-base">{task.name}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{task.assigneeName}</p></div></div><Badge className="px-4 h-8 rounded-full border font-black text-[10px] uppercase">{task.status === 'Completed' ? 'Verified' : 'On Track'}</Badge></div>))}</div></CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const QuarterlyRoadmap = memo(QuarterlyRoadmapComponent);
