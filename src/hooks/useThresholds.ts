'use client';

import { useEffect, useState } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { TRSThresholds } from '@/lib/types';

const DEFAULT_THRESHOLDS: TRSThresholds = {
  organization_id: ORGANIZATION_ID,
  excellent_min: 8500,
  good_min: 6500,
  warning_min: 5000,
};

export function useThresholds() {
  const [thresholds, setThresholds] = useState<TRSThresholds>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data, error: err } = await supabase
        .from('trs_thresholds')
        .select('organization_id, excellent_min, good_min, warning_min')
        .eq('organization_id', ORGANIZATION_ID)
        .single();

      if (err) {
        setError(err.message);
      } else if (data) {
        setThresholds(data);
      }
      setLoading(false);
    }
    fetch();
  }, []);

  return { thresholds, loading, error };
}
