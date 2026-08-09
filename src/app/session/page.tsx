'use client';

import { Suspense } from 'react';
import SessionContent from './SessionContent';

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Chargement...
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
