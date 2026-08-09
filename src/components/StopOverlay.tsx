'use client';

import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { ProductionStop, StopCause } from '@/lib/types';

interface StopOverlayProps {
  activeStop: ProductionStop;
  causes: StopCause[];
  onEndStop: () => void;
}

function formatStopDuration(startedAt: string): string {
  const elapsed = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function StopOverlay({ activeStop, causes, onEndStop }: StopOverlayProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const cause = causes.find((c) => c.id === activeStop.cause_id);

  return (
    <div className="flex flex-col items-center justify-center flex-1 rounded-[20px] bg-danger/5 border-2 border-danger/30 p-8">
      <div className="flex flex-col items-center gap-6">
        <div className="px-6 py-2 rounded-xl bg-danger/15 border border-danger/30">
          <span className="text-sm font-semibold text-danger animate-pulse-stop">EN ARRÊT</span>
        </div>

        <div className="text-7xl font-bold text-danger leading-none" style={{ fontSize: 80 }}>
          {formatStopDuration(activeStop.started_at)}
        </div>

        <div className="flex items-center gap-2 text-lg text-text-secondary">
          <span className="text-2xl">{cause?.icon || '⚠️'}</span>
          <span className="font-medium">{cause?.name || 'Arrêt'}</span>
        </div>

        {activeStop.notes && (
          <p className="text-sm text-text-secondary italic max-w-md text-center">
            {activeStop.notes}
          </p>
        )}

        <button
          onClick={onEndStop}
          className="mt-4 h-16 px-12 rounded-2xl bg-success text-white font-bold text-xl active:scale-[0.97] transition-all flex items-center gap-3"
        >
          <Play className="w-7 h-7 fill-white" />
          FIN D&apos;ARRÊT
        </button>
      </div>
    </div>
  );
}
