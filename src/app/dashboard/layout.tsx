'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useUser, useCollection, useFirestore } from '@/firebase';
import { collection, collectionGroup, query, orderBy, where } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { LayoutDashboard, ListTodo, LogOut, Settings, Users, ChevronDown, ClipboardList, Loader2, LineChart, CalendarDays, Files, GanttChartSquare, Server, Zap, Archive, ShieldAlert, Map, Activity, ShieldCheck, RefreshCw } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { CommandPalette } from '@/components/command-palette';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { RecentlyVisited } from '@/components/sidebar/RecentlyVisited';
import { LiveTasksBadge } from '@/components/sidebar/LiveTasksBadge';
import { DashboardContextValue, Task, AppUser } from '@/lib/types';
import { isSameMonth, startOfToday } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

// Eagerly loading components for background warming
import { RiskDashboard } from '@/components/risk/RiskDashboard';
import { WorkloadHeatmap } from '@/components/dashboard/WorkloadHeatmap';
import { QuarterlyRoadmap } from '@/components/roadmap/QuarterlyRoadmap';

// Production Extensions
import { OnboardingOverlay } from '@/components/onboarding/OnboardingOverlay';
import { PresenceManager } from '@/components/user/presence-manager';

const DashboardContext = createContext<DashboardContextValue | undefined>(undefined);

const APP_VERSION = 'v1.0.4-stable';

const RESTRICTED_ROUTES = [
  '/dashboard/users',
  '/dashboard/templates',
  '/dashboard/report',
  '/dashboard/planner',
  '/dashboard/workload',
  '/dashboard/risk',
  '/dashboard/settings',
];

export function useDashboardData() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardLayout');
  }
  return context;
}

/**
 * BackgroundWarmer implements a Priority Staged Rendering system.
 * It warms up heavy tabs sequentially during idle time.
 */
