'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { AppUser, Task } from '@/lib/types';
import { getInitials } from '@/lib/utils';
import { isSameMonth, startOfToday } from 'date-fns';
import { UserCheck, Users } from 'lucide-react';

interface CapacityOverviewProps {
  tasks: Task[];
  users: AppUser[];
}

const STANDARD_CAPACITY = 20;

export function CapacityOverview({ tasks, users }: CapacityOverviewProps) {
  const teamLoad = useMemo(() => {
    const today = startOfToday();
    const currentMonthTasks = tasks.filter(task => 
      task.status !== 'Completed' && 
      task.dueDate && 
      isSameMonth(task.dueDate.toDate(), today)
    );

    const loadByUser: Record<string, number> = {};
    
    // Initialize all users with 0
    users.forEach(user => {
      loadByUser[user.uid] = 0;
    });

    currentMonthTasks.forEach(task => {
      if (loadByUser[task.assigneeId] !== undefined) {
        loadByUser[task.assigneeId] += task.estimatedDays || 0;
      }
    });

    return Object.entries(loadByUser).map(([uid, load]) => {
      const user = users.find(u => u.uid === uid);
      const percentage = Math.min((load / STANDARD_CAPACITY) * 100, 100);
      
      let status: 'safe' | 'warning' | 'danger' = 'safe';
      if (load > 20) status = 'danger';
      else if (load >= 15) status = 'warning';

      return {
        uid,
        displayName: user?.displayName || 'Unknown User',
        photoURL: user?.photoURL,
        load,
        percentage,
        status,
      };
    }).sort((a, b) => b.load - a.load);
  }, [tasks, users]);

  return (
    <Card className="col-span-1 lg:col-span-2 shadow-sm border-none bg-background/60 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-bold tracking-tight">Team Capacity</CardTitle>
          <CardDescription className="text-xs">Estimated workload for the current month vs. 20-day capacity.</CardDescription>
        </div>
        <Users className="h-5 w-5 text-muted-foreground/50" />
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {teamLoad.length > 0 ? (
            teamLoad.map(item => (
              <div key={item.uid} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8 ring-2 ring-background">
                      <AvatarImage src={item.photoURL ?? ''} />
                      <AvatarFallback className="text-[10px] font-bold bg-secondary">
                        {getInitials(item.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold leading-none">{item.displayName}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {item.load} days planned
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] py-0 h-5 px-2",
                      item.status === 'safe' && "bg-green-50 text-green-600 border-green-100",
                      item.status === 'warning' && "bg-yellow-50 text-yellow-600 border-yellow-100",
                      item.status === 'danger' && "bg-red-50 text-red-600 border-red-100"
                    )}
                  >
                    {item.status === 'danger' ? 'Overloaded' : item.status === 'warning' ? 'Near Capacity' : 'Available'}
                  </Badge>
                </div>
                <Progress 
                  value={item.percentage} 
                  className="h-1.5"
                  // Mapping status to colors
                  indicatorClassName={cn(
                    item.status === 'safe' && "bg-green-500",
                    item.status === 'warning' && "bg-yellow-500",
                    item.status === 'danger' && "bg-red-500"
                  )}
                />
              </div>
            ))
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-muted/50">
              <p className="text-sm text-muted-foreground italic">No tasks scheduled for this month.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
