'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { ProductionCheckpoint } from '@/lib/types';

export function useCheckpoints(sessionId: string | null) {
  const [checkpoints, setCheckpoints] = useState<ProductionCheckpoint[]>([]);

  const fetchCheckpoints = useCallback(async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('production_checkpoints')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });
    setCheckpoints(data ?? []);
  }, [sessionId]);

  useEffect(() => {
    fetchCheckpoints();
  }, [fetchCheckpoints]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`checkpoints-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'production_checkpoints',
        filter: `session_id=eq.${sessionId}`,
      }, () => { fetchCheckpoints(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, fetchCheckpoints]);

  async function addCheckpoint(
    goodQty: number,
    rejectQty: number,
    comment?: string
  ): Promise<boolean> {
    if (!sessionId) return false;
    const { error } = await supabase
      .from('production_checkpoints')
      .insert({
        organization_id: ORGANIZATION_ID,
        session_id: sessionId,
        good_quantity: goodQty,
        reject_quantity: rejectQty,
        comment: comment || null,
      });
    if (error) return false;
    await fetchCheckpoints();
    return true;
  }

  const totalGood = checkpoints.reduce((acc, c) => acc + c.good_quantity, 0);
  const totalRejects = checkpoints.reduce((acc, c) => acc + c.reject_quantity, 0);

  return { checkpoints, addCheckpoint, totalGood, totalRejects, refetch: fetchCheckpoints };
}
