'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { AppUser, TeamEvent } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { CalendarIcon, Users, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, set, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { ADMIN_UID } from '@/lib/admin';

const eventFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  participantIds: z.array(z.string()).min(1, "At least one participant is required."),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: TeamEvent;
  users: AppUser[];
  selectedDate?: Date;
}

export function EventDialog({ open, onOpenChange, event, users, selectedDate }: EventDialogProps) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const isEditMode = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
  });

  useEffect(() => {
    if (open) {
      if (isEditMode && event) {
        form.reset({
          title: event.title,
          description: event.description || '',
          date: event.start.toDate(),
          startTime: format(event.start.toDate(), 'HH:mm'),
          endTime: format(event.end.toDate(), 'HH:mm'),
          participantIds: event.participantIds,
        });
      } else {
        form.reset({
          title: '',
          description: '',
          date: selectedDate || new Date(),
          startTime: '09:00',
          endTime: '10:00',
          participantIds: user ? [user.uid] : [],
        });
      }
    }
  }, [open, isEditMode, event, form, selectedDate, user]);

  const combineDateAndTime = (date: Date, time: string): Date => {
    const [hours, minutes] = time.split(':').map(Number);
    return set(date, { hours, minutes, seconds: 0, milliseconds: 0 });
  };
  
  const onSubmit = (data: EventFormValues) => {
    if (!firestore || !user) return;

    const startDateTime = combineDateAndTime(data.date, data.startTime);
    const endDateTime = combineDateAndTime(data.date, data.endTime);
    
    if (endDateTime <= startDateTime) {
        form.setError("endTime", { message: "End time must be after start time." });
        return;
    }

    const eventData = {
        title: data.title,
        description: data.description,
        start: startDateTime,
        end: endDateTime,
        participantIds: data.participantIds,
        creatorId: event?.creatorId || user.uid,
        creatorName: event?.creatorName || user.displayName || 'Unknown User',
    };

    if (isEditMode && event) {
      const eventRef = doc(firestore, event.path);
      setDocumentNonBlocking(eventRef, eventData, { merge: true });
      toast({ title: 'Event Updated', description: `"${data.title}" has been updated.` });
    } else {
      const eventCollection = collection(firestore, 'events');
      addDocumentNonBlocking(eventCollection, eventData);
      toast({ title: 'Event Created', description: `"${data.title}" has been scheduled.` });
    }
    
    onOpenChange(false);
  };
  
  const handleDelete = () => {
    if (!firestore || !event) return;
    const eventRef = doc(firestore, event.path);
    deleteDocumentNonBlocking(eventRef);
    toast({ title: 'Event Deleted', description: `Event "${event.title}" has been removed.` });
    onOpenChange(false);
  };

  const usersById = new Map(users.map(u => [u.uid, u]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <AlertDialog>
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this event.' : 'Schedule a new event for your team.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Team Sync" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Add more details about the event..." {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                    <FormItem className="flex flex-col col-span-3 sm:col-span-1">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                        <PopoverTrigger asChild>
                            <FormControl>
                            <Button
                                variant={'outline'}
                                className={cn('w-full pl-3 text-left font-normal', !field.value && 'text-muted-foreground')}
                            >
                                {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                            </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                        </Popover>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                        <FormItem className="col-span-3 sm:col-span-1">
                            <FormLabel>Start Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                        <FormItem className="col-span-3 sm:col-span-1">
                            <FormLabel>End Time</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
             <FormField
              control={form.control}
              name="participantIds"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Participants</FormLabel>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                           <Button variant="outline" className="w-full justify-start font-normal">
                                <Users className="mr-2 h-4 w-4" />
                                {field.value?.length > 0 ? `${field.value.length} selected` : 'Select participants'}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                            <DropdownMenuLabel>Team Members</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {users.map(u => (
                                <DropdownMenuCheckboxItem
                                    key={u.uid}
                                    checked={field.value?.includes(u.uid)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? field.onChange([...(field.value || []), u.uid])
                                            : field.onChange(field.value?.filter((id) => id !== u.uid))
                                    }}
                                >
                                    {u.displayName}
                                </DropdownMenuCheckboxItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="sm:justify-between pt-4">
                <div>
                {isEditMode && (user?.uid === event?.creatorId || user?.uid === ADMIN_UID) && (
                     <AlertDialogTrigger asChild>
                        <Button type="button" variant="destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </AlertDialogTrigger>
                )}
                </div>
              <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Event'}</Button>
            </DialogFooter>
          </form>
        </Form>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete the event "{event?.title}". This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
