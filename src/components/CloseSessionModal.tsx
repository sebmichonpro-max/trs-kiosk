'use client';

import { useState } from 'react';
import { X, CheckCircle, Square } from 'lucide-react';
import TRSGauges from './TRSGauges';
import { calculateTRS } from '@/lib/trs-calc';
import type { TRSThresholds, ProductionStop, StopCause } from '@/lib/types';

interface CloseSessionModalProps {
  sessionStartedAt: string;
  cycleTimeMs: number;
  qtyProduced: number;
  qtyConforming: number;
  stops: ProductionStop[];
  causes: StopCause[];
  thresholds: TRSThresholds;
  totalStopSeconds: number;
  lineName: string;
  productName: string;
  onConfirm: (trsValues: {
    trs: number;
    availability: number;
    performance: number;
    quality: number;
    trsLevel: string;
  }) => void;
  onClose: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m} min`;
}

export default function CloseSessionModal({
  sessionStartedAt,
  cycleTimeMs,
  qtyProduced,
  qtyConforming,
  stops,
  causes,
  thresholds,
  totalStopSeconds,
  lineName,
  productName,
  onConfirm,
  onClose,
}: CloseSessionModalProps) {
  const [confirming, setConfirming] = useState(false);

  const now = new Date();
  const startedAt = new Date(sessionStartedAt);
  const sessionSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  const causeMap = new Map(causes.map((c) => [c.id, c]));
  const plannedStopSeconds = stops.reduce((acc, s) => {
    const cause = causeMap.get(s.cause_id);
    if (cause?.is_planned && s.duration_seconds) return acc + s.duration_seconds;
    return acc;
  }, 0);

  const trsResult = calculateTRS(
    {
      sessionStartedAt: startedAt,
      sessionEndedAt: now,
      totalStopSeconds,
      plannedStopSeconds,
      qtyProduced,
      qtyConforming,
      cycleTimeMs,
    },
    thresholds
  );

  const rejects = qtyProduced - qtyConforming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between p-6 border-b border-border-card">
          <div className="flex items-center gap-2">
            <Square className="w-5 h-5 text-danger" />
            <h2 className="text-xl font-bold text-text">Clôturer la session</h2>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-bg-main border border-border-card active:bg-danger/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center text-sm text-text-secondary">
            <span className="font-semibold text-text">{lineName}</span>
            {' — '}
            <span className="font-medium text-primary">{productName}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
              <span className="text-sm text-text-secondary">Durée session</span>
              <span className="text-sm font-semibold text-text">
                {formatDuration(sessionSeconds)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
              <span className="text-sm text-text-secondary">Temps d&apos;arrêt</span>
              <span className="text-sm font-semibold text-danger">
                {formatDuration(totalStopSeconds)}
              </span>
            </div>
            <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
              <span className="text-sm text-text-secondary">Bonnes pièces</span>
              <span className="text-sm font-semibold text-success">{qtyConforming}</span>
            </div>
            <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
              <span className="text-sm text-text-secondary">Rebuts</span>
              <span className="text-sm font-semibold text-danger">{rejects}</span>
            </div>
          </div>

          <TRSGauges
            availability={trsResult.availability}
            performance={trsResult.performance}
            quality={trsResult.quality}
            trs={trsResult.trs}
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 h-14 rounded-2xl bg-bg-main border border-border-card text-text-secondary font-semibold text-[17px]"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                if (confirming) return;
                setConfirming(true);
                onConfirm(trsResult);
              }}
              disabled={confirming}
              className="flex-1 h-14 rounded-2xl bg-danger text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <CheckCircle className="w-5 h-5" />
              Clôturer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
