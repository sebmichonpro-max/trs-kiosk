'use client';

import { Package, ArrowLeft, Timer } from 'lucide-react';
import type { ProductWithCycleTime } from '@/hooks/useProducts';

interface ProductSelectorProps {
  products: ProductWithCycleTime[];
  lineName: string;
  loading: boolean;
  onSelect: (product: ProductWithCycleTime) => void;
  onBack: () => void;
}

function formatCycleTime(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${(s / 60).toFixed(1)} min`;
}

function formatCadence(ms: number): string {
  if (ms <= 0) return '—';
  const perHour = Math.round(3600000 / ms);
  return `${perHour}/h`;
}

export default function ProductSelector({ products, lineName, loading, onSelect, onBack }: ProductSelectorProps) {
  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-2xl bg-bg-card border border-border-card active:bg-primary/20 transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-text" />
        </button>
        <div>
          <h2 className="text-lg font-semibold text-text">Choisir un produit</h2>
          <p className="text-sm text-text-secondary">Ligne : {lineName}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-text-secondary">
          Chargement...
        </div>
      ) : products.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-text-secondary">
          Aucun produit associé à cette ligne
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => onSelect(product)}
              className="flex flex-col items-start gap-3 p-6 rounded-[20px] bg-bg-card border border-border-card hover:border-primary/40 active:scale-[0.97] transition-all text-left min-h-[120px]"
            >
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-primary" />
                <span className="text-[17px] font-semibold text-text">{product.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-text-secondary">
                <span className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  {formatCycleTime(product.effective_cycle_time_ms)}
                </span>
                <span className="font-medium text-primary">
                  {formatCadence(product.effective_cycle_time_ms)}
                </span>
                <span className="px-2 py-0.5 rounded-lg bg-bg-main text-xs">
                  {product.unit_label}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
