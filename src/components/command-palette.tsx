'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useUser } from '@/firebase';
import {
    LayoutDashboard,
    ListTodo,
    Users,
    ClipboardList,
    Settings,
    PlusCircle,
    LogOut,
    Server,
    Archive,
    Map,
    ShieldAlert,
    GanttChartSquare,
    LineChart
} from 'lucide-react';
import { getAuth, signOut } from 'firebase/auth';


export function CommandPalette() {
  const router = useRouter();
  const { isAdmin } = useUser();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    router.replace('/login');
  };
  
  const handleNewTask = () => {
    // Navigate to tasks page with a query param to trigger the dialog
    router.push('/dashboard/tasks?newTask=true');
  };

  const navigationCommands = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
    { name: 'Equipment Registry', href: '/dashboard/equipment', icon: Server },
    { name: 'Archive', href: '/dashboard/archive', icon: Archive },
    { name: 'Strategic Roadmap', href: '/dashboard/roadmap', icon: Map },
  ];
  
  const adminCommands = [
      { name: 'User Management', href: '/dashboard/users', icon: Users },
      { name: 'Task Templates', href: '/dashboard/templates', icon: ClipboardList },
      { name: 'Workload Planner', href: '/dashboard/planner', icon: GanttChartSquare },
      { name: 'Team Report', href: '/dashboard/report', icon: LineChart },
      { name: 'Risk Analysis', href: '/dashboard/risk', icon: ShieldAlert },
  ];

  const mainCommands = [
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]
  
  const actionCommands = [
      { name: 'New Task', onSelect: handleNewTask, icon: PlusCircle },
      { name: 'Log Out', onSelect: handleSignOut, icon: LogOut },
  ];

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigationCommands.map((command) => (
                <CommandItem key={command.href} onSelect={() => runCommand(() => router.push(command.href))}>
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                </CommandItem>
            ))}
            {isAdmin && adminCommands.map((command) => (
                 <CommandItem key={command.href} onSelect={() => runCommand(() => router.push(command.href))}>
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                </CommandItem>
            ))}
             {mainCommands.map((command) => (
                <CommandItem key={command.href} onSelect={() => runCommand(() => router.push(command.href))}>
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
             {actionCommands.map((command) => (
                <CommandItem key={command.name} onSelect={() => runCommand(command.onSelect)}>
                    <command.icon className="mr-2 h-4 w-4" />
                    <span>{command.name}</span>
                </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
