'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { DailyProductionTarget } from '@/lib/types';

export function useDailyTarget(lineId: string | null, productId: string | null) {
  const [target, setTarget] = useState<DailyProductionTarget | null>(null);

  const fetchTarget = useCallback(async () => {
    if (!lineId || !productId) { setTarget(null); return; }

    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from('daily_production_targets')
      .select('*')
      .eq('organization_id', ORGANIZATION_ID)
      .eq('line_id', lineId)
      .eq('product_id', productId)
      .eq('target_date', today)
      .maybeSingle();

    setTarget(data);
  }, [lineId, productId]);

  useEffect(() => {
    fetchTarget();
  }, [fetchTarget]);

  useEffect(() => {
    const channel = supabase
      .channel('daily-targets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_production_targets',
      }, () => { fetchTarget(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchTarget]);

  return { target, targetQuantity: target?.target_quantity ?? 0 };
}
