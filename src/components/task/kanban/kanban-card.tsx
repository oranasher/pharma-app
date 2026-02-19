'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Task, TaskPriority, TargetQuarter } from '@/lib/types';
import { cn, getInitials } from '@/lib/utils';
import { format, differenceInCalendarDays, startOfToday } from 'date-fns';
import { ArrowUp, ArrowRight, ArrowDown, GripVertical, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useUser } from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

interface KanbanCardProps {
  task: Task;
}

const priorityIcons: { [key in TaskPriority]: React.ComponentType<{ className?: string }> } = {
  High: ArrowUp,
  Medium: ArrowRight,
  Low: ArrowDown,
};

const priorityStyles: { [key in TaskPriority]: string } = {
    High: 'text-red-500',
    Medium: 'text-yellow-500',
    Low: 'text-gray-500',
};

const quarterStyles: { [key in TargetQuarter]: string } = {
  Q1: 'bg-blue-50 text-blue-600 border-blue-100',
  Q2: 'bg-purple-50 text-purple-600 border-purple-100',
  Q3: 'bg-indigo-50 text-indigo-600 border-indigo-100',
  Q4: 'bg-pink-50 text-pink-600 border-pink-100',
};

export function KanbanCard({ task }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      task: task,
    },
  });
  const { isAdmin } = useUser();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const PriorityIcon = priorityIcons[task.priority || 'Medium'];
  
  const dueDate = task.dueDate?.toDate();
  let dueDateBadgeVariant: "destructive" | "warning" | "outline" = "outline";
  if (dueDate && task.status !== 'Completed') {
      const daysDiff = differenceInCalendarDays(dueDate, startOfToday());
      if (daysDiff < 0) dueDateBadgeVariant = "destructive";
      else if (daysDiff <= 7) dueDateBadgeVariant = "warning";
  }

  const needsApproval = task.delayReason && !task.isDelayApproved;

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={cn(
        "mb-4 group bg-card hover:bg-accent/50 transition-all duration-200 border",
        needsApproval && "border-warning/50 bg-warning/5"
      )}>
        <CardContent className="p-3 relative">
            <div {...attributes} {...listeners} className="absolute top-2 right-2 p-1 cursor-grab text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity touch-none">
                <GripVertical className="h-5 w-5" />
            </div>
            
            <div className="flex flex-wrap gap-1 mb-2">
              {task.targetQuarter && (
                <Badge variant="outline" className={cn("text-[9px] py-0 h-4 uppercase font-bold", quarterStyles[task.targetQuarter])}>
                  {task.targetQuarter}
                </Badge>
              )}
              {needsApproval && (
                <Badge variant="outline" className="text-[9px] py-0 h-4 bg-white text-warning border-warning/30 flex gap-0.5 items-center">
                  <AlertCircle className="h-2 w-2" /> Pending Approval
                </Badge>
              )}
            </div>

            <Link href={`/dashboard/tasks/${task.id}?userId=${task.assigneeId}`}>
                <p className="font-semibold text-sm mb-3 pr-6 hover:underline line-clamp-2">{task.name}</p>
            </Link>

            <div className="flex justify-between items-center text-xs text-muted-foreground">
                <Badge variant={dueDateBadgeVariant} className="text-[10px] h-5">
                    {dueDate ? format(dueDate, 'MMM d') : 'No due date'}
                </Badge>
                <div className="flex items-center gap-2">
                    <PriorityIcon className={cn('h-4 w-4', priorityStyles[task.priority || 'Medium'])} />
                    {isAdmin && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <Avatar className="h-6 w-6 text-xs">
                                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                                            {getInitials(task.assigneeName)}
                                        </AvatarFallback>
                                    </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{task.assigneeName}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
