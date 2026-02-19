'use client';

import { useEffect } from 'react';
import { initializeProductionSafeguards } from '@/lib/production-safeguards';

/**
 * A lightweight component to trigger production safety protocols on mount.
 */
export function ProductionSafeguards() {
  useEffect(() => {
    initializeProductionSafeguards();
  }, []);

  return null;
}
