'use client';

import React, { useState, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, ChevronUp, ChevronDown, Activity, Database, Search, Download, Trash2, ShieldCheck, AlertCircle, Cpu, Minimize2, Maximize2 } from 'lucide-react';
import { useDashboardData } from '@/app/dashboard/layout';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const SystemTerminalComponent = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { allTasks } = useDashboardData();

  const logs = useMemo(() => {
    if (!allTasks) return [];
    
    return [...allTasks]
      .filter(t => t.createdAt)
      .sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())
      .map(task => {
        let action = "ENTRY_CREATED";
        let type: 'success' | 'warning' | 'info' = 'info';
        let icon = Database;

        if (task.status === 'Completed') {
          action = "MILESTONE_VERIFIED";
          type = 'success';
          icon = ShieldCheck;
        } else if (task.status === 'In Progress') {
          action = "PROCESS_INITIATED";
          type = 'info';
          icon = Cpu;
        } else if (task.priority === 'High') {
          action = "PRIORITY_ESCALATION";
          type = 'warning';
          icon = AlertCircle;
        }
        
        return {
          id: task.id,
          time: format(task.createdAt.toDate(), 'HH:mm:ss'),
          fullDate: format(task.createdAt.toDate(), 'yyyy-MM-dd'),
          action,
          subject: task.name.toUpperCase(),
          user: task.assigneeName?.split(' ')[0].toUpperCase() || "SYSTEM",
          type,
          icon
        };
      });
  }, [allTasks]);

  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return logs;
    return logs.filter(log => 
      log.subject.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q)
    );
  }, [logs, searchQuery]);

  const recentLogs = useMemo(() => logs.slice(0, 5), [logs]);

  const toggleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMaximized(!isMaximized);
    if (!isExpanded) setIsExpanded(true);
  };

  return (
    <div className={cn("px-2 mt-4 transition-all duration-500", isMaximized ? "fixed inset-0 z-[150] p-10 flex items-center justify-center bg-black/40 backdrop-blur-md" : "relative")}>
      <AnimatePresence>
        {!isMaximized && (
          <motion.div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-black/40 border border-white/5 cursor-pointer group hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-2">
              <Terminal size={14} className={cn("text-slate-500 transition-colors", isExpanded ? "text-primary" : "group-hover:text-primary/70")} />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-slate-300">Terminal: Logs</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleMaximize} className="p-1 hover:text-primary transition-colors text-slate-600">
                <Maximize2 size={12} />
              </button>
              {isExpanded ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronUp size={14} className="text-slate-600 group-hover:text-primary/50" />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isExpanded || isMaximized) && (
          <motion.div 
            initial={isMaximized ? { scale: 0.9, opacity: 0 } : { height: 0, opacity: 0 }}
            animate={isMaximized ? { scale: 1, opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={isMaximized ? { scale: 0.9, opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "overflow-hidden",
              isMaximized ? "w-full max-w-5xl h-[80vh] bg-slate-950/95 border border-white/10 rounded-[40px] shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col" : "mt-2"
            )}
          >
            {isMaximized ? (
              <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/20 border border-primary/30">
                    <Terminal className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-white uppercase">System Data Vault</h2>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/60">Audit Trace Protocol v2.4</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input 
                      placeholder="Search vault..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 pl-10 bg-black/40 border-white/10 text-xs font-mono rounded-xl focus:border-primary/50"
                    />
                  </div>
                  <Button variant="outline" size="sm" className="h-10 px-4 border-white/10 rounded-xl hover:bg-white/5 text-[10px] uppercase font-black tracking-widest">
                    <Download className="mr-2 h-3.5 w-3.5" /> Export CSV
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsMaximized(false)} className="h-10 w-10 rounded-full hover:bg-white/5 text-white/40 hover:text-white">
                    <Minimize2 size={20} />
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={cn(
              "p-3 rounded-lg bg-black/60 border border-white/5 font-mono space-y-2.5",
              isMaximized && "flex-1 p-8 rounded-none border-none bg-transparent overflow-hidden flex flex-col"
            )}>
              {isMaximized ? (
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-3">
                    {filteredLogs.map((log, i) => (
                      <motion.div 
                        key={log.id + i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors group"
                      >
                        <span className="text-slate-600 text-[10px] font-bold min-w-[80px]">[{log.time}]</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "h-6 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest border-none",
                            log.type === 'success' ? "bg-emerald-500/10 text-emerald-500" :
                            log.type === 'warning' ? "bg-amber-500/10 text-amber-500" :
                            "bg-blue-500/10 text-blue-500"
                          )}
                        >
                          {log.action}
                        </Badge>
                        <span className="text-white text-xs font-bold flex-1 tracking-tight group-hover:text-primary transition-colors">{log.subject}</span>
                        <div className="flex items-center gap-2 opacity-40">
                          <span className="text-[9px] uppercase font-black text-slate-500 tracking-tighter">EXEC_BY:</span>
                          <span className="text-[10px] font-black text-slate-300">{log.user}</span>
                        </div>
                      </motion.div>
                    ))}
                    {filteredLogs.length === 0 && (
                      <div className="h-64 flex flex-col items-center justify-center text-slate-600 gap-4">
                        <Search size={40} className="opacity-20" />
                        <p className="text-xs uppercase font-black tracking-widest opacity-40">No entries found matching criteria</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              ) : (
                <>
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 leading-none">
                        <span className="text-primary/40 text-[9px] shrink-0">[{log.time}]</span>
                        <div className="flex flex-wrap gap-x-2 gap-y-1">
                          <span className={cn(
                            "text-[9px] font-bold",
                            log.type === 'success' ? "text-emerald-500" : log.type === 'warning' ? "text-amber-500" : "text-primary"
                          )}>[{log.action}]</span>
                          <span className="text-slate-400 text-[9px] truncate max-w-[120px]">{log.subject}</span>
                          <span className="text-slate-600 text-[9px]">BY_{log.user}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-[9px] text-slate-600 animate-pulse flex items-center gap-2">
                      <Database size={10} />
                      WAITING FOR SYSTEM EMISSIONS...
                    </div>
                  )}
                </>
              )}
              
              {!isMaximized && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_5px_rgba(var(--primary),0.5)]" />
                    <span className="text-[8px] text-primary/40 font-bold uppercase tracking-tighter">Live Stream Active</span>
                  </div>
                  <Activity size={10} className="text-primary/20" />
                </div>
              )}
            </div>

            {isMaximized && (
              <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Database Synced</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Entries: {logs.length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-[9px] uppercase font-black tracking-widest">
                    <Trash2 className="mr-2 h-3 w-3" /> Clear Vault Archive
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const SystemTerminal = memo(SystemTerminalComponent);
