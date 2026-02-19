'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import type { Task } from '@/lib/types';
import { useMemo } from 'react';
import { format, subDays } from 'date-fns';

interface UserActivityChartProps {
    tasks: Task[];
}

export function UserActivityChart({ tasks }: UserActivityChartProps) {
    const data = useMemo(() => {
        const activity: { [key: string]: number } = {};
        
        for (let i = 0; i < 7; i++) {
            const day = format(subDays(new Date(), i), 'yyyy-MM-dd');
            activity[day] = 0;
        }

        tasks.forEach(task => {
            if (task.status === 'Completed' && task.completedAt) {
                const day = format(task.completedAt.toDate(), 'yyyy-MM-dd');
                if (day in activity) {
                    activity[day]++;
                }
            }
        });
        
        return Object.entries(activity)
            .map(([date, count]) => ({
                date: format(new Date(date), 'MMM d'),
                tasks: count
            }))
            .reverse();

    }, [tasks]);

    const chartConfig = {
        tasks: {
            label: "Tasks Completed",
            color: "hsl(var(--primary))",
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Recent Activity</CardTitle>
                <CardDescription>Tasks you've completed in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64">
                    <ResponsiveContainer width="100%" height="100%" debounce={200}>
                        <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                            />
                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                tickMargin={8}
                                allowDecimals={false}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dot" />}
                            />
                            <Bar dataKey="tasks" fill="var(--color-tasks)" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
