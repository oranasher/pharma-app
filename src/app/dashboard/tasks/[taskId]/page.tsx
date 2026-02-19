'use client';

import { useEffect, useState, useMemo } from 'react';
import { useDoc, useFirestore } from '@/firebase';
import { useSidebar } from '@/components/ui/sidebar';
import { useUser } from '@/firebase';
import { doc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Task, Subtask, TaskStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bot, Loader2, Focus, Minimize, Save, CheckCircle } from 'lucide-react';
import { intelligentTaskNotifications } from '@/ai/flows/intelligent-task-notifications';
import { CompletionDialog } from '@/components/task/completion-dialog';

const statusStyles: { [key in 'Not Started' | 'In Progress' | 'Completed']: string } = {
  'Not Started': 'bg-gray-400',
  'In Progress': 'bg-blue-500',
  Completed: 'bg-green-500',
};

export default function TaskDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, appUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isFocusMode, setFocusMode } = useSidebar();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [optimisticSubtasks, setOptimisticSubtasks] = useState<Subtask[] | null>(null);

  const taskId = params.taskId as string;
  const taskOwnerId = searchParams.get('userId');
  const effectiveOwnerId = taskOwnerId || user?.uid;

  const taskDocRef = useMemo(() => {
    if (!effectiveOwnerId || !firestore || !taskId) return null;
    return doc(firestore, 'users', effectiveOwnerId, 'tasks', taskId as string);
  }, [effectiveOwnerId, firestore, taskId]);

  const { data: task, isLoading, error } = useDoc<Task>(taskDocRef);
  
  useEffect(() => {
    if (task) {
      setOptimisticSubtasks(task.subtasks);
    }
  }, [task]);

  const handleSubtaskChange = async (subtaskId: string, isCompleted: boolean) => {
    if (!task || !taskDocRef || !optimisticSubtasks) return;

    const updatedSubtasks = optimisticSubtasks.map(subtask =>
      subtask.id === subtaskId ? { ...subtask, isCompleted } : subtask
    );

    setOptimisticSubtasks(updatedSubtasks);

    const completedCount = updatedSubtasks.filter(st => st.isCompleted).length;
    const totalCount = updatedSubtasks.length;
    const wasJustCompleted = totalCount > 0 && completedCount === totalCount && task.status !== 'Completed';

    if (wasJustCompleted) {
      setCompletionDialogOpen(true);
    } else {
      let newStatus: TaskStatus = 'Not Started';
      if (completedCount > 0) newStatus = 'In Progress';
      
      const updateData: { subtasks: Subtask[]; status: TaskStatus, completedAt?: FieldValue | null } = {
        subtasks: updatedSubtasks,
        status: newStatus,
      };

      if (task.status === 'Completed' && newStatus !== 'Completed') {
        updateData.completedAt = null; // Clear completion date if un-completing
      }
      
      updateDocumentNonBlocking(taskDocRef, updateData);
    }
  };
  
  const handleAnalyzeNotification = async () => {
    if (!task || !appUser || !appUser.displayName || !appUser.email) {
       toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'User or task data is missing.',
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      const result = await intelligentTaskNotifications({
        taskId: task.id,
        taskPriority: task.priority,
        taskDueDate: format(task.dueDate.toDate(), 'yyyy-MM-dd'),
        daysBeforeNotification: 7, // Default notification window
        taskDescription: task.description || '',
        userName: appUser.displayName,
        userEmail: appUser.email,
      });

      if (result.shouldSendNotification) {
        toast({
          title: 'AI Decision: Send Notification',
          description: result.notificationReason,
        });
      } else {
        toast({
          title: 'AI Decision: Do Not Send',
          description: result.notificationReason || "No notification is needed at this time.",
        });
      }
    } catch (error) {
      console.error("Error analyzing task notification:", error);
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: 'Could not get an AI recommendation.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const subtasksToRender = optimisticSubtasks || [];
  const progress = subtasksToRender.length
    ? (subtasksToRender.filter(st => st.isCompleted).length / subtasksToRender.length) * 100
    : 0;

  if (isLoading) {
    return (
       <div className="space-y-4">
          <Skeleton className="h-9 w-24" />
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            </CardContent>
          </Card>
          <Card>
             <CardHeader>
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
             </CardHeader>
             <CardContent>
                <Skeleton className="h-10 w-48" />
             </CardContent>
          </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Failed to load task details. You may not have permission to view this task.</p>
          <p className="text-xs text-muted-foreground mt-2">{error.message}</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!task) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p>The requested task could not be found.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="outline" size="sm" onClick={() => setFocusMode(!isFocusMode)} className="w-fit">
          {isFocusMode ? (
            <>
              <Minimize className="mr-2 h-4 w-4" />
              Exit Focus Mode
            </>
          ) : (
            <>
              <Focus className="mr-2 h-4 w-4" />
              Enter Focus Mode
            </>
          )}
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">{task.name}</CardTitle>
              <CardDescription className="mt-2">{task.description}</CardDescription>
            </div>
             <Badge className={cn(statusStyles[task.status], 'hover:text-white text-base')} variant="outline">
              {task.status}
            </Badge>
          </div>
           <div className="text-sm text-muted-foreground pt-2">
            Due on: {task.dueDate ? format(task.dueDate.toDate(), 'PPP') : 'N/A'}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {subtasksToRender && subtasksToRender.length > 0 ? (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                    <Label className="text-lg font-medium">Task Progress</Label>
                    <span className="text-lg font-semibold text-primary">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
              <div className="space-y-2 rounded-lg border p-4">
                {subtasksToRender.map((subtask) => (
                  <div key={subtask.id} className="flex items-center space-x-4 p-3 rounded-md transition-colors hover:bg-accent/50">
                    <Checkbox
                      id={`subtask-${subtask.id}`}
                      checked={subtask.isCompleted}
                      onCheckedChange={(checked) => handleSubtaskChange(subtask.id, !!checked)}
                      className='h-5 w-5'
                    />
                    <Label
                      htmlFor={`subtask-${subtask.id}`}
                      className={cn(
                        "flex-1 text-base transition-all",
                        subtask.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'
                      )}
                    >
                      {subtask.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <p>No subtasks defined for this task.</p>
            </div>
          )}
           {task.status !== 'Completed' && (
              <div className='pt-4 border-t'>
                  <Button onClick={() => setCompletionDialogOpen(true)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Task
                  </Button>
              </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Notification Assistant</CardTitle>
          <CardDescription>
            Click the button below to get an AI-powered recommendation on whether a notification should be sent for this task based on its urgency and complexity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleAnalyzeNotification} disabled={isAnalyzing}>
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Analyze Task Urgency
              </>
            )}
          </Button>
        </CardContent>
      </Card>
      
       <CompletionDialog
        task={task}
        open={completionDialogOpen}
        onOpenChange={setCompletionDialogOpen}
        onCancel={() => {
            // If the dialog was triggered by checking the last subtask, revert the optimistic state.
            setOptimisticSubtasks(task?.subtasks || []);
        }}
       />

    </div>
  );
}
