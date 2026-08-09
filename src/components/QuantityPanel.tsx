'use client';

import { useState, useCallback, useRef } from 'react';
import { Package, AlertTriangle, Clock, Plus } from 'lucide-react';
import NumPad from './NumPad';
import type { QuantityEntry } from '@/lib/types';

interface QuantityPanelProps {
  totalGood: number;
  totalRejects: number;
  elapsed: string;
  unitLabel: string;
  entries: QuantityEntry[];
  onSubmit: (goodQty: number, rejectQty: number) => void;
}

export default function QuantityPanel({
  totalGood,
  totalRejects,
  elapsed,
  unitLabel,
  entries,
  onSubmit,
}: QuantityPanelProps) {
  const [showNumPad, setShowNumPad] = useState(false);
  const [step, setStep] = useState<'good' | 'reject'>('good');
  const [goodValue, setGoodValue] = useState('');
  const [rejectValue, setRejectValue] = useState('');
  const debounceRef = useRef(false);

  const handleSubmit = useCallback(() => {
    if (debounceRef.current) return;
    const good = parseInt(goodValue) || 0;
    const reject = parseInt(rejectValue) || 0;
    if (good <= 0 && reject <= 0) return;

    debounceRef.current = true;
    onSubmit(good, reject);
    setGoodValue('');
    setRejectValue('');
    setStep('good');
    setShowNumPad(false);
    setTimeout(() => { debounceRef.current = false; }, 500);
  }, [goodValue, rejectValue, onSubmit]);

  return (
    <div className="flex flex-col gap-4 flex-1">
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
          <Package className="w-5 h-5 text-success mb-1" />
          <span className="text-2xl font-bold text-text">{totalGood}</span>
          <span className="text-xs text-text-secondary">Bonnes</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
          <AlertTriangle className="w-5 h-5 text-danger mb-1" />
          <span className="text-2xl font-bold text-text">{totalRejects}</span>
          <span className="text-xs text-text-secondary">Rebuts</span>
        </div>
        <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
          <Clock className="w-5 h-5 text-primary mb-1" />
          <span className="text-2xl font-bold text-text">{elapsed}</span>
          <span className="text-xs text-text-secondary">Durée</span>
        </div>
      </div>

      {showNumPad ? (
        <div className="p-4 rounded-xl bg-bg-card border border-border-card">
          {step === 'good' ? (
            <>
              <NumPad
                value={goodValue}
                onChange={setGoodValue}
                label={`Bonnes ${unitLabel}s`}
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
          ) : (
            <>
              <NumPad
                value={rejectValue}
                onChange={setRejectValue}
                label="Rebuts"
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
                  onClick={handleSubmit}
                  className="flex-1 h-14 rounded-2xl bg-success text-white font-semibold text-[17px] active:scale-[0.97] transition-all"
                >
                  Valider
                </button>
              </div>
            </>
          )}
          <button
            onClick={() => {
              setShowNumPad(false);
              setStep('good');
              setGoodValue('');
              setRejectValue('');
            }}
            className="w-full mt-2 text-sm text-text-secondary hover:text-text py-2"
          >
            Annuler
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNumPad(true)}
          className="h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2 hover:bg-primary-hover"
        >
          <Plus className="w-5 h-5" />
          SAISIR QUANTITÉ
        </button>
      )}

      {entries.length > 0 && (
        <div className="rounded-xl bg-bg-card border border-border-card p-4">
          <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Dernières saisies
          </h4>
          <div className="space-y-1.5">
            {entries.slice(0, 5).map((entry, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-text-secondary">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-text-secondary">→</span>
                <span className="text-success font-medium">+{entry.goodQty} bonnes</span>
                <span className="text-text-secondary">,</span>
                <span className="text-danger font-medium">
                  +{entry.rejectQty} rebut{entry.rejectQty !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
