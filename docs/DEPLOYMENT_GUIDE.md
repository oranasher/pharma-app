# PharmaRisk Deployment Guide 🚀

מדריך זה מסביר כיצד להוציא את האפליקציה מסביבת ה-Studio ולפרוס אותה בשרת חיצוני כמו **Vercel** או **Netlify** כדי להימנע מדרישות תשלום (Billing) של Firebase Hosting.

## שלב 1: הורדת הקוד מה-Studio
1. פתח את הטרמינל בתוך ה-Studio (למטה).
2. הרץ את הפקודה הבאה כדי ליצור קובץ ZIP של הפרויקט:
   ```bash
   zip -r pharma-task-source.zip . -x "node_modules/*" ".next/*" "out/*" ".git/*"
   ```
3. לאחר שהפקודה מסתיימת, תראה קובץ בשם `pharma-task-source.zip` בעץ הקבצים בצד שמאל.
4. לחץ עליו לחיצה ימנית ובחר **Download**.

## שלב 2: העלאה ל-GitHub
1. פתח את הקובץ במחשב שלך.
2. צור Repository חדש ב-GitHub.
3. העלה את כל הקבצים ל-Repository החדש.

## שלב 3: פריסה ב-Vercel (מומלץ)
1. היכנס ל-[Vercel.com](https://vercel.com) והתחבר עם ה-GitHub שלך.
2. לחץ על **Add New** -> **Project**.
3. בחר את ה-Repository של PharmaRisk.
4. תחת סעיף **Environment Variables**, עליך להוסיף את כל המשתנים שמופיעים בקובץ `.env.example` (ראה רשימה למטה).
5. לחץ על **Deploy**.

## שלב 4: הגדרת משתני סביבה (Environment Variables)
יש להעתיק את הערכים הבאים לתוך ממשק הניהול של Vercel/Netlify:

| Key | Value (Example) |
|-----|---------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | מפתח ה-API שלך |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | studio-8601165454-ca26c.firebaseapp.com |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | studio-8601165454-ca26c |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | studio-8601165454-ca26c.firebasestorage.app |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 1090240770131 |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | 1:1090240770131:web:bc89a4a8460f1ccd69d6a6 |
| `GOOGLE_GENAI_API_KEY` | מפתח ה-API של Gemini (עבור ה-AI) |

---

### למה לעשות את זה?
- **Vercel** מעניקה חבילה חינמית נדיבה (Hobby Plan) הכוללת תמיכה מלאה ב-Server Actions (AI) ללא צורך בכרטיס אשראי.
- **Firebase Hosting** דורש Billing עבור קוד שרת (Dynamic Code), אך **Firebase Database (Firestore)** ו-**Auth** נשארים בחינם גם כשאתה פורס ב-Vercel.
