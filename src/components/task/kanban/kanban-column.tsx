'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, TaskStatus } from '@/lib/types';
import { KanbanCard } from './kanban-card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
}

const statusStyles: { [key in TaskStatus]: string } = {
  'Not Started': 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  'Completed': 'bg-green-500',
};

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div ref={setNodeRef} className="flex-1 min-w-[300px] bg-secondary/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <h3 className="font-semibold text-base flex items-center gap-2">
                <span className={cn("h-3 w-3 rounded-full", statusStyles[status])} />
                {status}
            </h3>
            <Badge variant="secondary">{tasks.length}</Badge>
        </div>
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="min-h-[200px] space-y-2">
            {tasks.map(task => (
                <KanbanCard key={task.id} task={task} />
            ))}
        </div>
      </SortableContext>
    </div>
  );
}
