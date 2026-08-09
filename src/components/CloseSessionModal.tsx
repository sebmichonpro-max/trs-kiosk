'use client';

import { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import NumPad from './NumPad';
import TRSGauges from './TRSGauges';
import { calculateTRS } from '@/lib/trs-calc';
import type { TRSThresholds, ProductionStop, StopCause } from '@/lib/types';

interface CloseSessionModalProps {
  sessionStartedAt: string;
  cycleTimeMs: number;
  stops: ProductionStop[];
  causes: StopCause[];
  thresholds: TRSThresholds;
  totalStopSeconds: number;
  onConfirm: (qtyProduced: number, qtyNonConforming: number, trsValues: {
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
  stops,
  causes,
  thresholds,
  totalStopSeconds,
  onConfirm,
  onClose,
}: CloseSessionModalProps) {
  const [step, setStep] = useState<'qty_produced' | 'qty_defective' | 'review'>('qty_produced');
  const [qtyProduced, setQtyProduced] = useState('');
  const [qtyDefective, setQtyDefective] = useState('');

  const now = new Date();
  const startedAt = new Date(sessionStartedAt);
  const sessionSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  const causeMap = new Map(causes.map((c) => [c.id, c]));
  const plannedStopSeconds = stops.reduce((acc, s) => {
    const cause = causeMap.get(s.cause_id);
    if (cause?.is_planned && s.duration_seconds) return acc + s.duration_seconds;
    return acc;
  }, 0);

  const qtyProd = parseInt(qtyProduced) || 0;
  const qtyDef = parseInt(qtyDefective) || 0;
  const qtyConforming = Math.max(qtyProd - qtyDef, 0);

  const trsResult = calculateTRS(
    {
      sessionStartedAt: startedAt,
      sessionEndedAt: now,
      totalStopSeconds,
      plannedStopSeconds,
      qtyProduced: qtyProd,
      qtyConforming,
      cycleTimeMs,
    },
    thresholds
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between p-6 border-b border-border-card">
          <h2 className="text-xl font-bold text-text">Clôturer la session</h2>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-bg-main border border-border-card active:bg-danger/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {step === 'qty_produced' && (
            <>
              <NumPad
                value={qtyProduced}
                onChange={setQtyProduced}
                label="Pièces produites totales"
                unit="pièces"
              />
              <button
                onClick={() => setStep('qty_defective')}
                disabled={!qtyProduced || parseInt(qtyProduced) <= 0}
                className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                Suivant
              </button>
            </>
          )}

          {step === 'qty_defective' && (
            <>
              <NumPad
                value={qtyDefective}
                onChange={setQtyDefective}
                label="Pièces non conformes"
                unit="rebuts"
              />
              <button
                onClick={() => setStep('review')}
                className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all"
              >
                Voir le récapitulatif
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <div className="space-y-3">
                <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
                  <span className="text-sm text-text-secondary">Durée session</span>
                  <span className="text-sm font-semibold text-text">{formatDuration(sessionSeconds)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
                  <span className="text-sm text-text-secondary">Temps d&apos;arrêt total</span>
                  <span className="text-sm font-semibold text-danger">{formatDuration(totalStopSeconds)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
                  <span className="text-sm text-text-secondary">Pièces produites</span>
                  <span className="text-sm font-semibold text-text">{qtyProd}</span>
                </div>
                <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
                  <span className="text-sm text-text-secondary">Pièces conformes</span>
                  <span className="text-sm font-semibold text-success">{qtyConforming}</span>
                </div>
              </div>

              <TRSGauges
                availability={trsResult.availability}
                performance={trsResult.performance}
                quality={trsResult.quality}
                trs={trsResult.trs}
              />

              <button
                onClick={() => onConfirm(qtyProd, qtyDef, trsResult)}
                className="w-full h-14 rounded-2xl bg-success text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Valider la clôture
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
