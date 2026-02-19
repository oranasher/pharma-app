'use client';

import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Document, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDocumentColumns } from '@/components/document/document-columns';
import { DataTable } from '@/components/document/data-table';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { UploadDialog } from '@/components/document/upload-dialog';
import { motion } from 'framer-motion';

function DocumentsPageContent() {
  const firestore = useFirestore();
  const [isUploadDialogOpen, setUploadDialogOpen] = useState(false);
  const { user, isAdmin } = useUser();

  const documentsQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'documents'), orderBy('createdAt', 'desc'));
  }, [firestore]);

  const { data: documents, isLoading: areDocumentsLoading } = useCollection<Document>(documentsQuery);

  const columns = useMemo(() => getDocumentColumns(), []);

  return (
    <motion.div
      className="grid gap-6"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <CardTitle>Documents</CardTitle>
            <CardDescription className="mt-1">
              A shared repository for team protocols and templates.
            </CardDescription>
          </div>
          <div className="ml-auto flex w-full items-center gap-4 md:w-auto">
            <Button onClick={() => setUploadDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={documents ?? []}
            isLoading={areDocumentsLoading}
            customNoDataMessage="No documents have been uploaded yet."
          />
        </CardContent>
      </Card>
      
      <UploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />
    </motion.div>
  );
}

export default function DocumentsPage() {
  // This page is accessible to everyone, so no specific role check needed here.
  // The layout handles the loading and auth state.
  return <DocumentsPageContent />;
}
