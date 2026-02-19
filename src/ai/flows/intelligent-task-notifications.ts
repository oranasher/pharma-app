'use server';

/**
 * @fileOverview AI-powered task notification flow that intelligently determines when to send email notifications based on task priority and due date proximity.
 *
 * - intelligentTaskNotifications - A function that configures task notifications using AI.
 * - IntelligentTaskNotificationsInput - The input type for the intelligentTaskNotifications function.
 * - IntelligentTaskNotificationsOutput - The return type for the intelligentTaskNotifications function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntelligentTaskNotificationsInputSchema = z.object({
  taskId: z.string().describe('The ID of the task.'),
  taskPriority: z.enum(['High', 'Medium', 'Low']).optional().describe('The priority of the task.'),
  taskDueDate: z.string().describe('The due date of the task (YYYY-MM-DD).'),
  daysBeforeNotification: z
    .number()
    .describe(
      'The number of days before the due date to consider for sending notifications.'
    ),
  taskDescription: z.string().optional().describe('The description of the task.'),
  userName: z.string().describe('The name of the user assigned to the task.'),
  userEmail: z.string().describe('The email of the user assigned to the task.'),
});
export type IntelligentTaskNotificationsInput = z.infer<
  typeof IntelligentTaskNotificationsInputSchema
>;

const IntelligentTaskNotificationsOutputSchema = z.object({
  shouldSendNotification: z
    .boolean()
    .describe('Whether a notification should be sent based on AI analysis.'),
  notificationReason: z
    .string()
    .optional()
    .describe('The reasoning behind the notification decision.'),
});
export type IntelligentTaskNotificationsOutput = z.infer<
  typeof IntelligentTaskNotificationsOutputSchema
>;

export async function intelligentTaskNotifications(
  input: IntelligentTaskNotificationsInput
): Promise<IntelligentTaskNotificationsOutput> {
  return intelligentTaskNotificationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'intelligentTaskNotificationsPrompt',
  input: {schema: IntelligentTaskNotificationsInputSchema},
  output: {schema: IntelligentTaskNotificationsOutputSchema},
  prompt: `You are an AI assistant that helps determine whether to send an email notification for a task.

  Consider the task's priority (if provided), due date, and the specified notification window to make a decision.
  If priority is not provided, infer its importance from the task description and how close the due date is.
  High priority tasks require more urgent notifications.
  Also consider if the task has a description that suggests it is complex and requires advanced notification.
  If a notification is deemed necessary, provide a concise reason.

  Task Details:
  - Priority: {{{taskPriority}}}
  - Due Date: {{{taskDueDate}}}
  - Description: {{{taskDescription}}}
  - User: {{{userName}}}

  Based on this information, determine whether to send a notification to the user and provide your reasoning.`,
});

const intelligentTaskNotificationsFlow = ai.defineFlow(
  {
    name: 'intelligentTaskNotificationsFlow',
    inputSchema: IntelligentTaskNotificationsInputSchema,
    outputSchema: IntelligentTaskNotificationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
