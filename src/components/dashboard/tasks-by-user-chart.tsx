
'use client';
import { useMemo, memo } from 'react';
import { Pie, PieChart, Cell, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartConfig } from '@/components/ui/chart';
import type { Task } from '@/lib/types';

interface TasksByUserChartProps {
    tasks: Task[];
}

const CHART_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
];

function TasksByUserChartComponent({ tasks }: TasksByUserChartProps) {
    const { data, chartConfig } = useMemo(() => {
        const openTasks = tasks.filter(t => t.status !== 'Completed');
        const tasksByUser: { [key: string]: number } = {};
        
        openTasks.forEach(task => {
            const userName = task.assigneeName || 'Unassigned';
            tasksByUser[userName] = (tasksByUser[userName] || 0) + 1;
        });

        const chartData = Object.entries(tasksByUser).map(([user, count]) => ({
            user,
            tasks: count,
        })).sort((a, b) => b.tasks - a.tasks);

        const config: ChartConfig = {};
        chartData.forEach((item, index) => {
            // Using the full name as the key to ensure Legend mapping works correctly
            config[item.user] = {
                label: item.user,
                color: CHART_COLORS[index % CHART_COLORS.length],
            };
        });

        return { data: chartData, chartConfig: config };

    }, [tasks]);

    return (
        <Card className="flex flex-col border-none shadow-xl bg-background/60 backdrop-blur-xl overflow-hidden h-full">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl font-bold tracking-tight">Open Tasks by User</CardTitle>
                <CardDescription className="text-xs">Current workload distribution across personnel.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center min-h-[350px]">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square w-full h-full"
                >
                    <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                             <ChartTooltip
                                content={<ChartTooltipContent nameKey="user" hideLabel />}
                            />
                            <Pie
                                data={data}
                                dataKey="tasks"
                                nameKey="user"
                                innerRadius={60}
                                outerRadius={80}
                                strokeWidth={5}
                                paddingAngle={5}
                            >
                                {data.map((entry, index) => (
                                    <Cell
                                        key={`cell-${entry.user}`}
                                        fill={chartConfig[entry.user]?.color || CHART_COLORS[index % CHART_COLORS.length]}
                                        className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-300"
                                    />
                                ))}
                            </Pie>
                             <ChartLegend
                                content={<ChartLegendContent nameKey="user" />}
                                verticalAlign="bottom"
                                align="center"
                                className="flex-wrap justify-center gap-x-4 gap-y-2 mt-4 text-[10px] font-black uppercase tracking-tight"
                            />
                         </PieChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

export const TasksByUserChart = memo(TasksByUserChartComponent);
