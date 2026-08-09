'use client';

import { useEffect, useState } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { ProductionLine } from '@/lib/types';

export function useLines() {
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await supabase
        .from('production_lines')
        .select('id, organization_id, name, hourly_cost_cents, is_active')
        .eq('organization_id', ORGANIZATION_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (err) {
        setError(err.message);
      } else {
        setLines(data ?? []);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { lines, loading, error };
}
