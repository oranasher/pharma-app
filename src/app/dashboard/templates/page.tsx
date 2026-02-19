'use client';

import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { TaskTemplate } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/template/data-table';
import { columns } from '@/components/template/template-columns';
import { useUser } from '@/firebase';
import { PlusCircle } from 'lucide-react';
import { TemplateDialog } from '@/components/template/template-dialog';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';


function TemplatesPageContent() {
  const firestore = useFirestore();
  const templatesQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'taskTemplates'), orderBy('name', 'asc'));
  }, [firestore]);
  
  const { data: templates, isLoading: areTemplatesLoading } = useCollection<TaskTemplate>(templatesQuery);

  return (
    <motion.div 
      className="grid gap-4"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Task Templates</CardTitle>
                <CardDescription className='mt-1'>Create and manage reusable task templates.</CardDescription>
            </div>
          <TemplateDialog>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Template
            </Button>
          </TemplateDialog>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={templates ?? []} isLoading={areTemplatesLoading} />
        </CardContent>
      </Card>
    </motion.div>
  );
}


export default function TemplatesPage() {
  const { isAdmin } = useUser();
  
  // The layout handles the global loading state and auth check.
  // We just need to check for admin privileges here.
  if (!isAdmin) {
    return (
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page. Please contact an administrator.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TemplatesPageContent />;
}
