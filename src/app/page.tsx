'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LineSelector from '@/components/LineSelector';
import ProductSelector from '@/components/ProductSelector';
import { useLines } from '@/hooks/useLines';
import { useProducts, type ProductWithCycleTime } from '@/hooks/useProducts';
import { useSession } from '@/hooks/useSession';
import type { ProductionLine } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const { lines, loading: linesLoading } = useLines();
  const [selectedLine, setSelectedLine] = useState<ProductionLine | null>(null);
  const { products, loading: productsLoading } = useProducts(selectedLine?.id ?? null);
  const { createSession } = useSession(null);

  function handleLineSelect(line: ProductionLine, activeSessionId: string | null) {
    if (activeSessionId) {
      router.push(`/session?id=${activeSessionId}&line=${line.id}&lineName=${encodeURIComponent(line.name)}`);
    } else {
      setSelectedLine(line);
    }
  }

  async function handleProductSelect(product: ProductWithCycleTime) {
    if (!selectedLine) return;
    const sessionId = await createSession(selectedLine.id, product.id, product.effective_cycle_time_ms);
    if (sessionId) {
      router.push(
        `/session?id=${sessionId}&line=${selectedLine.id}&lineName=${encodeURIComponent(selectedLine.name)}&productName=${encodeURIComponent(product.name)}`
      );
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      <Header
        lineName={selectedLine?.name}
        onBack={selectedLine ? () => setSelectedLine(null) : undefined}
      />
      <main className="flex-1">
        {linesLoading ? (
          <div className="flex items-center justify-center h-60 text-text-secondary">
            Chargement des lignes...
          </div>
        ) : selectedLine ? (
          <ProductSelector
            products={products}
            lineName={selectedLine.name}
            loading={productsLoading}
            onSelect={handleProductSelect}
            onBack={() => setSelectedLine(null)}
          />
        ) : (
          <LineSelector lines={lines} onSelect={handleLineSelect} />
        )}
      </main>
    </div>
  );
}
