import { NextResponse } from 'next/server';
import { firestoreAdmin, authAdmin } from '@/lib/firebase-admin';
import { generateTeamReport } from '@/ai/flows/generate-team-report';
import { ADMIN_UID } from '@/lib/admin';
import type { AppUser, Task } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

// Placeholder for a real email service, similar to the reminders function.
async function sendEmail(to: string, subject: string, body: string) {
  console.log(`--- SENDING EMAIL (Report) ---`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body (Markdown): \n${body}`);
  console.log(`------------------------------`);
  return Promise.resolve();
}

/**
 * API route to be triggered by a cron job.
 * It checks the admin's report settings, generates a team report using a Genkit flow
 * if required, and emails it to the admin.
 */
export async function GET(request: Request) {
  // In a real app, you would protect this endpoint with a secret token,
  // passed in the Authorization header.
  // const authHeader = request.headers.get('authorization');
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new Response('Unauthorized', { status: 401 });
  // }

  try {
    // 1. Find the admin user and their settings to see if a report is needed.
    const adminUserRecord = await authAdmin.getUser(ADMIN_UID);
    const adminDoc = await firestoreAdmin.collection('users').doc(ADMIN_UID).get();
    
    if (!adminUserRecord.email || !adminDoc.exists) {
      throw new Error('Admin user or their settings not found in Firestore.');
    }
    const adminData = adminDoc.data() as AppUser;
    const reportFrequency = adminData.reportSettings?.frequency;

    // Do not proceed if reports are disabled.
    if (!reportFrequency || reportFrequency === 'never') {
        return NextResponse.json({ success: true, message: 'Report generation skipped: frequency is set to never.' });
    }

    // 2. Fetch all tasks and users data needed for the report.
    const tasksQuery = await firestoreAdmin.collectionGroup('tasks').get();
    const usersQuery = await firestoreAdmin.collection('public_users').get();

    // The Genkit flow expects a specific JSON format for dates. We must convert
    // the Firebase Admin SDK's Timestamp objects into plain objects.
    const tasks = tasksQuery.docs.map(doc => {
      const data = doc.data();
      const dueDate = data.dueDate as Timestamp | undefined;
      const completedAt = data.completedAt as Timestamp | undefined;
      
      return {
        ...data,
        id: doc.id,
        path: doc.ref.path,
        dueDate: dueDate ? { seconds: dueDate.seconds, nanoseconds: dueDate.nanoseconds } : null,
        completedAt: completedAt ? { seconds: completedAt.seconds, nanoseconds: completedAt.nanoseconds } : null,
      };
    }) as any[]; // Use any[] to match the flexible input of the AI flow

    const users = usersQuery.docs.map(doc => doc.data() as AppUser);

    // 3. Call the existing Genkit flow to generate the report content.
    const result = await generateTeamReport({
      period: reportFrequency,
      tasks: tasks,
      users: users,
    });
    
    if (!result.report) {
      throw new Error('The AI model returned an empty report.');
    }

    // 4. Email the generated Markdown report to the admin.
    const subject = `Your Automated PharmaTask Team Report (${reportFrequency})`;
    await sendEmail(adminUserRecord.email, subject, result.report);

    return NextResponse.json({ success: true, message: 'Report generated and sent successfully.' });

  } catch (error: any) {
    console.error("Error in send-reports cron job:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
