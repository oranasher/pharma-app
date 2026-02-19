'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, Flame, ListChecks, Medal } from "lucide-react";
import type { Task } from "@/lib/types";
import { isThisWeek, startOfToday, differenceInCalendarDays } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UserOverviewCardsProps {
    tasks: Task[];
}

export function UserOverviewCards({ tasks }: UserOverviewCardsProps) {
    const today = startOfToday();

    const completedThisWeek = tasks.filter(t => 
        t.status === 'Completed' && 
        t.completedAt && 
        isThisWeek(t.completedAt.toDate(), { weekStartsOn: 1 })
    ).length;

    const openTasks = tasks.filter(t => t.status !== 'Completed');
    const overdueTasks = openTasks.filter(t => t.dueDate && differenceInCalendarDays(t.dueDate.toDate(), today) < 0).length;

    
    let achievement = {
        title: "Keep Going!",
        description: "Every task is a step forward.",
        icon: Flame,
        color: "text-primary"
    };

    if (completedThisWeek >= 5) {
        achievement = {
            title: "On Fire!",
            description: `You've completed ${completedThisWeek} tasks this week!`,
            icon: Medal,
            color: "text-yellow-500"
        }
    } else if (openTasks.length === 0 && tasks.length > 0) {
        achievement = {
             title: "All Clear!",
            description: "No open tasks. Great job!",
            icon: Check,
            color: "text-green-500"
        }
    }

    const kpiCards = [
        { title: 'Open Tasks', value: openTasks.length, icon: Flame, color: 'text-primary', filter: 'open' },
        { title: 'Overdue Tasks', value: overdueTasks, icon: AlertTriangle, color: 'text-destructive', filter: 'overdue' },
        { title: 'Completed This Week', value: completedThisWeek, icon: ListChecks, color: 'text-green-500', filter: 'completed' },
    ];

    return (
        <>
           {kpiCards.map(card => (
                <Link key={card.title} href={`/dashboard/tasks?filter=${card.filter}`}>
                    <Card className="h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer">
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
             <Card className="h-full bg-secondary/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium tracking-wide">Weekly Goal</CardTitle>
                    <achievement.icon className={cn('h-5 w-5 text-muted-foreground', achievement.color)} />
                </CardHeader>
                <CardContent>
                     <div className="text-2xl font-bold tracking-tighter">{achievement.title}</div>
                     <p className="text-xs text-muted-foreground">{achievement.description}</p>
                </CardContent>
            </Card>
        </>
    );
}
