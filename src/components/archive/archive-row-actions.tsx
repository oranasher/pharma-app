'use client';

import { Trash2 } from 'lucide-react';
import { Row } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/lib/types';
import { useCallback } from 'react';

interface ArchiveRowActionsProps<TData> {
  row: Row<TData>;
}

export function ArchiveRowActions<TData>({ row }: ArchiveRowActionsProps<TData>) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const task = row.original as Task & { path: string };

  const handleDelete = useCallback(() => {
    if (!firestore || !task.path) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete record. System reference missing.',
      });
      return;
    }
    const taskDocRef = doc(firestore, task.path);
    deleteDocumentNonBlocking(taskDocRef);
    toast({
      title: 'רשומה נמחקה',
      description: `הרשומה "${task.name}" הוסרה מהארכיון.`,
    });
  }, [firestore, toast, task]);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete from Archive</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>מחיקת רשומה מהארכיון</AlertDialogTitle>
          <AlertDialogDescription>
            האם אתה בטוח שברצונך למחוק את הרשומה
            <span className="font-semibold"> "{task.name}"</span>?
            פעולה זו אינה ניתנת לביטול.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>ביטול</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            מחק לצמיתות
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
