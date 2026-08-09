'use client';

import { useEffect, useState } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { Product, LineProduct } from '@/lib/types';

export interface ProductWithCycleTime extends Product {
  effective_cycle_time_ms: number;
}

export function useProducts(lineId: string | null) {
  const [products, setProducts] = useState<ProductWithCycleTime[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lineId) {
      setProducts([]);
      return;
    }

    setLoading(true);
    setError(null);

    async function fetch() {
      const { data: lineProducts, error: lpErr } = await supabase
        .from('line_products')
        .select('product_id, cycle_time_override_ms')
        .eq('line_id', lineId);

      if (lpErr) {
        setError(lpErr.message);
        setLoading(false);
        return;
      }

      if (!lineProducts || lineProducts.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const productIds = lineProducts.map((lp: { product_id: string; cycle_time_override_ms: number | null }) => lp.product_id);
      const overrides = new Map(
        lineProducts.map((lp: { product_id: string; cycle_time_override_ms: number | null }) => [lp.product_id, lp.cycle_time_override_ms] as const)
      );

      const { data: prods, error: pErr } = await supabase
        .from('products')
        .select('id, organization_id, name, cycle_time_ms, unit_label, is_active')
        .eq('organization_id', ORGANIZATION_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .in('id', productIds)
        .order('name');

      if (pErr) {
        setError(pErr.message);
      } else {
        setProducts(
          (prods ?? []).map((p: Product) => ({
            ...p,
            effective_cycle_time_ms: overrides.get(p.id) ?? p.cycle_time_ms,
          }))
        );
      }
      setLoading(false);
    }
    fetch();
  }, [lineId]);

  return { products, loading, error };
}
