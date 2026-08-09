'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';
import type { ProductionSession, ProductionStop } from '@/lib/types';

export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<ProductionSession | null>(null);
  const [stops, setStops] = useState<ProductionStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      setStops([]);
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase
      .from('production_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (err) {
      setError(err.message);
    } else {
      setSession(data);
    }
    setLoading(false);
  }, [sessionId]);

  const fetchStops = useCallback(async () => {
    if (!sessionId) return;

    const { data, error: err } = await supabase
      .from('production_stops')
      .select('*')
      .eq('session_id', sessionId)
      .order('started_at', { ascending: false });

    if (err) {
      setError(err.message);
    } else {
      setStops(data ?? []);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
    fetchStops();
  }, [fetchSession, fetchStops]);

  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`stops-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_stops',
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchStops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchStops]);

  async function createSession(lineId: string, productId: string, cycleTimeMs: number): Promise<string | null> {
    const { data, error: err } = await supabase
      .from('production_sessions')
      .insert({
        organization_id: ORGANIZATION_ID,
        line_id: lineId,
        product_id: productId,
        started_at: new Date().toISOString(),
        cycle_time_used_ms: cycleTimeMs,
      })
      .select('id')
      .single();

    if (err) {
      setError(err.message);
      return null;
    }
    return data.id;
  }

  async function startStop(causeId: string, notes?: string): Promise<boolean> {
    if (!sessionId) return false;

    const { error: err } = await supabase
      .from('production_stops')
      .insert({
        organization_id: ORGANIZATION_ID,
        session_id: sessionId,
        cause_id: causeId,
        started_at: new Date().toISOString(),
        notes: notes || null,
      });

    if (err) {
      setError(err.message);
      return false;
    }
    await fetchStops();
    return true;
  }

  async function endStop(stopId: string): Promise<boolean> {
    const stop = stops.find((s) => s.id === stopId);
    if (!stop) return false;

    const now = new Date();
    const startedAt = new Date(stop.started_at);
    const durationSeconds = Math.round((now.getTime() - startedAt.getTime()) / 1000);

    const { error: err } = await supabase
      .from('production_stops')
      .update({
        ended_at: now.toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', stopId);

    if (err) {
      setError(err.message);
      return false;
    }
    await fetchStops();
    return true;
  }

  async function addManualStop(causeId: string, durationMinutes: number, notes?: string): Promise<boolean> {
    if (!sessionId) return false;

    const now = new Date();
    const startedAt = new Date(now.getTime() - durationMinutes * 60 * 1000);

    const { error: err } = await supabase
      .from('production_stops')
      .insert({
        organization_id: ORGANIZATION_ID,
        session_id: sessionId,
        cause_id: causeId,
        started_at: startedAt.toISOString(),
        ended_at: now.toISOString(),
        duration_seconds: Math.round(durationMinutes * 60),
        notes: notes || null,
      });

    if (err) {
      setError(err.message);
      return false;
    }
    await fetchStops();
    return true;
  }

  async function closeSession(qtyProduced: number, qtyNonConforming: number, trsValues: {
    trs: number;
    availability: number;
    performance: number;
    quality: number;
    trsLevel: string;
  }): Promise<boolean> {
    if (!sessionId) return false;

    const { error: err } = await supabase
      .from('production_sessions')
      .update({
        ended_at: new Date().toISOString(),
        qty_produced: qtyProduced,
        qty_conforming: qtyProduced - qtyNonConforming,
        trs: trsValues.trs,
        availability: trsValues.availability,
        performance: trsValues.performance,
        quality: trsValues.quality,
        trs_level: trsValues.trsLevel,
      })
      .eq('id', sessionId);

    if (err) {
      setError(err.message);
      return false;
    }
    await fetchSession();
    return true;
  }

  async function findActiveSession(lineId: string): Promise<ProductionSession | null> {
    const { data } = await supabase
      .from('production_sessions')
      .select('*')
      .eq('line_id', lineId)
      .eq('organization_id', ORGANIZATION_ID)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }

  const activeStop = stops.find((s) => !s.ended_at) ?? null;

  const totalStopSeconds = stops.reduce((acc, s) => {
    if (s.duration_seconds) return acc + s.duration_seconds;
    if (!s.ended_at) {
      return acc + Math.round((Date.now() - new Date(s.started_at).getTime()) / 1000);
    }
    return acc;
  }, 0);

  return {
    session,
    stops,
    activeStop,
    totalStopSeconds,
    loading,
    error,
    createSession,
    startStop,
    endStop,
    addManualStop,
    closeSession,
    findActiveSession,
    refetch: fetchSession,
  };
}
