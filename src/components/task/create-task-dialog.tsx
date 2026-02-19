'use client';

import { useState } from 'react';
import { TaskDialog } from './task-dialog';
import { Button } from '@/components/ui/button';

// THIS COMPONENT IS NO LONGER IN USE AND WILL BE REMOVED
// The logic has been moved to the parent page `src/app/dashboard/tasks/page.tsx`
// for better performance and state management.

export function CreateTaskDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <TaskDialog mode="create" open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>{children}</Button>
    </TaskDialog>
  );
}
