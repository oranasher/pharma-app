'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle, ListTodo } from "lucide-react";
import type { Task } from "@/lib/types";
import { differenceInCalendarDays, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { memo } from "react";

interface OverviewCardsProps {
    tasks: Task[];
}

function OverviewCardsComponent({ tasks }: OverviewCardsProps) {
    const openTasks = tasks.filter(t => t.status !== 'Completed');
    const overdueTasks = openTasks.filter(t => t.dueDate && differenceInCalendarDays(t.dueDate.toDate(), startOfToday()) < 0).length;
    const dueSoonTasks = openTasks.filter(t => {
        if (!t.dueDate) return false;
        const daysDiff = differenceInCalendarDays(t.dueDate.toDate(), startOfToday());
        return daysDiff >= 0 && daysDiff <= 7;
    }).length;

    const kpiCards = [
        { title: 'Open Tasks', value: openTasks.length, icon: ListTodo, color: 'text-primary', filter: 'open' },
        { title: 'Overdue', value: overdueTasks, icon: AlertTriangle, color: 'text-destructive', filter: 'overdue' },
        { title: 'Due Soon', value: dueSoonTasks, icon: Activity, color: 'text-warning', filter: 'dueSoon' },
        { title: 'Completed', value: tasks.length - openTasks.length, icon: CheckCircle, color: 'text-green-500', filter: 'completed' },
    ];

    return (
        <>
            {kpiCards.map(card => (
                <Link key={card.title} href={`/dashboard/tasks?filter=${card.filter}`}>
                    <Card className="h-full cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium tracking-wide">{card.title}</CardTitle>
                            <card.icon className={cn('h-5 w-5 text-muted-foreground', card.color)} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-4xl font-bold tracking-tighter">{card.value}</div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </>
    );
}

export const OverviewCards = memo(OverviewCardsComponent);
