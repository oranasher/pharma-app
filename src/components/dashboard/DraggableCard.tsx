'use client';
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DraggableCard = ({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms ease-in-out',
    zIndex: isDragging ? 10 : 'auto',
    opacity: isDragging ? 0.95 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} className={cn(className)}>
       <div className="relative">
         <div {...listeners} className="absolute top-3 right-3 z-10 cursor-grab rounded-full p-1.5 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-muted-foreground">
            <GripVertical size={20} />
         </div>
         {children}
       </div>
    </div>
  );
};
