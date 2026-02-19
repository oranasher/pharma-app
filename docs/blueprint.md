# **App Name**: PharmaTask

## Core Features:

- User Authentication: Secure user authentication using Firebase Authentication with Google Sign-In, supporting 'admin' and 'user' roles.
- Task Template Management: Admins can create, edit, and remove task templates to standardize task creation.
- Task Assignment & Management: Admins assign tasks to users; users view and update their assigned tasks, marking subtasks as complete and entering the 'final report number'.
- Dashboard Views: Role-based dashboards: admins see all tasks with filtering (user/status/date/template); users see only their own tasks. Tasks close to the due date are highlighted.
- Real-time Database: Firebase Firestore for storing user data, task templates, tasks, and notifications, enabling real-time updates.
- Task Notification System: Configure task notifications with a LLM that decides when to send email based on approaching due date, supporting both push notifications and email reminders. Store notification settings and history in Firestore.
- AI Report Generator: Use AI to generate reports using the 'final report number' along with data from completed tasks to assist users during the quarterly report generation. AI acts as a tool.

## Style Guidelines:

- Primary color: Light desaturated green (#A7D1AB), symbolizing health, efficiency, and growth in the pharmaceutical context. Its light saturation evokes a calm, stable mood.
- Background color: Off-white (#F5F5F5) to ensure a clean, professional, and readable interface.
- Accent color: Light desaturated blue (#9DC3E6), used to highlight key interactive elements and indicate progress, complementing the primary green.
- Body and headline font: 'PT Sans', a humanist sans-serif that is modern but retains some warmth and personality.
- Use clean, consistent, and professional icons from a standard library (e.g., Material Icons) to represent task status, categories, and actions.
- Implement a responsive, grid-based layout that adapts to both web and mobile devices, ensuring usability across platforms.
- Subtle transition animations and loading spinners to provide feedback to user interactions and improve the perceived performance of the app.