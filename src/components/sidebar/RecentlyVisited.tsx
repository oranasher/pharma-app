'use client';

import React, { useState, useEffect } from 'react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel } from '@/components/ui/sidebar';
import Link from 'next/link';
import {
  LayoutDashboard,
  ListTodo,
  Users,
  ClipboardList,
  Settings,
  LineChart,
  CalendarDays,
  Files,
  GanttChartSquare,
  Server,
  Zap,
  Archive,
  History,
  Map,
  ShieldAlert,
} from 'lucide-react';
import { usePathname } from 'next/navigation';

interface VisitedPage {
  path: string;
  title: string;
}

const NAV_ITEMS = [
  { path: '/dashboard', title: 'Dashboard', icon: LayoutDashboard },
  { path: '/dashboard/focus', title: "Today's Focus", icon: Zap },
  { path: '/dashboard/tasks', title: 'Tasks', icon: ListTodo },
  { path: '/dashboard/documents', title: 'Documents', icon: Files },
  { path: '/dashboard/schedule', title: 'Team Schedule', icon: CalendarDays },
  { path: '/dashboard/equipment', title: 'Equipment Registry', icon: Server },
  { path: '/dashboard/archive', title: 'Archive', icon: Archive },
  { path: '/dashboard/roadmap', title: 'Strategic Roadmap', icon: Map },
  { path: '/dashboard/users', title: 'User Management', icon: Users },
  { path: '/dashboard/templates', title: 'Templates', icon: ClipboardList },
  { path: '/dashboard/report', title: 'Team Report', icon: LineChart },
  { path: '/dashboard/planner', title: 'Workload Planner', icon: GanttChartSquare },
  { path: '/dashboard/risk', title: 'Risk Analysis', icon: ShieldAlert },
  { path: '/dashboard/settings', title: 'Settings', icon: Settings },
];

const getIconForPath = (path: string): React.ElementType => {
  const item = NAV_ITEMS.find(item => path.startsWith(item.path));
  return item?.icon || History;
};

export function RecentlyVisited() {
  const [visitedPages, setVisitedPages] = useState<VisitedPage[]>([]);
  const pathname = usePathname();

  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('recentlyVisited');
      if (stored) {
        setVisitedPages(JSON.parse(stored));
      }
    };
    
    handleStorageChange(); // Initial load

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (visitedPages.length === 0) {
    return null;
  }

  // Filter out the current page and deprecated admin console
  const pagesToShow = visitedPages.filter(p => p.path !== pathname && p.path !== '/dashboard/admin');

  if (pagesToShow.length === 0) {
    return null;
  }
  
  return (
    <SidebarGroup>
        <SidebarGroupLabel className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <span>Recently Visited</span>
        </SidebarGroupLabel>
        <SidebarMenu>
            {pagesToShow.map((page) => {
                const Icon = getIconForPath(page.path);
                return (
                    <SidebarMenuItem key={page.path}>
                        <SidebarMenuButton asChild isActive={false} tooltip={page.title} size="sm">
                            <Link href={page.path}>
                                <Icon />
                                <span>{page.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                );
            })}
        </SidebarMenu>
    </SidebarGroup>
  );
}
