'use client';

import React, { Suspense, lazy } from 'react';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

const QuarterlyRoadmap = lazy(() => import('@/components/roadmap/QuarterlyRoadmap').then(m => ({ default: m.QuarterlyRoadmap })));

export default function RoadmapPage() {
  const { isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>}>
      <QuarterlyRoadmap />
    </Suspense>
  );
}
