'use client';

import { useMemo, useState } from 'react';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, LineChart, Loader2, Download } from 'lucide-react';
import { generateTeamReport } from '@/ai/flows/generate-team-report';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { collection, collectionGroup, query, orderBy } from 'firebase/firestore';
import type { AppUser, Task } from '@/lib/types';


function ReportPageContent() {
  const { appUser } = useUser();
  const firestore = useFirestore();

  const [report, setReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTasksQuery = useMemo(() => {
    if (!firestore) return null;
    // NOTE: Sorting on a collection group requires a composite index.
    // This has been removed to prevent the app from crashing.
    return query(collectionGroup(firestore, 'tasks'));
  }, [firestore]);

  const allUsersQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'public_users'));
  }, [firestore]);

  const { data: tasks, isLoading: areTasksLoading } = useCollection<Task>(allTasksQuery);
  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(allUsersQuery);
  
  const handleGenerateReport = async () => {
    if (!appUser) {
        setError('User data is not available.');
        return;
    }

    if (areTasksLoading || areUsersLoading || !tasks || !users) {
      setError('Data is still loading. Please wait a moment and try again.');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setReport(null);

    try {
      // The AI flow now receives data from the client.
      const result = await generateTeamReport({
        period: appUser?.reportSettings?.frequency === 'daily' ? 'daily' : 'weekly',
        tasks: tasks,
        users: users,
      });

      if (result.report) {
         setReport(result.report);
      } else {
        throw new Error("The AI returned an empty report.");
      }
     
    } catch (e: any) {
      console.error("Error generating report:", e);
      setError(`Failed to generate the report. ${e.message || 'Please try again.'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `pharma-task-report-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  const reportFrequency = appUser?.reportSettings?.frequency ?? 'never';
  const dataIsLoading = areTasksLoading || areUsersLoading;

  return (
    <motion.div
      className="grid gap-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Team Report</CardTitle>
          <CardDescription>
            Generate a summary of team activity, workload, and performance. Your settings are configured to analyze data on a {reportFrequency} basis.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleGenerateReport} disabled={isGenerating || dataIsLoading}>
                  {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : 
                   dataIsLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Data...</> : 
                   <><Bot className="mr-2 h-4 w-4" /> Generate Report</>
                  }
              </Button>
               {report && !isGenerating && (
                    <Button onClick={handleDownloadReport} variant="outline">
                        <Download className="mr-2 h-4 w-4"/>
                        Export Report
                    </Button>
                )}
            </div>

            {isGenerating && (
                 <div className="flex items-center gap-2 pt-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Analyzing team data... This may take a moment.</span>
                </div>
            )}
            {report && (
                <Card className='mt-4 bg-secondary/50'>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'><LineChart className='h-6 w-6 text-primary'/> Team Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="prose prose-invert max-w-none">
                             <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>
            )}
             {error && (
                <p className="mt-4 text-destructive">{error}</p>
            )}
        </CardContent>
      </Card>
    </motion.div>
  )
}


export default function ReportPage() {
  const { isAdmin, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
        </CardHeader>
        <CardContent>
          <p>You do not have permission to view this page. This feature is for admins only.</p>
        </CardContent>
      </Card>
    );
  }

  return <ReportPageContent />;
}
