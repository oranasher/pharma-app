
'use server';

/**
 * @fileOverview AI-powered workload balancing suggestions.
 * 
 * - suggestWorkloadBalance - Analyzes team tasks and suggests re-assignments to balance workload.
 * - WorkloadBalanceInput - The input type for the flow.
 * - WorkloadBalanceOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { format } from 'date-fns';

// Schemas from generate-team-report, simplified for this flow's needs
const TimestampSchema = z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
});

const WorkloadTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  assigneeId: z.string(),
  priority: z.enum(['High', 'Medium', 'Low']).optional().default('Medium'),
  dueDate: TimestampSchema,
});

const WorkloadUserSchema = z.object({
  uid: z.string(),
  displayName: z.string().nullable(),
});

const WorkloadBalanceInputSchema = z.object({
  tasks: z.array(WorkloadTaskSchema),
  users: z.array(WorkloadUserSchema),
});
export type WorkloadBalanceInput = z.infer<typeof WorkloadBalanceInputSchema>;

const SuggestionSchema = z.object({
    taskId: z.string().describe("The ID of the task to be re-assigned."),
    fromUserId: z.string().describe("The UID of the user the task is currently assigned to."),
    toUserId: z.string().describe("The UID of the user the task should be moved to."),
    reason: z.string().describe("A brief, clear justification for why this task should be moved.")
});

const WorkloadBalanceOutputSchema = z.object({
  summary: z.string().describe("A high-level summary of the findings and suggestions."),
  suggestions: z.array(SuggestionSchema).describe("A list of concrete re-assignment suggestions."),
});
export type WorkloadBalanceOutput = z.infer<typeof WorkloadBalanceOutputSchema>;
export type WorkloadSuggestion = z.infer<typeof SuggestionSchema>;


export async function suggestWorkloadBalance(input: WorkloadBalanceInput): Promise<WorkloadBalanceOutput> {
  return suggestWorkloadBalanceFlow(input);
}

// Helper to convert serialized timestamp-like objects to Date
function toDate(timestamp: { seconds: number; nanoseconds: number; } | null | undefined): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp.seconds * 1000);
}

const suggestWorkloadBalanceFlow = ai.defineFlow(
  {
    name: 'suggestWorkloadBalanceFlow',
    inputSchema: WorkloadBalanceInputSchema,
    outputSchema: WorkloadBalanceOutputSchema,
  },
  async (input) => {
    
    const userMap = new Map(input.users.map(u => [u.uid, u]));
    const tasksByUser: Record<string, any[]> = {};
    input.users.forEach(u => { tasksByUser[u.uid] = []; });
    
    input.tasks.forEach(task => {
        if(tasksByUser[task.assigneeId]) {
            tasksByUser[task.assigneeId].push(task);
        }
    });

    const workloadContext = input.users.map(user => {
        const userTasks = tasksByUser[user.uid];
        const taskStrings = userTasks.map(t => {
            const dueDate = toDate(t.dueDate);
            const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : 'No due date';
            return `- Task ID: ${t.id}, Name: "${t.name}", Priority: ${t.priority}, Due: ${dueDateString}`;
        });
        return `**User: ${user.displayName} (UID: ${user.uid}) - ${userTasks.length} active tasks**\n${taskStrings.join('\n')}`;
    }).join('\n\n');

    const prompt = `You are an expert resource manager for a pharmaceutical validation team. 
Your goal is to optimize team output by identifying bottlenecks and suggesting task re-assignments.

Analyze the following workload context. Identify "Red" zones where a single user has more than 2 active tasks simultaneously.
Look for "Green" users who have 0 or 1 active tasks during those periods.

Your output must be a JSON object with:
- "summary": A strategic overview of the current resource health.
- "suggestions": A list of re-assignments. Focus on moving high-priority or tight-deadline tasks from overloaded users to available ones.

Workload Data:
${workloadContext}

Provide your optimization strategy in the requested JSON format.`;

    const { output } = await ai.generate({
      prompt,
      model: 'googleai/gemini-2.5-flash',
      output: {
        schema: WorkloadBalanceOutputSchema,
      },
    });

    if (!output) {
      throw new Error("AI failed to generate resource optimization plan.");
    }
    
    return output;
  }
);
