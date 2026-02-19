'use client';

import { useState, useEffect, useMemo } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { Task, TaskStatus } from '@/lib/types';
import { useFirestore } from '@/firebase';
import { doc, writeBatch, serverTimestamp, FieldValue } from 'firebase/firestore';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

interface KanbanBoardProps {
  tasks: Task[];
  isLoading: boolean;
  onRequestCompletion: (task: Task) => void;
}

const statuses: TaskStatus[] = ['Not Started', 'In Progress', 'Completed'];

export function KanbanBoard({ tasks: initialTasks, isLoading, onRequestCompletion }: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, Task[]> = {
      'Not Started': [],
      'In Progress': [],
      'Completed': [],
    };
    tasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.task) {
      setActiveTask(event.active.data.current.task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over || !firestore) return;

    const activeId = active.id;
    const overId = over.id; // This will be the status of the column

    const currentTask = tasks.find(t => t.id === activeId);
    if (!currentTask) return;
    
    const targetStatus = statuses.find(s => s === overId);
    if (!targetStatus || targetStatus === currentTask.status) {
        return; // No change in status
    }

    // If moving to the completed column, trigger the completion dialog and stop
    if (targetStatus === 'Completed') {
        onRequestCompletion(currentTask);
        return;
    }
    
    // Optimistic UI update for moves between other columns
    setTasks(current => 
        current.map(t => 
            t.id === activeId ? { ...t, status: targetStatus } : t
        )
    );

    // Update Firestore
    const taskRef = doc(firestore, currentTask.path);
    updateDocumentNonBlocking(taskRef, { status: targetStatus });

  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {statuses.map(status => (
          <KanbanColumn key={status} status={status} tasks={tasksByStatus[status]} />
        ))}
      </div>
      {typeof document !== 'undefined' && createPortal(
        <DragOverlay>
            {activeTask && <KanbanCard task={activeTask} />}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
