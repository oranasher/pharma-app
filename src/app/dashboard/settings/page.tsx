
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { PasswordForm } from '@/components/settings/password-form';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Feather, Moon, Sun, List, LayoutGrid, PartyPopper, Palette, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

function NotificationSettingItem({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium leading-none">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}


export default function SettingsPage() {
  const { appUser, user, isUserLoading, isAdmin } = useUser();
  const firestore = useFirestore();
  const { theme, setTheme } = useTheme();

  const roleStyles: { [key: string]: string } = {
    admin: 'bg-red-500',
    user: 'bg-blue-500',
  };
  
  const handlePreferenceChange = (path: string, value: any) => {
    if (!user || !firestore) return;
    const userDocRef = doc(firestore, 'users', user.uid);
    // Use dot notation for nested fields
    updateDocumentNonBlocking(userDocRef, {
      [path]: value,
    });
  };

  const preferences = appUser?.notificationPreferences;

  // USER CLEARANCE LOCK: Secondary gate for direct URL access
  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-lg border-red-500/50 bg-red-500/5 backdrop-blur-xl shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto p-4 rounded-full bg-red-500/20 w-fit">
              <ShieldAlert className="h-12 w-12 text-red-500" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-2xl font-black text-white tracking-tighter uppercase">Console Restricted</CardTitle>
              <p className="text-red-400 font-bold text-xs uppercase tracking-widest">Level 4 Clearance Required</p>
            </div>
          </CardHeader>
          <CardContent className="text-center text-slate-400 text-sm font-medium leading-relaxed">
            Personal settings and system recalibration modules are restricted to System Administrators. Please contact your Sector Lead for profile updates.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div 
      className="grid gap-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isUserLoading || !appUser ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full" />
            </div>
            <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-full" />
            </div>
              <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-6 w-1/4" />
            </div>
          </CardContent>
        </Card>
      ) : (
          <Card>
            <CardHeader>
                <CardTitle>User Profile</CardTitle>
                <CardDescription>This is your account information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Full Name</Label>
                    <p className="text-base font-semibold">{appUser.displayName}</p>
                </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Email Address</Label>
                    <p className="text-base font-semibold">{appUser.email}</p>
                </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label className="text-sm text-muted-foreground">Account Role</Label>
                    <p>
                        <Badge className={cn(roleStyles[appUser.role], 'hover:text-white capitalize text-base')} variant="outline">
                            {appUser.role}
                        </Badge>
                    </p>
                </div>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the application.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={theme}
            onValueChange={setTheme}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="light-professional" id="light" className="sr-only" />
              <Sun className="h-8 w-8" />
              <span className="mt-2 font-semibold">Professional</span>
            </Label>
            <Label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="aurora-glass" id="dark" className="sr-only" />
              <Moon className="h-8 w-8" />
              <span className="mt-2 font-semibold">Aurora</span>
            </Label>
             <Label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="clean-slate" id="clean" className="sr-only" />
              <Feather className="h-8 w-8" />
              <span className="mt-2 font-semibold">Clean Slate</span>
            </Label>
            <Label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="vibrant" id="vibrant" className="sr-only" />
              <PartyPopper className="h-8 w-8" />
              <span className="mt-2 font-semibold">Vibrant</span>
            </Label>
             <Label className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="neon-party" id="neon" className="sr-only" />
              <Palette className="h-8 w-8" />
              <span className="mt-2 font-semibold">Neon Party</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>Choose how you want to view your tasks.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={appUser?.viewPreference ?? 'list'}
            onValueChange={(value) => handlePreferenceChange('viewPreference', value)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="list" id="list" className="sr-only" />
              <List className="h-8 w-8" />
              <span className="mt-2 font-semibold">List View</span>
            </Label>
            <Label className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary">
              <RadioGroupItem value="kanban" id="kanban" className="sr-only" />
              <LayoutGrid className="h-8 w-8" />
              <span className="mt-2 font-semibold">Kanban View</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications from PharmaTask.</CardDescription>
        </CardHeader>
        <CardContent>
          {isUserLoading || !appUser ? (
            <div className='space-y-4'>
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className='space-y-4'>
                <NotificationSettingItem title="Email Notifications" description="Receive emails for important events. This is the master switch.">
                     <Switch
                        checked={preferences?.emailEnabled ?? true}
                        onCheckedChange={(checked) => handlePreferenceChange('notificationPreferences.emailEnabled', checked)}
                        aria-label="Toggle email notifications"
                    />
                </NotificationSettingItem>
                <div className={cn(!(preferences?.emailEnabled ?? true) && "opacity-50 pointer-events-none")}>
                    <div className='space-y-4'>
                         <NotificationSettingItem title="New Task Assignments" description="Get an email when a new task is assigned to you.">
                             <Switch
                                checked={preferences?.onNewAssignment ?? true}
                                onCheckedChange={(checked) => handlePreferenceChange('notificationPreferences.onNewAssignment', checked)}
                                aria-label="Toggle new assignment notifications"
                            />
                        </NotificationSettingItem>
                         <NotificationSettingItem title="Task Status Changes" description="Get an email when a task's status changes (e.g., to 'Completed').">
                             <Switch
                                checked={preferences?.onStatusChange ?? true}
                                onCheckedChange={(checked) => handlePreferenceChange('notificationPreferences.onStatusChange', checked)}
                                aria-label="Toggle status change notifications"
                            />
                        </NotificationSettingItem>
                          <NotificationSettingItem title="Overdue Tasks" description="Get a daily reminder for tasks that are past their due date.">
                             <Switch
                                checked={preferences?.onOverdue ?? true}
                                onCheckedChange={(checked) => handlePreferenceChange('notificationPreferences.onOverdue', checked)}
                                aria-label="Toggle overdue task notifications"
                            />
                        </NotificationSettingItem>
                        <NotificationSettingItem title="Due Date Reminders" description="Get a reminder before a task is due.">
                            <Select
                                value={(preferences?.dueSoonReminderDays ?? 3).toString()}
                                onValueChange={(value) => handlePreferenceChange('notificationPreferences.dueSoonReminderDays', parseInt(value, 10))}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select reminder" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Never</SelectItem>
                                    <SelectItem value="1">1 day before</SelectItem>
                                    <SelectItem value="3">3 days before</SelectItem>
                                    <SelectItem value="7">7 days before</SelectItem>
                                </SelectContent>
                            </Select>
                        </NotificationSettingItem>
                    </div>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {isAdmin && (
        <Card>
            <CardHeader>
                <CardTitle>Admin Reporting</CardTitle>
                <CardDescription>Configure automated team summary reports.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                <NotificationSettingItem title="Report Frequency" description="Set how often an AI-powered team summary is generated.">
                    <Select
                        value={appUser?.reportSettings?.frequency ?? 'never'}
                        onValueChange={(value) => handlePreferenceChange('reportSettings.frequency', value)}
                        disabled={isUserLoading}
                    >
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="never">Never</SelectItem>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                        </SelectContent>
                    </Select>
                </NotificationSettingItem>
                </div>
            </CardContent>
        </Card>
      )}

      <PasswordForm />
    </motion.div>
  );
}
