'use client';

import { useState, useRef } from 'react';
import { X, BarChart3, Check } from 'lucide-react';
import NumPad from './NumPad';

interface CheckpointModalProps {
  unitLabel: string;
  onSubmit: (good: number, rejects: number, comment?: string) => void;
  onClose: () => void;
}

export default function CheckpointModal({ unitLabel, onSubmit, onClose }: CheckpointModalProps) {
  const [step, setStep] = useState<'good' | 'reject' | 'comment'>('good');
  const [goodValue, setGoodValue] = useState('');
  const [rejectValue, setRejectValue] = useState('');
  const [comment, setComment] = useState('');
  const debounceRef = useRef(false);

  function handleSubmit() {
    if (debounceRef.current) return;
    const good = parseInt(goodValue) || 0;
    const reject = parseInt(rejectValue) || 0;
    if (good <= 0 && reject <= 0) return;
    debounceRef.current = true;
    onSubmit(good, reject, comment || undefined);
    setTimeout(() => { debounceRef.current = false; }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between p-6 border-b border-border-card">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-text">Point de contrôle</h2>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-bg-main border border-border-card active:bg-danger/20 transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6">
          {step === 'good' && (
            <>
              <NumPad
                value={goodValue}
                onChange={setGoodValue}
                label={`Bonnes ${unitLabel}s depuis dernier point`}
                unit={unitLabel}
              />
              <button
                onClick={() => setStep('reject')}
                disabled={goodValue === ''}
                className="w-full mt-3 h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all disabled:opacity-40 hover:bg-primary-hover"
              >
                Suivant → Rebuts
              </button>
            </>
          )}

          {step === 'reject' && (
            <>
              <NumPad
                value={rejectValue}
                onChange={setRejectValue}
                label="Rebuts depuis dernier point"
                unit="rebuts"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setStep('good')}
                  className="flex-1 h-14 rounded-2xl bg-bg-main border border-border-card text-text-secondary font-semibold"
                >
                  Retour
                </button>
                <button
                  onClick={() => setStep('comment')}
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all"
                >
                  Suivant
                </button>
              </div>
            </>
          )}

          {step === 'comment' && (
            <>
              <div className="mb-4">
                <label className="text-[13px] font-medium text-text-secondary mb-2 block">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 200))}
                  placeholder="Ex: cadence légèrement réduite"
                  rows={3}
                  maxLength={200}
                  className="w-full px-4 py-3 rounded-2xl bg-bg-main border border-border-card text-text placeholder:text-text-secondary/50 resize-none text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-bg-main border border-border-card mb-4">
                <div className="text-center flex-1">
                  <span className="text-lg font-bold text-success">+{parseInt(goodValue) || 0}</span>
                  <p className="text-xs text-text-secondary">bonnes</p>
                </div>
                <div className="text-center flex-1">
                  <span className="text-lg font-bold text-danger">+{parseInt(rejectValue) || 0}</span>
                  <p className="text-xs text-text-secondary">rebuts</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('reject')}
                  className="flex-1 h-14 rounded-2xl bg-bg-main border border-border-card text-text-secondary font-semibold"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 h-14 rounded-2xl bg-success text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  Valider
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
