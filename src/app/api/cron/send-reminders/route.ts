import { NextResponse } from 'next/server';
import { firestoreAdmin } from '@/lib/firebase-admin';
import type { Task, AppUser } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { differenceInCalendarDays, startOfToday } from 'date-fns';

/**
 * API route to be triggered by a cron job.
 * It iterates through all users, finds tasks that are overdue or due soon,
 * and creates a single summary in-app notification for each user who has such tasks.
 */
export async function GET(request: Request) {
  // In a real app, you'd protect this endpoint.
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    const today = startOfToday();
    const allUsersSnapshot = await firestoreAdmin.collection('users').get();
    
    // Process each user individually
    for (const userDoc of allUsersSnapshot.docs) {
      const user = userDoc.data() as AppUser;
      // Skip users who opted out of email notifications, we'll use this as a proxy for in-app for now
      if (!user.notificationPreferences?.emailEnabled) {
        continue;
      }

      const tasksSnapshot = await firestoreAdmin.collection(`users/${user.uid}/tasks`).get();
      if (tasksSnapshot.empty) {
        continue;
      }

      let overdueCount = 0;
      let dueSoonCount = 0;

      tasksSnapshot.docs.forEach(doc => {
        const task = doc.data() as Task;
        if (task.status === 'Completed' || !task.dueDate) return;

        const dueDate = (task.dueDate as unknown as Timestamp).toDate();
        const daysUntilDue = differenceInCalendarDays(dueDate, today);

        // Count overdue tasks
        if (daysUntilDue < 0 && user.notificationPreferences?.onOverdue) {
          overdueCount++;
          return;
        }

        // Count tasks due soon
        const reminderDays = user.notificationPreferences?.dueSoonReminderDays ?? 0;
        if (reminderDays > 0 && daysUntilDue >= 0 && daysUntilDue < reminderDays) {
          dueSoonCount++;
        }
      });
      
      // If there are tasks to notify about, create one summary notification
      if (overdueCount > 0 || dueSoonCount > 0) {
        let message = "You have tasks that need your attention: ";
        const parts = [];
        if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
        if (dueSoonCount > 0) parts.push(`${dueSoonCount} due soon`);
        message += parts.join(' and ') + ".";
        
        // Create a notification in Firestore
        await firestoreAdmin.collection(`users/${user.uid}/notifications`).add({
          userId: user.uid,
          message: message,
          createdAt: Timestamp.now(),
          isRead: false,
          link: '/dashboard/tasks?filter=open'
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Reminders processed successfully.' });
  } catch (error: any) {
    console.error("Error in send-reminders cron job:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
