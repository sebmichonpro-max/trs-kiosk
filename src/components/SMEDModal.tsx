'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Check, X } from 'lucide-react';
import type { ProductWithCycleTime } from '@/hooks/useProducts';

interface SMEDModalProps {
  products: ProductWithCycleTime[];
  currentProductId: string;
  onConfirm: (newProduct: ProductWithCycleTime | null) => void;
  onClose: () => void;
  startedAt: Date;
}

function formatSMEDTimer(startedAt: Date): string {
  const elapsed = Math.round((Date.now() - startedAt.getTime()) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SMEDModal({
  products,
  currentProductId,
  onConfirm,
  onClose,
  startedAt,
}: SMEDModalProps) {
  const [, setTick] = useState(0);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const availableProducts = products.filter((p) => p.id !== currentProductId);

  function handleConfirm() {
    const newProduct = availableProducts.find((p) => p.id === selectedProductId) || null;
    onConfirm(newProduct);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[20px] bg-bg-card border border-border-card overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-border-card bg-warning/10">
          <div className="flex items-center gap-3">
            <RefreshCw
              className="w-6 h-6 text-warning animate-spin"
              style={{ animationDuration: '3s' }}
            />
            <h2 className="text-xl font-bold text-text">Changement de série</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-bg-main"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-6">
          <div className="text-6xl font-bold text-warning leading-none" style={{ fontSize: 64 }}>
            {formatSMEDTimer(startedAt)}
          </div>
          <p className="text-sm text-text-secondary">Chrono SMED en cours</p>

          <div className="w-full">
            <label className="text-[13px] font-medium text-text-secondary mb-2 block">
              Nouveau produit (optionnel)
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-border-card bg-bg-main px-4 py-3 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="">Même produit</option>
              {availableProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full h-16 rounded-2xl bg-success text-white font-bold text-xl active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <Check className="w-7 h-7" />
            SÉRIE PRÊTE
          </button>
        </div>
      </div>
    </div>
  );
}