function BackgroundWarmer() {
  const [stage, setStage] = useState(0); // 0: None, 1: Risk, 2: Roadmap, 3: Workload
  const { isAdmin } = useUser();

  useEffect(() => {
    const scheduleNext = (nextStage: number) => {
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => setStage(nextStage), { timeout: 2000 });
      } else {
        setTimeout(() => setStage(nextStage), 1000);
      }
    };

    // Begin sequence after initial mount
    scheduleNext(1);
  }, []);

  useEffect(() => {
    if (stage > 0 && stage < 3) {
      const timer = setTimeout(() => setStage(prev => prev + 1), 1500);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <div className="pointer-events-none fixed inset-0 -z-50 h-0 w-0 overflow-hidden opacity-0" aria-hidden="true">
      {stage >= 1 && isAdmin && <RiskDashboard isActive={false} />}
      {stage >= 2 && <QuarterlyRoadmap isActive={false} />}
      {stage >= 3 && isAdmin && <WorkloadHeatmap isActive={false} />}
    </div>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, appUser, isAdmin, isUserLoading } = useUser();
  const { isFocusMode } = useSidebar();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  // VERSION & UPDATE CHECK
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedVersion = localStorage.getItem('pharma_app_version');
      if (storedVersion && storedVersion !== APP_VERSION) {
        toast({
          title: "SYSTEM UPDATE AVAILABLE",
          description: "A new build has been deployed. Please refresh your browser for the latest protocols.",
          action: (
            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="border-primary/50 text-primary">
              <RefreshCw className="mr-2 h-3 w-3" /> Refresh
            </Button>
          ),
        });
      }
      localStorage.setItem('pharma_app_version', APP_VERSION);
    }
  }, [toast]);

  // ACCESS GUARD: Silent Redirect for non-admins trying to access restricted modules
  useEffect(() => {
    if (!isUserLoading && user && !isAdmin) {
      const isRestricted = RESTRICTED_ROUTES.some(route => pathname.startsWith(route));
      if (isRestricted) {
        router.replace('/dashboard');
      }
    }
  }, [isUserLoading, user, isAdmin, pathname, router]);

  // Centralized Data Fetching
  const tasksQuery = useMemo(() => {
    if (!firestore || !user) return null;
    if (isAdmin) {
      // Admins see everything
      return query(collectionGroup(firestore, 'tasks'));
    } else {
      // Regular users only see their own tasks to prevent permission errors
      return query(collection(firestore, 'users', user.uid, 'tasks'), orderBy('createdAt', 'desc'));
    }
  }, [firestore, user, isAdmin]);

  const usersQuery = useMemo(() => 
    firestore ? query(collection(firestore, 'public_users'), orderBy('displayName', 'asc')) : null, 
  [firestore]);

  const { data: allTasks, isLoading: tasksLoading, error: tasksError } = useCollection<Task>(tasksQuery);
  const { data: allUsers, isLoading: usersLoading, error: usersError } = useCollection<AppUser>(usersQuery);

  // System Hub: Pre-Calculated Metrics
  const computedMetrics = useMemo(() => {
    if (!allTasks || !allUsers) return null;
    
    // 1. Team Load Metrics (for Heatmap)
    const today = startOfToday();
    const workload = allUsers.map(user => {
      const userTasks = allTasks.filter(t => t.assigneeId === user.uid && t.status !== 'Completed' && t.dueDate && isSameMonth(t.dueDate.toDate(), today));
      const totalLoad = userTasks.reduce((sum, t) => sum + (t.estimatedDays || 0), 0);
      return { uid: user.uid, totalLoad, taskCount: userTasks.length };
    });

    return { workload };
  }, [allTasks, allUsers]);

  const dashboardData = useMemo(() => ({
    allTasks,
    allUsers,
    computedMetrics,
    isLoading: tasksLoading || usersLoading,
    error: (tasksError || usersError) as Error | null,
  }), [allTasks, allUsers, computedMetrics, tasksLoading, usersLoading, tasksError, usersError]);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
    // ACCOUNT LOCK PROTECTION
    if (!isUserLoading && appUser?.accountStatus === 'locked') {
      const auth = getAuth();
      signOut(auth).then(() => router.replace('/login?error=locked'));
    }
  }, [isUserLoading, user, appUser, router]);

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.replace('/login');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };
  
  const pageTitle = useMemo(() => {
    if (pathname.startsWith('/dashboard/focus')) return "Today's Focus";
    if (pathname.startsWith('/dashboard/tasks/')) return 'Task Details';
    if (pathname.startsWith('/dashboard/tasks')) return 'Tasks';
    if (pathname.startsWith('/dashboard/documents')) return 'Documents';
    if (pathname.startsWith('/dashboard/schedule')) return 'Team Schedule';
    if (pathname.startsWith('/dashboard/equipment/')) return 'Equipment Details';
    if (pathname.startsWith('/dashboard/equipment')) return 'Equipment Registry';
    if (pathname.startsWith('/dashboard/archive')) return 'Archive';
    if (pathname.startsWith('/dashboard/users')) return 'User Management';
    if (pathname.startsWith('/dashboard/templates')) return 'Templates';
    if (pathname.startsWith('/dashboard/settings')) return 'Settings';
    if (pathname.startsWith('/dashboard/report')) return 'Team Report';
    if (pathname.startsWith('/dashboard/planner')) return 'Workload Planner';
    if (pathname.startsWith('/dashboard/risk')) return 'Risk Analysis';
    if (pathname.startsWith('/dashboard/roadmap')) return 'Quarterly Roadmap';
    if (pathname.startsWith('/dashboard/workload')) return 'Workload Heatmap';
    return 'Dashboard';
  }, [pathname]);

  useEffect(() => {
    if (!pageTitle.includes('Details') && pathname.startsWith('/dashboard')) {
        const newPage = { path: pathname, title: pageTitle };
        const stored = localStorage.getItem('recentlyVisited');
        const history = stored ? JSON.parse(stored) : [];
        if (history.length > 0 && history[0].path === newPage.path) return;
        const newHistory = [newPage, ...history.filter((p: any) => p.path !== newPage.path)].slice(0, 3);
        localStorage.setItem('recentlyVisited', JSON.stringify(newHistory));
        window.dispatchEvent(new Event('storage'));
    }
  }, [pathname, pageTitle]);

  // Authoritative Loading & Auth State Management
  if (isUserLoading || !user || (!appUser && !pathname.startsWith('/login'))) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 gap-12 p-6">
        <div className="relative flex items-center justify-center">
          {/* Glowing Tech Ring */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute h-40 w-40 rounded-full border-2 border-dashed border-primary/20"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute h-48 w-48 rounded-full border border-primary/10"
          />
          <motion.div
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="relative z-10"
          >
            <Logo className="h-20 w-20 text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]" />
          </motion.div>
        </div>

        <div className="flex flex-col items-center gap-6 max-w-sm w-full">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-black uppercase tracking-[0.4em] text-white">System Initialization</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Biometric Sync Initiated</p>
          </div>
          
          <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 w-1/2 bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.8)]"
            />
          </div>
          
          <div className="flex justify-between w-full px-1">
            <span className="text-[8px] font-mono text-slate-500 uppercase">Status: Authenticating</span>
            <span className="text-[8px] font-mono text-slate-500 uppercase">Core: Stable</span>
          </div>
        </div>
      </div>
    );
  }

  if (isFocusMode) {
    return (
      <DashboardContext value={dashboardData}>
        <PresenceManager />
        <main className="flex-1 overflow-auto bg-background p-6">
          {children}
        </main>
      </DashboardContext>
    )
  }

  return (
    <DashboardContext value={dashboardData}>
      <PresenceManager />
      {/* Production Extensions */}
      <OnboardingOverlay />
      <BackgroundWarmer />
      
      <Sidebar side="left" variant='sidebar' collapsible='icon' className='border-r-0'>
        <SidebarHeader>
          <div className="flex items-center justify-between p-1 w-full overflow-hidden">
            <div className="flex items-center gap-2">
              <Logo className="h-8 w-8 text-white" />
              <span className="text-xl font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">PharmaTask</span>
            </div>
            {isAdmin && (
              <div className="group-data-[collapsible=icon]:hidden">
                <Badge className="bg-primary/20 text-primary border-primary/30 h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter shadow-[0_0_10px_hsl(var(--primary)/0.2)]">Admin</Badge>
              </div>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className='p-2'>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/dashboard'} tooltip="Dashboard">
                <Link href="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/focus')} tooltip="Focus Mode">
                <Link href="/dashboard/focus">
                  <Zap />
                  <span>Focus</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/tasks')} tooltip="Tasks">
                <Link href="/dashboard/tasks">
                  <ListTodo />
                  <span>Tasks</span>
                </Link>
              </SidebarMenuButton>
               <LiveTasksBadge />
            </SidebarMenuItem>
             <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/documents')} tooltip="Documents">
                <Link href="/dashboard/documents">
                  <Files />
                  <span>Documents</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/schedule')} tooltip="Team Schedule">
                <Link href="/dashboard/schedule">
                  <CalendarDays />
                  <span>Schedule</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/equipment')} tooltip="Equipment Registry">
                <Link href="/dashboard/equipment">
                  <Server />
                  <span>Equipment</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/archive')} tooltip="Archive">
                <Link href="/dashboard/archive">
                  <Archive />
                  <span>Archive</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton id="roadmap-link" asChild isActive={pathname.startsWith('/dashboard/roadmap')} tooltip="Strategic Roadmap">
                <Link href="/dashboard/roadmap">
                  <Map />
                  <span>Roadmap</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Restricted administrative tabs */}
            {isAdmin && (
              <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/users')} tooltip="User Management">
                    <Link href="/dashboard/users">
                      <Users />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/templates')} tooltip="Templates">
                    <Link href="/dashboard/templates">
                      <ClipboardList />
                      <span>Templates</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/report')} tooltip="Team Report">
                    <Link href="/dashboard/report">
                      <LineChart />
                      <span>Report</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/planner')} tooltip="Workload Planner">
                    <Link href="/dashboard/planner">
                      <GanttChartSquare />
                      <span>Planner</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton id="workload-link" asChild isActive={pathname.startsWith('/dashboard/workload')} tooltip="Workload Heatmap">
                    <Link href="/dashboard/workload">
                      <Activity />
                      <span>Workload</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton id="risk-link" asChild isActive={pathname.startsWith('/dashboard/risk')} tooltip="Risk Dashboard">
                    <Link href="/dashboard/risk">
                      <ShieldAlert />
                      <span>Risk Analysis</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/settings')} tooltip="Settings">
                    <Link href="/dashboard/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
          </SidebarMenu>
          <RecentlyVisited />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border/50">
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-mono font-bold text-sidebar-foreground/30 uppercase tracking-widest">{APP_VERSION}</span>
            <span className="text-[7px] font-mono text-sidebar-foreground/20 uppercase">Core Integrity: Optimal</span>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className='md:hidden'/>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
              {isAdmin && <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest text-primary border-primary/20 hidden sm:flex">System Administrator</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-4">
             <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                    <AvatarFallback className='bg-secondary text-secondary-foreground font-semibold'>{getInitials(user.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className='hidden md:flex flex-col items-start'>
                    <span className='font-semibold text-sm'>{user.displayName}</span>
                    <span className='text-xs text-muted-foreground'>{isAdmin ? 'Admin' : 'User'}</span>
                  </div>
                  <ChevronDown className='h-4 w-4 hidden md:block'/>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-secondary/50 p-6">
          {children}
        </main>
        <CommandPalette />
      </SidebarInset>
    </DashboardContext>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  )
}
