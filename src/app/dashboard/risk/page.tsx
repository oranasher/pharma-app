'use client';

import React, { Suspense, lazy } from 'react';
import { useUser } from '@/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

const RiskDashboard = lazy(() => import('@/components/risk/RiskDashboard').then(m => ({ default: m.RiskDashboard })));

export default function RiskPage() {
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
      <div className="p-6">
        <Card className="border-none bg-destructive/5 text-destructive-foreground">
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5" />
              <CardTitle className="text-lg">Access Restricted</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm">The Risk Management and Executive Mitigation Dashboard is restricted to administrators.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <RiskDashboard />
    </Suspense>
  );
}
