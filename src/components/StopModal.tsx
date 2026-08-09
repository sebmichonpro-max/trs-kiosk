'use client';

import { useState } from 'react';
import { X, Clock, Pencil } from 'lucide-react';
import type { StopCause } from '@/lib/types';
import NumPad from './NumPad';

interface StopModalProps {
  causes: StopCause[];
  onStartRealtime: (causeId: string, notes?: string) => void;
  onAddManual: (causeId: string, durationMinutes: number, notes?: string) => void;
  onClose: () => void;
}

const CATEGORY_STYLES: Record<string, { bg: string; border: string; badge: string; label: string }> = {
  availability: { bg: 'bg-primary/10', border: 'border-primary/30', badge: 'bg-primary/15 text-primary', label: 'Disponibilité' },
  performance: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-500/15 text-purple-400', label: 'Performance' },
  quality: { bg: 'bg-success/10', border: 'border-success/30', badge: 'bg-success/15 text-success', label: 'Qualité' },
};

export default function StopModal({ causes, onStartRealtime, onAddManual, onClose }: StopModalProps) {
  const [mode, setMode] = useState<'realtime' | 'manual'>('realtime');
  const [selectedCause, setSelectedCause] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState('');

  function handleValidate() {
    if (!selectedCause) return;

    if (mode === 'realtime') {
      onStartRealtime(selectedCause, notes || undefined);
    } else {
      const mins = parseInt(duration) || 0;
      if (mins <= 0) return;
      onAddManual(selectedCause, mins, notes || undefined);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between p-6 border-b border-border-card">
          <h2 className="text-xl font-bold text-text">Déclarer un arrêt</h2>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-bg-main border border-border-card active:bg-danger/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex gap-2">
            <button
              onClick={() => setMode('realtime')}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-semibold text-[17px] transition-colors ${
                mode === 'realtime'
                  ? 'bg-primary text-white'
                  : 'bg-bg-main border border-border-card text-text-secondary'
              }`}
            >
              <Clock className="w-5 h-5" />
              Temps réel
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl font-semibold text-[17px] transition-colors ${
                mode === 'manual'
                  ? 'bg-primary text-white'
                  : 'bg-bg-main border border-border-card text-text-secondary'
              }`}
            >
              <Pencil className="w-5 h-5" />
              Saisie manuelle
            </button>
          </div>

          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">
              Cause de l&apos;arrêt
            </label>
            <div className="grid grid-cols-2 gap-2">
              {causes.map((cause) => {
                const style = CATEGORY_STYLES[cause.category] ?? CATEGORY_STYLES.availability;
                const isSelected = selectedCause === cause.id;
                return (
                  <button
                    key={cause.id}
                    onClick={() => setSelectedCause(cause.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.97] text-left min-h-[56px] ${
                      isSelected
                        ? `${style.bg} ${style.border} ring-2 ring-offset-0 ring-primary/50`
                        : 'bg-bg-main border-border-card'
                    }`}
                  >
                    <span className="text-xl">{cause.icon || '⚠️'}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-text block truncate">{cause.name}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5 inline-block ${style.badge}`}>
                        {style.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'manual' && (
            <NumPad value={duration} onChange={setDuration} label="Durée (minutes)" unit="min" />
          )}

          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: moteur ligne 2 HS"
              rows={2}
              className="w-full px-4 py-3 rounded-2xl bg-bg-main border border-border-card text-text placeholder:text-text-secondary/50 resize-none text-sm focus:outline-none focus:border-primary/50"
            />
          </div>

          <button
            onClick={handleValidate}
            disabled={!selectedCause || (mode === 'manual' && (!duration || parseInt(duration) <= 0))}
            className="w-full h-14 rounded-2xl bg-danger text-white font-semibold text-[17px] active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {mode === 'realtime' ? 'Démarrer l\'arrêt' : 'Enregistrer l\'arrêt'}
          </button>
        </div>
      </div>
    </div>
  );
}
