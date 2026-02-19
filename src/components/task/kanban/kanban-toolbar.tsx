'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Users, X, Search, FilterX, CalendarRange, UserCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppUser, TaskPriority, TaskStatus } from '@/lib/types';
import { useUser } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface KanbanToolbarProps {
  users: AppUser[] | null;
  isLoadingUsers: boolean;
  
  nameFilter: string;
  onNameFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;

  hideCompleted: boolean;
  onHideCompletedChange: (value: boolean) => void;
  showAssigneeFilter: boolean;
}

export function KanbanToolbar({ 
    users, 
    isLoadingUsers, 
    nameFilter,
    onNameFilterChange,
    statusFilter,
    onStatusFilterChange,
    priorityFilter,
    onPriorityFilterChange,
    assigneeFilter,
    onAssigneeFilterChange,
    hideCompleted,
    onHideCompletedChange,
    showAssigneeFilter,
}: KanbanToolbarProps) {
  const { user } = useUser();
  const priorities: TaskPriority[] = ["High", "Medium", "Low"];
  const statuses: TaskStatus[] = ["Not Started", "In Progress", "Completed"];

  const isFiltered = !!(nameFilter || statusFilter || priorityFilter || (assigneeFilter !== 'all' && showAssigneeFilter));

  const resetFilters = () => {
    onNameFilterChange('');
    onStatusFilterChange('');
    onPriorityFilterChange('');
    onAssigneeFilterChange('all');
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter cards..."
          value={nameFilter}
          onChange={(event) => onNameFilterChange(event.target.value)}
          className="h-9 pl-9 bg-background/50 focus:bg-background transition-colors"
        />
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-1 no-scrollbar">
        {/* Status Filter */}
        <Select
          value={statusFilter || 'all'}
          onValueChange={(value) => onStatusFilterChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger className={cn(
            "h-9 w-auto min-w-[130px] transition-all",
            statusFilter && "border-indigo-500/50 bg-indigo-50/10"
          )}>
            <SelectValue>
                {statusFilter ? `Status: ${statusFilter}` : 'All Statuses'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {statuses.map(status => (
              <SelectItem key={status} value={status}>{status}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Priority Filter */}
         <Select
          value={priorityFilter || 'all'}
          onValueChange={(value) => onPriorityFilterChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger className={cn(
            "h-9 w-auto min-w-[130px] transition-all",
            priorityFilter && "border-indigo-500/50 bg-indigo-50/10"
          )}>
            <SelectValue>
                {priorityFilter ? `Priority: ${priorityFilter}` : 'All Priorities'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            {priorities.map(priority => (
              <SelectItem key={priority} value={priority}>{priority}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Assignee Filter */}
        {showAssigneeFilter && (
            <Select
                value={assigneeFilter}
                onValueChange={(value) => onAssigneeFilterChange(value)}
            >
                <SelectTrigger className={cn(
                    "h-9 w-auto min-w-[160px] transition-all",
                    assigneeFilter !== 'all' && "border-indigo-500/50 bg-indigo-50/10"
                )}>
                    <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue>
                        {assigneeFilter !== 'all' ? `User: ${users?.find(u => u.uid === assigneeFilter)?.displayName || 'Self'}` : 'Assignee'}
                    </SelectValue>
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {user && (
                        <>
                            <SelectSeparator />
                            <SelectItem value={user.uid}>(אני) המנהל</SelectItem>
                        </>
                    )}
                    {users?.filter(u => u.uid !== user?.uid).map((u) => (
                        <SelectItem key={u.uid} value={u.uid}>
                            {u.displayName}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={resetFilters}
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <FilterX className="mr-2 h-4 w-4" /> Reset
          </Button>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        <div className="flex items-center space-x-2 bg-muted/30 rounded-md px-3 h-9 border">
            <Switch
                id="kanban-hide-completed"
                checked={hideCompleted}
                onCheckedChange={onHideCompletedChange}
                className="scale-75"
            />
            <Label htmlFor="kanban-hide-completed" className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Hide Done</Label>
        </div>
      </div>
    </div>
  );
}
