'use client';

import { useState, useRef } from 'react';
import { X } from 'lucide-react';
import type { StopCause } from '@/lib/types';

interface StopModalProps {
  causes: StopCause[];
  onDeclare: (causeId: string, notes?: string) => void;
  onClose: () => void;
}

const CATEGORY_META: Record<string, { label: string; color: string; emoji: string }> = {
  availability: { label: 'Disponibilité', color: 'border-danger/30 bg-danger/5', emoji: '🔴' },
  performance: { label: 'Performance', color: 'border-warning/30 bg-warning/5', emoji: '🟡' },
  quality: { label: 'Qualité', color: 'border-primary/30 bg-primary/5', emoji: '🔵' },
};

export default function StopModal({ causes, onDeclare, onClose }: StopModalProps) {
  const [comment, setComment] = useState('');
  const debounceRef = useRef(false);

  const grouped = {
    availability: causes.filter((c) => c.category === 'availability'),
    performance: causes.filter((c) => c.category === 'performance' && !c.name.toLowerCase().includes('changement')),
    quality: causes.filter((c) => c.category === 'quality'),
  };

  function handleTap(causeId: string) {
    if (debounceRef.current) return;
    debounceRef.current = true;
    onDeclare(causeId, comment || undefined);
    onClose();
    setTimeout(() => { debounceRef.current = false; }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
          <div>
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">
              Commentaire (optionnel)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 200))}
              placeholder="Ex: moteur ligne 2 HS"
              rows={2}
              maxLength={200}
              className="w-full px-4 py-3 rounded-2xl bg-bg-main border border-border-card text-text placeholder:text-text-secondary/50 resize-none text-sm focus:outline-none focus:border-primary/50"
            />
            <p className="text-xs text-text-secondary mt-1 text-right">{comment.length}/200</p>
          </div>

          {(['availability', 'performance', 'quality'] as const).map((cat) => {
            const meta = CATEGORY_META[cat];
            const catCauses = grouped[cat];
            if (catCauses.length === 0) return null;
            return (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-2">
                  <span>{meta.emoji}</span>
                  <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                    {meta.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {catCauses.map((cause) => (
                    <button
                      key={cause.id}
                      onClick={() => handleTap(cause.id)}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-all active:scale-[0.97] text-left min-h-[56px] ${meta.color} hover:shadow-md`}
                    >
                      <span className="text-xl">{cause.icon || '⚠️'}</span>
                      <span className="text-sm font-medium text-text">{cause.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
