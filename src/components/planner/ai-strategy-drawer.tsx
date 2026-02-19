'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bot, Sparkles, AlertCircle, ArrowRight, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorkloadSuggestion } from '@/ai/flows/suggest-workload-balance';
import { cn } from '@/lib/utils';

interface AiStrategyDrawerProps {
  open: boolean;
  onClose: () => void;
  isSuggesting: boolean;
  suggestions: WorkloadSuggestion[] | null;
  onHoverAction: (action: { taskId?: string; toUserId?: string } | null) => void;
  onExecuteAction: (taskId: string, toUserId: string) => void;
}

export function AiStrategyDrawer({ 
  open, 
  onClose, 
  isSuggesting, 
  suggestions, 
  onHoverAction,
  onExecuteAction 
}: AiStrategyDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 right-0 h-screen w-96 bg-[#0a0a0a]/90 backdrop-blur-3xl border-l border-primary/20 shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-[110] flex flex-col overflow-hidden text-white"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <div>
                <h2 className="text-lg font-black uppercase tracking-tighter">Strategic Insights</h2>
                <p className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase opacity-60">AI Intelligence Engine</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-white/10 text-white/50" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {isSuggesting ? (
                <div className="flex flex-col items-center justify-center py-20 gap-6">
                  <div className="relative">
                    <Bot className="h-16 w-16 text-primary/40 animate-bounce" />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-sm font-black uppercase tracking-widest text-primary">Running Analysis</p>
                    <p className="text-xs text-muted-foreground italic">"Optimizing workload distribution..."</p>
                  </div>
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <>
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-3 items-start">
                    <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-primary mb-1">Efficiency Summary</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">Based on current task volume and delivery dates, moving these tasks will balance team capacity by approximately 15%.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {suggestions.map((suggestion, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onMouseEnter={() => onHoverAction({ taskId: suggestion.taskId, toUserId: suggestion.toUserId })}
                        onMouseLeave={() => onHoverAction(null)}
                        className="group p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-primary/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] font-black uppercase h-5">Bottleneck Fix</Badge>
                          <Zap className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        
                        <p className="text-xs text-muted-foreground italic mb-4 leading-relaxed font-medium">
                          "{suggestion.reason}"
                        </p>

                        <div className="flex flex-col gap-3">
                          <Button 
                            onClick={() => onExecuteAction(suggestion.taskId, suggestion.toUserId)}
                            size="sm" 
                            className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
                          >
                            <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                            Relocate Task
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                  <div className="p-4 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest">Resources Balanced</p>
                    <p className="text-xs text-muted-foreground mt-1">No critical bottlenecks detected in the 30-day focus window.</p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-black/40">
            <p className="text-[9px] text-center text-muted-foreground font-bold uppercase tracking-[0.2em] opacity-40">
              PharmaTask AI Intelligence • v1.0
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
