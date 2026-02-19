'use server';

/**
 * @fileOverview AI-powered team report generation flow.
 *
 * - generateTeamReport - A function that generates a team performance and status report.
 * - TeamReportInput - The input type for the generateTeamReport function.
 * - TeamReportOutput - The return type for the generateTeamReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

// Define Zod schemas for the input. This is what the client will send.
// Firestore Timestamps are serialized into objects with seconds and nanoseconds.
const TimestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

const ReportTaskSchema = z.object({
    id: z.string(),
    path: z.string(),
    name: z.string(),
    assigneeId: z.string(),
    status: z.string(),
    dueDate: TimestampSchema,
    completedAt: TimestampSchema.nullable().optional(),
});

const ReportUserSchema = z.object({
    uid: z.string(),
    displayName: z.string().nullable(),
});

const TeamReportInputSchema = z.object({
  period: z.enum(['daily', 'weekly']),
  tasks: z.array(ReportTaskSchema),
  users: z.array(ReportUserSchema),
});

export type TeamReportInput = z.infer<typeof TeamReportInputSchema>;

const TeamReportOutputSchema = z.object({
  report: z.string().describe('The full team report in Markdown format.'),
});
export type TeamReportOutput = z.infer<typeof TeamReportOutputSchema>;

export async function generateTeamReport(
  input: TeamReportInput
): Promise<TeamReportOutput> {
  return generateTeamReportFlow(input);
}

// Helper to convert serialized timestamp-like objects to Date
function toDate(timestamp: { seconds: number; nanoseconds: number; } | null | undefined): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp.seconds * 1000);
}


const generateTeamReportFlow = ai.defineFlow(
  {
    name: 'generateTeamReportFlow',
    inputSchema: TeamReportInputSchema,
    outputSchema: TeamReportOutputSchema,
  },
  async (input) => {
    
    const allTasks = input.tasks;
    const allUsers = input.users;

    const userMap = new Map(allUsers.map(u => [u.uid, u]));

    const getTasksInPeriod = (tasks: z.infer<typeof ReportTaskSchema>[], period: 'daily' | 'weekly') => {
        const now = new Date();
        const start = period === 'daily' ? startOfDay(now) : startOfWeek(now);
        const end = period === 'daily' ? endOfDay(now) : endOfWeek(now);
        return tasks.filter(task => {
            const completedDate = toDate(task.completedAt);
            if (!completedDate) return false;
            return completedDate >= start && completedDate <= end;
        });
    };
    
    const completedTasksInPeriod = getTasksInPeriod(allTasks, input.period);

    const overdueTasks = allTasks.filter(task => {
        const dueDate = toDate(task.dueDate);
        return task.status !== 'Completed' && dueDate && dueDate < new Date();
    });

    const workload: Record<string, { open: number; overdue: number }> = {};
    allUsers.forEach(user => {
        if(user.uid) workload[user.uid] = { open: 0, overdue: 0 };
    });

    allTasks.forEach(task => {
        const userId = task.assigneeId;
        if (userId && workload[userId]) {
            if (task.status !== 'Completed') {
                workload[userId].open++;
            }
            const dueDate = toDate(task.dueDate);
            if (task.status !== 'Completed' && dueDate && dueDate < new Date()) {
                workload[userId].overdue++;
            }
        }
    });

    const completionStats: Record<string, number> = {};
    completedTasksInPeriod.forEach(task => {
        const userId = task.assigneeId;
        if(userId && userMap.has(userId)) {
           completionStats[userId] = (completionStats[userId] || 0) + 1;
        }
    });

    const sortedPerformers = Object.entries(completionStats).sort((a, b) => b[1] - a[1]);
    const topPerformer = sortedPerformers.length > 0 ? sortedPerformers[0] : null;

    const workloadString = Object.entries(workload)
        .map(([userId, stats]) => {
            const userName = userMap.get(userId)?.displayName || 'Unknown User';
            return `- **${userName}:** ${stats.open} open tasks (${stats.overdue} overdue)`;
        })
        .join('\n');
    
    const context = {
        period: input.period,
        completedCount: completedTasksInPeriod.length,
        overdueCount: overdueTasks.length,
        topPerformerName: topPerformer ? (userMap.get(topPerformer[0])?.displayName || 'Unknown User') : 'N/A',
        topPerformerCount: topPerformer ? topPerformer[1] : 0,
        workloadString,
    };

    // 5. Call the AI model with the processed context
    const { output } = await ai.generate({
        prompt: `You are a helpful assistant for a pharmaceutical validation team manager. 
        Generate a concise, professional team status report in Markdown format based on the data provided.

        **Report Period:** ${context.period}

        **Analysis:**
        - Completed Tasks (${context.period}): ${context.completedCount}
        - Newly Overdue Tasks: ${context.overdueCount}
        - Top Performer: ${context.topPerformerName} (${context.topPerformerCount} tasks completed)

        **Current Workload:**
        ${context.workloadString}

        ---

        Based on the data above, generate a summary. Start with a high-level overview. 
        Then, list key highlights, including achievements and areas needing attention (like overdue tasks). 
        Conclude with a brief forward-looking statement.`,
        model: 'googleai/gemini-2.5-flash',
        output: {
            format: 'text',
        },
    });
    
    if (!output?.text) {
        throw new Error("AI failed to generate a report text.");
    }

    return { report: output.text };
  }
);
