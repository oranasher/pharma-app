'use client';

import { Bar, BarChart, Line, LineChart, Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { Task } from '@/lib/types';
import { useMemo, memo, useState } from 'react';
import { format, startOfMonth, subMonths } from 'date-fns';
import { Button } from '@/components/ui/button';
import { BarChart3, LineChart as LineIcon, AreaChart as AreaIcon, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TasksByMonthChartProps {
    tasks: Task[];
}

function TasksByMonthChartComponent({ tasks }: TasksByMonthChartProps) {
    const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
    const [months, setMonths] = useState(6);

    const data = useMemo(() => {
        const monthlyData: { [key: string]: { created: number; completed: number } } = {};
        const today = new Date();
        const lastNMonths = Array.from({ length: months }).map((_, i) => {
            const d = startOfMonth(subMonths(today, i));
            return format(d, 'MMM yyyy');
        });

        lastNMonths.forEach(monthStr => {
            monthlyData[monthStr] = { created: 0, completed: 0 };
        });

        tasks.forEach(task => {
            if (task.createdAt) {
                const month = format(task.createdAt.toDate(), 'MMM yyyy');
                if (month in monthlyData) monthlyData[month].created++;
            }
            if (task.completedAt) {
                const month = format(task.completedAt.toDate(), 'MMM yyyy');
                if (month in monthlyData) monthlyData[month].completed++;
            }
        });
        
        return lastNMonths.map(monthStr => ({
            month: monthStr.substring(0, 3),
            created: monthlyData[monthStr].created,
            completed: monthlyData[monthStr].completed,
        })).reverse();

    }, [tasks, months]);

    const chartConfig = {
        created: {
            label: "Created",
            color: "hsl(var(--chart-2))",
        },
        completed: {
            label: "Completed",
            color: "hsl(var(--chart-1))",
        },
    } satisfies ChartConfig;

    return (
        <Card className="h-full border-none shadow-xl bg-background/60 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold tracking-tight">Team Velocity</CardTitle>
                    <CardDescription className="text-xs">Created vs. Completed trends.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 gap-1 text-[10px] font-bold uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                <span>{months}M Window</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="text-xs font-bold" onClick={() => setMonths(3)}>Last 3 Months</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-bold" onClick={() => setMonths(6)}>Last 6 Months</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs font-bold" onClick={() => setMonths(12)}>Full Year (12M)</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border shadow-inner">
                        <Button 
                            variant={chartType === 'bar' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-7 w-7 transition-all" 
                            onClick={() => setChartType('bar')}
                        >
                            <BarChart3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant={chartType === 'line' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-7 w-7 transition-all" 
                            onClick={() => setChartType('line')}
                        >
                            <LineIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button 
                            variant={chartType === 'area' ? 'secondary' : 'ghost'} 
                            size="icon" 
                            className="h-7 w-7 transition-all" 
                            onClick={() => setChartType('area')}
                        >
                            <AreaIcon className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'bar' ? (
                            <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} fontStyle="italic" />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} fontSize={10} />
                                <ChartTooltip cursor={{ fill: 'hsl(var(--muted)/0.2)' }} content={<ChartTooltipContent indicator="dashed" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="created" fill="var(--color-created)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        ) : chartType === 'line' ? (
                            <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} fontSize={10} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Line type="monotone" dataKey="created" stroke="var(--color-created)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            </LineChart>
                        ) : (
                            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={10} />
                                <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} fontSize={10} />
                                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Area type="monotone" dataKey="created" fill="var(--color-created)" fillOpacity={0.15} stroke="var(--color-created)" strokeWidth={2} />
                                <Area type="monotone" dataKey="completed" fill="var(--color-completed)" fillOpacity={0.15} stroke="var(--color-completed)" strokeWidth={2} />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export const TasksByMonthChart = memo(TasksByMonthChartComponent);