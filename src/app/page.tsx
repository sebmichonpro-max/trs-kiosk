'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LineSelector from '@/components/LineSelector';
import ProductSelector from '@/components/ProductSelector';
import NumPad from '@/components/NumPad';
import { useLines } from '@/hooks/useLines';
import { useProducts, type ProductWithCycleTime } from '@/hooks/useProducts';
import { useSession } from '@/hooks/useSession';
import type { ProductionLine } from '@/lib/types';
import { Target, SkipForward } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { lines, loading: linesLoading } = useLines();
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithCycleTime | null>(null);
  const { products, loading: productsLoading } = useProducts(selectedLine?.id ?? null);
  const { createSession } = useSession(null);
  const [dailyTarget, setDailyTarget] = useState('');
  const [creating, setCreating] = useState(false);

  function handleLineSelect(line: ProductionLine, activeSessionId: string | null) {
    if (activeSessionId) {
      router.push(
        `/session?id=${activeSessionId}&line=${line.id}&lineName=${encodeURIComponent(line.name)}`
      );
    } else {
      setSelectedLine(line);
    }
  }

  function handleProductSelect(product: ProductWithCycleTime) {
    setSelectedProduct(product);
    setDailyTarget('');
  }

  async function handleStartSession(target?: number) {
    if (!selectedLine || !selectedProduct || creating) return;
    setCreating(true);
    const sessionId = await createSession(
      selectedLine.id,
      selectedProduct.id,
      selectedProduct.effective_cycle_time_ms,
      target
    );
    if (sessionId) {
      router.push(
        `/session?id=${sessionId}&line=${selectedLine.id}&lineName=${encodeURIComponent(selectedLine.name)}&productName=${encodeURIComponent(selectedProduct.name)}`
      );
    }
    setCreating(false);
  }

  function renderStep() {
    if (linesLoading) {
      return (
        <div className="flex items-center justify-center h-60 text-text-secondary">
          Chargement des lignes...
        </div>
      );
    }

    // Step 3: Daily target input
    if (selectedProduct) {
      return (
        <div className="p-6 max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-primary" />
            <div>
              <h2 className="text-lg font-semibold text-text">Objectif du jour</h2>
              <p className="text-sm text-text-secondary">
                {selectedLine?.name} — {selectedProduct.name}
              </p>
            </div>
          </div>

          <NumPad
            value={dailyTarget}
            onChange={setDailyTarget}
            label={`Objectif en ${selectedProduct.unit_label}s`}
            unit={selectedProduct.unit_label}
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => handleStartSession()}
              className="flex-1 h-14 rounded-2xl bg-bg-card border border-border-card text-text-secondary font-semibold text-[17px] flex items-center justify-center gap-2 active:scale-[0.97]"
            >
              <SkipForward className="w-5 h-5" />
              Sans objectif
            </button>
            <button
              onClick={() => handleStartSession(parseInt(dailyTarget) || undefined)}
              disabled={!dailyTarget || parseInt(dailyTarget) <= 0 || creating}
              className="flex-1 h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all disabled:opacity-40 hover:bg-primary-hover"
            >
              Démarrer
            </button>
          </div>

          <button
            onClick={() => setSelectedProduct(null)}
            className="w-full mt-3 text-sm text-text-secondary hover:text-text py-2"
          >
            ← Changer de produit
          </button>
        </div>
      );
    }

    // Step 2: Product selection
    if (selectedLine) {
      return (
        <ProductSelector
          products={products}
          lineName={selectedLine.name}
          loading={productsLoading}
          onSelect={handleProductSelect}
          onBack={() => setSelectedLine(null)}
        />
      );
    }

    // Step 1: Line selection
    return <LineSelector lines={lines} onSelect={handleLineSelect} />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Header
        lineName={selectedLine?.name}
        productName={selectedProduct?.name}
        onBack={
          selectedProduct
            ? () => setSelectedProduct(null)
            : selectedLine
              ? () => setSelectedLine(null)
              : undefined
        }
      />
      <main className="flex-1">{renderStep()}</main>
    </div>
  );
}
