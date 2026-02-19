'use client';

import { useCollection, useFirestore } from '@/firebase';
import { useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Equipment } from '@/lib/types';
import { getEquipmentColumns } from '@/components/equipment/equipment-columns';
import { DataTable } from '@/components/equipment/data-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, PlusCircle } from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { EquipmentDialog } from '@/components/equipment/equipment-dialog';

function EquipmentPageContent() {
  const firestore = useFirestore();
  const { isAdmin } = useUser();
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    equipment?: Equipment;
  }>({
    open: false,
    mode: 'create',
  });
  
  const equipmentQuery = useMemo(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'equipment'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: equipment, isLoading: areEquipmentLoading } = useCollection<Equipment>(equipmentQuery);

  const handleOpenEditDialog = useCallback((equipment: Equipment) => {
    setDialogState({ open: true, mode: 'edit', equipment });
  }, []);

  const handleOpenCreateDialog = useCallback(() => {
    setDialogState({ open: true, mode: 'create' });
  }, []);

  const handleCloseDialog = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);

  const columns = useMemo(() => getEquipmentColumns(handleOpenEditDialog), [handleOpenEditDialog]);

  return (
    <>
      <motion.div
        className="grid gap-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className='shadow-sm'>
          <CardHeader className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <CardTitle>Equipment Registry</CardTitle>
              <CardDescription className='mt-1'>
                A registry of all equipment with their current validation status.
              </CardDescription>
            </div>
            <Button onClick={handleOpenCreateDialog}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Equipment
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={equipment ?? []}
              isLoading={areEquipmentLoading}
              customNoDataMessage="No equipment found in the registry."
            />
          </CardContent>
        </Card>
      </motion.div>
      <EquipmentDialog
        open={dialogState.open}
        onOpenChange={handleCloseDialog}
        mode={dialogState.mode}
        equipment={dialogState.equipment}
      />
    </>
  );
}

export default function EquipmentRegistryPage() {
  const { isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <EquipmentPageContent />;
}
