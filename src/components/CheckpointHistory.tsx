'use client';

import type { ProductionCheckpoint } from '@/lib/types';

interface CheckpointHistoryProps {
  checkpoints: ProductionCheckpoint[];
}

export default function CheckpointHistory({ checkpoints }: CheckpointHistoryProps) {
  if (checkpoints.length === 0) return null;

  const recent = checkpoints.slice(0, 5);

  return (
    <div className="px-6 py-2 bg-bg-card border-t border-border-card">
      <div className="flex items-center gap-2 overflow-x-auto text-sm">
        <span className="text-xs text-text-secondary shrink-0 font-medium">Checkpoints :</span>
        {recent.map((cp, i) => (
          <span key={cp.id} className="flex items-center gap-1 shrink-0">
            {i > 0 && <span className="text-text-secondary mx-1">|</span>}
            <span className="text-text-secondary">
              {new Date(cp.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-text-secondary">→</span>
            <span className="text-success font-medium">+{cp.good_quantity}</span>
            {cp.reject_quantity > 0 && (
              <span className="text-danger font-medium">, +{cp.reject_quantity} reb.</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
