'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { AppUser, TeamEvent } from '@/lib/types';
import { collection, query } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, PlusCircle, Users, Clock } from 'lucide-react';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import { EventDialog } from '@/components/schedule/event-dialog';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

function SchedulePageContent() {
    const firestore = useFirestore();
    const { user } = useUser();
    
    // State
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
    const [dialogState, setDialogState] = useState<{ open: boolean; event?: TeamEvent }>({ open: false });

    // Queries
    const eventsQuery = useMemo(() => firestore ? query(collection(firestore, 'events')) : null, [firestore]);
    const usersQuery = useMemo(() => firestore ? query(collection(firestore, 'public_users')) : null, [firestore]);
    
    // Data fetching
    const { data: events, isLoading: areEventsLoading } = useCollection<TeamEvent>(eventsQuery);
    const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersQuery);
    const usersMap = useMemo(() => {
        const map = new Map<string, AppUser>();
        if (users) {
            users.forEach(u => map.set(u.uid, u));
        }
        // Add current user if not in public_users
        if (user && !map.has(user.uid)) {
            map.set(user.uid, { uid: user.uid, displayName: user.displayName, email: user.email, role: 'user', photoURL: user.photoURL });
        }
        return map;
    }, [users, user]);

    // Memoized calculations
    const eventDays = useMemo(() => events?.map(e => e.start.toDate()) ?? [], [events]);

    const eventsForSelectedDate = useMemo(() => {
        if (!events || !selectedDate) return [];
        return events
            .filter(event => isSameDay(event.start.toDate(), selectedDate))
            .sort((a, b) => a.start.toDate().getTime() - b.start.toDate().getTime());
    }, [events, selectedDate]);

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const handleOpenDialog = useCallback((event?: TeamEvent) => {
        setDialogState({ open: true, event });
    }, []);
    
    const handleCloseDialog = useCallback(() => {
        setDialogState({ open: false, event: undefined });
    }, []);

    const isLoading = areEventsLoading || areUsersLoading;

    return (
        <motion.div
            className="grid gap-6"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card>
                <CardHeader className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                    <div>
                        <CardTitle>Team Schedule</CardTitle>
                        <CardDescription>A shared calendar for team events and planning.</CardDescription>
                    </div>
                    <Button onClick={() => handleOpenDialog()}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        New Event
                    </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="lg:col-span-1">
                         <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            onDayClick={handleDayClick}
                            modifiers={{ events: eventDays }}
                            modifiersStyles={{
                                events: { 
                                    color: 'hsl(var(--primary-foreground))',
                                    backgroundColor: 'hsl(var(--primary))',
                                },
                            }}
                            className="mx-auto rounded-md border"
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <h3 className="mb-4 text-lg font-semibold tracking-tight">
                            Events for {selectedDate ? format(selectedDate, 'PPP') : '...'}
                        </h3>
                        {isLoading ? (
                            <div className="space-y-4">
                                <div className="h-20 rounded-lg bg-muted animate-pulse"></div>
                                <div className="h-20 rounded-lg bg-muted animate-pulse"></div>
                            </div>
                        ) : eventsForSelectedDate.length > 0 ? (
                            <div className="space-y-4">
                                {eventsForSelectedDate.map(event => (
                                    <div key={event.id} onClick={() => handleOpenDialog(event)} className="p-4 rounded-lg border bg-card hover:bg-accent hover:border-primary/50 cursor-pointer transition-colors">
                                        <div className="flex justify-between items-start">
                                            <p className="font-bold text-card-foreground">{event.title}</p>
                                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                {format(event.start.toDate(), 'HH:mm')} - {format(event.end.toDate(), 'HH:mm')}
                                            </p>
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                                        <div className="flex items-center gap-2 mt-3">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <div className="flex -space-x-2">
                                                <TooltipProvider>
                                                {event.participantIds.map(id => usersMap.get(id)).filter(Boolean).map(p => (
                                                    <Tooltip key={p!.uid}>
                                                        <TooltipTrigger>
                                                            <Avatar className="h-6 w-6 border-2 border-background">
                                                                <AvatarImage src={p!.photoURL ?? ''} />
                                                                <AvatarFallback className="text-xs">{getInitials(p!.displayName)}</AvatarFallback>
                                                            </Avatar>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{p!.displayName}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center rounded-lg border-2 border-dashed">
                                <p className="text-muted-foreground">No events scheduled for this day.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <EventDialog
                open={dialogState.open}
                onOpenChange={handleCloseDialog}
                event={dialogState.event}
                users={Array.from(usersMap.values())}
                selectedDate={selectedDate}
            />
        </motion.div>
    );
}

export default function SchedulePage() {
    const { isUserLoading } = useUser();
    if (isUserLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    return <SchedulePageContent />;
}
