'use client';

import React, { useState, useEffect, memo, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, ShieldAlert, Map, Activity, Zap, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { triggerConfetti } from '@/lib/confetti';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    title: "MISSION CONTROL",
    description: "Welcome, Commander. This is your high-fidelity overview of pharmaceutical validation operations.",
    icon: Zap,
    targetId: null
  },
  {
    title: "RISK MATRIX",
    description: "Strategic threats at a glance. Identify and mitigate high-impact bottlenecks before they stall production.",
    icon: ShieldAlert,
    targetId: "risk-link"
  },
  {
    title: "STRATEGIC ROADMAP",
    description: "Your 2026 milestone tracking. High-level visualization of quarterly delivery targets.",
    icon: Map,
    targetId: "roadmap-link"
  },
  {
    title: "WORKLOAD HEATMAP",
    description: "AI-powered resource balancing. Monitor team energy levels and authorize load transfers in real-time.",
    icon: Activity,
    targetId: "workload-link"
  }
];

export const OnboardingOverlay = memo(() => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('pharma_onboarding_complete');
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const updateSpotlight = React.useCallback(() => {
    const targetId = STEPS[currentStep].targetId;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        setSpotlightRect(el.getBoundingClientRect());
      }
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep]);

  useLayoutEffect(() => {
    if (isVisible) {
      updateSpotlight();
    }
  }, [isVisible, currentStep, updateSpotlight]);

  useEffect(() => {
    if (!isVisible) return;
    
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);
    
    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isVisible, updateSpotlight]);

  // Handle high-priority styling for the active element
  useEffect(() => {
    if (!isVisible) return;
    const targetId = STEPS[currentStep].targetId;
    if (targetId) {
      const el = document.getElementById(targetId);
      if (el) {
        const originalStyles = {
          zIndex: el.style.zIndex,
          position: el.style.position,
          borderColor: el.style.borderColor,
          borderWidth: el.style.borderWidth,
          borderStyle: el.style.borderStyle,
          boxShadow: el.style.boxShadow,
          backgroundColor: el.style.backgroundColor,
          color: el.style.color,
          transition: el.style.transition,
        };

        el.style.zIndex = '9999';
        el.style.position = 'relative';
        el.style.borderColor = '#00fff2';
        el.style.borderWidth = '2px';
        el.style.borderStyle = 'solid';
        el.style.boxShadow = '0 0 30px rgba(0, 255, 242, 0.6)';
        el.style.backgroundColor = '#0f172a';
        el.style.color = '#ffffff';
        el.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        
        return () => {
          el.style.zIndex = originalStyles.zIndex;
          el.style.position = originalStyles.position;
          el.style.borderColor = originalStyles.borderColor;
          el.style.borderWidth = originalStyles.borderWidth;
          el.style.borderStyle = originalStyles.borderStyle;
          el.style.boxShadow = originalStyles.boxShadow;
          el.style.backgroundColor = originalStyles.backgroundColor;
          el.style.color = originalStyles.color;
          el.style.transition = originalStyles.transition;
        };
      }
    }
  }, [currentStep, isVisible]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    triggerConfetti();
    localStorage.setItem('pharma_onboarding_complete', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9990] flex items-center justify-center pointer-events-none"
      >
        {/* Literal Vantablack Layer with Searchlight Mask */}
        <svg className="absolute inset-0 w-full h-full pointer-events-auto">
          <defs>
            <mask id="searchlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {spotlightRect && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: spotlightRect.x - 5,
                    y: spotlightRect.y - 5,
                    width: spotlightRect.width + 10,
                    height: spotlightRect.height + 10,
                  }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect 
            width="100%" height="100%" 
            fill="rgba(0, 0, 0, 0.85)" 
            mask="url(#searchlight-mask)" 
            className="backdrop-blur-[8px]"
          />
        </svg>

        {/* Glow Tracking Ring */}
        {spotlightRect && (
          <motion.div
            initial={false}
            animate={{
              top: spotlightRect.y - 10,
              left: spotlightRect.x - 10,
              width: spotlightRect.width + 20,
              height: spotlightRect.height + 20,
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute z-[9995] rounded-[16px] border-2 border-[#00fff2] shadow-[0_0_30px_rgba(0,255,242,0.6)] pointer-events-none"
          >
            <motion.div 
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 bg-[#00fff2]/5 rounded-xl"
            />
          </motion.div>
        )}

        {/* Mission Briefing Modal */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
          <motion.div 
            layout
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            className="w-full max-w-lg bg-[#050b18] border-2 border-[#00fff2] rounded-[16px] p-10 shadow-[0_0_60px_rgba(0,255,242,0.4)] relative overflow-hidden pointer-events-auto mx-4 z-[10000]"
          >
            <div className="absolute top-0 right-0 p-6">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsVisible(false)} 
                className="text-[#00fff2]/40 hover:text-[#00fff2] hover:bg-[#00fff2]/10 rounded-full"
              >
                <X size={24} />
              </Button>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-[12px] bg-[#00fff2]/10 border border-[#00fff2]/30 shadow-[0_0_15px_rgba(0,255,242,0.2)]">
                  <Icon className="h-8 w-8 text-[#00fff2]" />
                </div>
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#00fff2]/60 mb-1">Mission Briefing</h2>
                  <h3 className="text-3xl font-black tracking-tighter text-white uppercase leading-none">{step.title}</h3>
                </div>
              </div>

              <p className="text-slate-300 text-lg font-medium leading-relaxed italic border-l-2 border-[#00fff2]/30 pl-6">
                "{step.description}"
              </p>

              <div className="flex items-center justify-between pt-6">
                {/* Progress Dots */}
                <div className="flex gap-2.5">
                  {STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "h-2 w-2 rounded-full transition-all duration-500", 
                        i === currentStep ? "bg-[#00fff2] w-6 shadow-[0_0_10px_rgba(0,255,242,0.8)]" : "bg-white/10"
                      )} 
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  {currentStep > 0 && (
                    <Button 
                      variant="ghost" 
                      onClick={handleBack} 
                      className="text-[#00fff2] border border-[#00fff2]/30 hover:bg-[#00fff2]/10 font-black text-xs uppercase tracking-widest px-6 h-11 rounded-xl transition-all"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                  )}
                  <Button 
                    onClick={handleNext} 
                    className="h-11 px-8 rounded-xl bg-[#00fff2] text-black hover:bg-[#00fff2]/90 font-black text-xs uppercase tracking-widest shadow-lg shadow-[#00fff2]/20 hover:scale-105 transition-transform"
                  >
                    {currentStep === STEPS.length - 1 ? (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Initialize</span>
                    ) : (
                      "Next Protocol"
                    )}
                    {currentStep < STEPS.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
OnboardingOverlay.displayName = 'OnboardingOverlay';
