'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Task } from '@/lib/types';
import { startOfToday, differenceInCalendarDays } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Clock, Zap, Target, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UserStatusOrbProps {
  tasks: Task[];
}

export function UserStatusOrb({ tasks }: UserStatusOrbProps) {
  const stats = useMemo(() => {
    const today = startOfToday();
    const activeTasks = tasks.filter(t => t.status !== 'Completed');
    const total = tasks.length || 1;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress').length;
    const notStarted = tasks.filter(t => t.status === 'Not Started').length;
    const overdue = tasks.filter(t => t.status !== 'Completed' && t.dueDate && differenceInCalendarDays(t.dueDate.toDate(), today) < 0).length;
    
    const completionRate = Math.round((completed / (tasks.length || 1)) * 100);
    
    return { total: tasks.length, completed, inProgress, notStarted, overdue, completionRate, activeCount: activeTasks.length };
  }, [tasks]);

  const segments = [
    { label: 'Completed', value: stats.completed, color: 'text-emerald-500', bg: 'bg-emerald-500', icon: CheckCircle2 },
    { label: 'In Progress', value: stats.inProgress, color: 'text-cyan-400', bg: 'bg-cyan-400', icon: Zap },
    { label: 'Not Started', value: stats.notStarted, color: 'text-slate-500', bg: 'bg-slate-500', icon: Clock },
    { label: 'Overdue', value: stats.overdue, color: 'text-rose-500', bg: 'bg-rose-500', icon: AlertCircle },
  ];

  return (
    <Card className="border-none shadow-2xl bg-slate-900/40 backdrop-blur-3xl rounded-[40px] overflow-hidden border-white/5">
      <CardHeader className="p-10 pb-0">
        <div className="flex items-center justify-between">
            <div className="space-y-1">
                <CardTitle className="text-3xl font-black tracking-tighter text-white uppercase flex items-center gap-3">
                    Mission Status Orb
                    <Badge variant="outline" className="h-5 text-[8px] bg-primary/10 text-primary border-primary/20">SYNC_OK</Badge>
                </CardTitle>
                <CardDescription className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[10px]">Real-time personal task orbit & system synchronization</CardDescription>
            </div>
            <div className="hidden md:flex flex-col items-end gap-1">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Operations</span>
                <span className="text-3xl font-black text-white">{stats.activeCount}</span>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-10 flex flex-col lg:flex-row items-center gap-16">
        {/* Central Hub Visualization */}
        <div className="relative w-72 h-72 flex items-center justify-center shrink-0">
          <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full animate-pulse" />
          
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-10px] border border-dashed border-white/5 rounded-full"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute inset-[-20px] border border-primary/5 rounded-full"
          />
          
          <svg className="w-full h-full transform -rotate-90 z-10">
            <circle 
                cx="144" cy="144" r="120" 
                stroke="currentColor" strokeWidth="4" 
                fill="transparent" 
                className="text-white/5" 
            />
            <motion.circle 
              cx="144" cy="144" r="120" 
              stroke="currentColor" strokeWidth="12" 
              fill="transparent" 
              strokeDasharray="754"
              initial={{ strokeDashoffset: 754 }}
              animate={{ strokeDashoffset: 754 - (754 * stats.completionRate) / 100 }}
              transition={{ duration: 2.5, ease: "anticipate" }}
              className="text-primary drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
              strokeLinecap="round"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center"
            >
                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/60 mb-1">Target</div>
                <span className="text-7xl font-black tracking-tighter text-white leading-none">
                    {stats.completionRate}
                    <span className="text-2xl align-top mt-2 inline-block">%</span>
                </span>
                <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                    <Target size={10} className="text-primary" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Achieved</span>
                </div>
            </motion.div>
          </div>
        </div>

        {/* Tactical Info Panel */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-6">
          {segments.map((seg, idx) => (
            <motion.div 
              key={seg.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + (idx * 0.1) }}
              className="relative p-6 rounded-[32px] bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all group overflow-hidden"
            >
              <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-5 transition-opacity group-hover:opacity-10", seg.bg)} style={{ clipPath: 'polygon(100% 0, 0 0, 100% 100%)' }} />
              
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10 shadow-inner", seg.color)}>
                  <seg.icon size={20} />
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-3xl font-black text-white leading-none">{seg.value}</span>
                    <span className="text-[8px] font-bold text-slate-500 uppercase mt-1">Units</span>
                </div>
              </div>
              
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                    <span className="text-slate-400">{seg.label}</span>
                    <span className="text-slate-600">{stats.total > 0 ? Math.round((seg.value / stats.total) * 100) : 0}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${stats.total > 0 ? (seg.value / stats.total) * 100 : 0}%` }}
                        transition={{ duration: 1.5, delay: 1 }}
                        className={cn("h-full shadow-[0_0_10px_currentColor]", seg.bg)}
                    />
                </div>
              </div>
            </motion.div>
          ))}
          
          <div className="sm:col-span-2 mt-2 p-4 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-amber-500/10"><ShieldAlert size={14} className="text-amber-500" /></div>
            <p className="text-[10px] text-slate-500 font-medium italic">
                {stats.overdue > 0 
                    ? `Warning: System detected ${stats.overdue} critical timeline failures. Immediate calibration required.` 
                    : "System performance within optimal parameters. Stability index nominal."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
