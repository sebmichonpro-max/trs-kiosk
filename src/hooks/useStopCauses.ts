'use client';

import { useEffect, useState } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { StopCause } from '@/lib/types';

export function useStopCauses() {
  const [causes, setCauses] = useState<StopCause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await supabase
        .from('stop_causes')
        .select('id, organization_id, name, category, icon, display_order, is_planned, is_active')
        .eq('organization_id', ORGANIZATION_ID)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('display_order');

      if (err) {
        setError(err.message);
      } else {
        setCauses(data ?? []);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { causes, loading, error };
}
