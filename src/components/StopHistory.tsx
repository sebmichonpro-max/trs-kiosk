'use client';

import { Clock, MessageSquare, AlertTriangle } from 'lucide-react';
import type { ProductionStop, StopCause } from '@/lib/types';

interface StopHistoryProps {
  stops: ProductionStop[];
  causes: StopCause[];
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

const CATEGORY_COLORS: Record<string, string> = {
  availability: 'bg-primary/15 text-primary',
  performance: 'bg-purple-500/15 text-purple-600',
  quality: 'bg-success/15 text-success',
};

export default function StopHistory({ stops, causes }: StopHistoryProps) {
  const causeMap = new Map(causes.map((c) => [c.id, c]));

  if (stops.length === 0) {
    return (
      <div className="p-6 rounded-[20px] bg-bg-card border border-border-card">
        <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
          Historique arrêts
        </h3>
        <p className="text-sm text-text-secondary py-4 text-center">Aucun arrêt enregistré</p>
      </div>
    );
  }

  const paretoData = new Map<string, number>();
  for (const stop of stops) {
    const dur = stop.duration_seconds ?? 0;
    const prev = paretoData.get(stop.cause_id) ?? 0;
    paretoData.set(stop.cause_id, prev + dur);
  }
  const totalPareto = Array.from(paretoData.values()).reduce((a, b) => a + b, 0);
  const paretoEntries = Array.from(paretoData.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="p-6 rounded-[20px] bg-bg-card border border-border-card">
      <h3 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
        Historique arrêts ({stops.length})
      </h3>

      {totalPareto > 0 && (
        <div className="mb-4">
          <div className="flex rounded-lg overflow-hidden h-3">
            {paretoEntries.map(([causeId, dur]) => {
              const cause = causeMap.get(causeId);
              const pct = (dur / totalPareto) * 100;
              const colors: Record<string, string> = {
                availability: '#2d5a3d',
                performance: '#7c3aed',
                quality: '#22C55E',
              };
              return (
                <div
                  key={causeId}
                  style={{
                    width: `${pct}%`,
                    backgroundColor: colors[cause?.category ?? 'availability'] ?? '#2563EB',
                  }}
                  title={`${cause?.name ?? '?'}: ${formatDuration(dur)}`}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
        {stops.map((stop) => {
          const cause = causeMap.get(stop.cause_id);
          const isActive = !stop.ended_at;
          const duration = stop.duration_seconds
            ?? (isActive ? Math.round((Date.now() - new Date(stop.started_at).getTime()) / 1000) : 0);

          return (
            <div
              key={stop.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                isActive
                  ? 'bg-danger/10 border-danger/30 animate-pulse-stop'
                  : 'bg-bg-main border-border-card'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 shrink-0 ${isActive ? 'text-danger' : 'text-text-secondary'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text truncate">
                    {cause?.name ?? 'Inconnu'}
                  </span>
                  {cause && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${CATEGORY_COLORS[cause.category] ?? ''}`}>
                      {cause.category === 'availability' ? 'Dispo' : cause.category === 'performance' ? 'Perf' : 'Qual'}
                    </span>
                  )}
                </div>
                {stop.notes && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MessageSquare className="w-3 h-3 text-text-secondary" />
                    <span className="text-xs text-text-secondary truncate">{stop.notes}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm font-mono">
                <Clock className="w-3.5 h-3.5 text-text-secondary" />
                <span className={isActive ? 'text-danger font-semibold' : 'text-text-secondary'}>
                  {formatDuration(duration)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
