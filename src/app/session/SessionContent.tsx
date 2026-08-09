'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DailyTargetBar from '@/components/DailyTargetBar';
import TRSGauges from '@/components/TRSGauges';
import QuantityPanel from '@/components/QuantityPanel';
import StopOverlay from '@/components/StopOverlay';
import StopModal from '@/components/StopModal';
import SMEDModal from '@/components/SMEDModal';
import CloseSessionModal from '@/components/CloseSessionModal';
import { useSession } from '@/hooks/useSession';
import { useProducts } from '@/hooks/useProducts';
import { useStopCauses } from '@/hooks/useStopCauses';
import { useThresholds } from '@/hooks/useThresholds';
import { supabase } from '@/lib/supabase';
import type { QuantityEntry } from '@/lib/types';
import { OctagonX, Square } from 'lucide-react';

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}min`;
}

export default function SessionContent() {
  const params = useSearchParams();
  const router = useRouter();
  const sessionId = params.get('id');
  const lineId = params.get('line');
  const lineNameParam = params.get('lineName') ?? '';
  const productNameParam = params.get('productName') ?? '';

  const {
    session,
    stops,
    activeStop,
    totalStopSeconds,
    startStop,
    endStop,
    updateQuantities,
    updateSessionProduct,
    closeSession,
  } = useSession(sessionId);

  const { causes } = useStopCauses();
  const { thresholds } = useThresholds();
  const { products } = useProducts(lineId);

  const [showStopModal, setShowStopModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSMEDModal, setShowSMEDModal] = useState(false);
  const [smedStartedAt, setSmedStartedAt] = useState<Date | null>(null);
  const [smedStopId, setSmedStopId] = useState<string | null>(null);

  const [lineName, setLineName] = useState(lineNameParam);
  const [productName, setProductName] = useState(productNameParam);

  const [entries, setEntries] = useState<QuantityEntry[]>([]);
  const [trsAlertDismissed, setTrsAlertDismissed] = useState(false);

  // Load quantity entries from localStorage
  useEffect(() => {
    if (!sessionId) return;
    try {
      const stored = localStorage.getItem(`qty_entries_${sessionId}`);
      if (stored) setEntries(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [sessionId]);

  // Fetch line/product names if not in URL
  useEffect(() => {
    async function fetchNames() {
      if (!session) return;
      if (!lineName && session.line_id) {
        const { data } = await supabase
          .from('production_lines')
          .select('name')
          .eq('id', session.line_id)
          .single();
        if (data) setLineName(data.name);
      }
      if (!productName && session.product_id) {
        const { data } = await supabase
          .from('pp_products')
          .select('name')
          .eq('id', session.product_id)
          .single();
        if (data) setProductName(data.name);
      }
    }
    fetchNames();
  }, [session, lineName, productName]);

  // Update product name when SMED changes product
  useEffect(() => {
    if (!session) return;
    const product = products.find((p) => p.id === session.product_id);
    if (product && product.name !== productName) {
      setProductName(product.name);
    }
  }, [session?.product_id, products, productName, session]);

  // Live clock tick
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Live TRS calculation
  const liveTRS = useMemo(() => {
    if (!session) return { availability: null, performance: null, quality: null, trs: null };
    const totalSec = (now - new Date(session.started_at).getTime()) / 1000;
    if (totalSec <= 0) return { availability: null, performance: null, quality: null, trs: null };

    const availability = Math.max(0, Math.min(1, (totalSec - totalStopSeconds) / totalSec));

    const operatingSeconds = totalSec - totalStopSeconds;
    const cycleTimeMs = session.cycle_time_used_ms || 1000;
    const qtyProduced = session.qty_produced || 0;
    const qtyConforming = session.qty_conforming || 0;

    let performance: number | null = null;
    let quality: number | null = null;
    let trs: number | null = availability;

    if (qtyProduced > 0 && operatingSeconds > 0) {
      const theoreticalQty = (operatingSeconds * 1000) / cycleTimeMs;
      performance = Math.min(qtyProduced / theoreticalQty, 1);
      quality = qtyProduced > 0 ? Math.min(qtyConforming / qtyProduced, 1) : null;

      if (quality !== null) {
        trs = availability * performance * quality;
      } else {
        trs = availability * performance;
      }
    }

    return { availability, performance, quality, trs };
  }, [session, now, totalStopSeconds]);

  // TRS alert class
  const trsAlertClass = useMemo(() => {
    if (trsAlertDismissed || liveTRS.trs === null) return '';
    if (liveTRS.trs < 0.6) return 'trs-alert-red';
    if (liveTRS.trs < 0.7) return 'trs-alert-orange';
    return '';
  }, [liveTRS.trs, trsAlertDismissed]);

  // Re-enable TRS alert after 10 min
  useEffect(() => {
    if (!trsAlertDismissed) return;
    const id = setTimeout(() => setTrsAlertDismissed(false), 10 * 60 * 1000);
    return () => clearTimeout(id);
  }, [trsAlertDismissed]);

  const handleQuantitySubmit = useCallback(
    async (goodQty: number, rejectQty: number) => {
      const success = await updateQuantities(goodQty, rejectQty);
      if (success && sessionId) {
        const entry: QuantityEntry = {
          timestamp: new Date().toISOString(),
          goodQty,
          rejectQty,
        };
        const updated = [entry, ...entries];
        setEntries(updated);
        try {
          localStorage.setItem(`qty_entries_${sessionId}`, JSON.stringify(updated.slice(0, 20)));
        } catch { /* ignore */ }
      }
    },
    [updateQuantities, sessionId, entries]
  );

  // SMED handlers
  async function handleStartSMED() {
    const smedCause = causes.find(
      (c) => c.name.toLowerCase().includes('changement')
    );
    if (!smedCause) return;

    const smedTime = new Date();
    const ok = await startStop(smedCause.id, 'Changement de série');
    if (ok) {
      setSmedStartedAt(smedTime);
      // Find the stop we just created
      const latestStop = stops.find((s) => !s.ended_at);
      if (latestStop) setSmedStopId(latestStop.id);
      setShowSMEDModal(true);
    }
  }

  // Need to re-check smedStopId after stops update
  useEffect(() => {
    if (showSMEDModal && !smedStopId) {
      const openStop = stops.find((s) => !s.ended_at);
      if (openStop) setSmedStopId(openStop.id);
    }
  }, [stops, showSMEDModal, smedStopId]);

  async function handleSMEDConfirm(newProduct: { id: string; effective_cycle_time_ms: number } | null) {
    if (smedStopId) {
      await endStop(smedStopId);
    }
    if (newProduct) {
      await updateSessionProduct(newProduct.id, newProduct.effective_cycle_time_ms);
    }
    setShowSMEDModal(false);
    setSmedStartedAt(null);
    setSmedStopId(null);
  }

  async function handleCloseConfirm(trsValues: {
    trs: number;
    availability: number;
    performance: number;
    quality: number;
    trsLevel: string;
  }) {
    const success = await closeSession(trsValues);
    if (success) {
      router.push('/');
    }
  }

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Session introuvable
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Chargement de la session...
      </div>
    );
  }

  const elapsedSec = Math.round((now - new Date(session.started_at).getTime()) / 1000);
  const totalGood = session.qty_conforming || 0;
  const totalRejects = (session.qty_produced || 0) - totalGood;
  const unitLabel = products.find((p) => p.id === session.product_id)?.unit_label || 'pièce';

  return (
    <div
      className={`flex flex-col min-h-screen ${trsAlertClass}`}
      onClick={trsAlertClass ? () => setTrsAlertDismissed(true) : undefined}
    >
      <Header
        lineName={lineName}
        productName={productName}
        onBack={() => router.push('/')}
        onSMED={handleStartSMED}
        showSMED={!activeStop}
      />

      <DailyTargetBar
        produced={session.qty_produced || 0}
        target={session.daily_target || 0}
        unitLabel={unitLabel}
      />

      <main className="flex-1 p-4 flex flex-col gap-4">
        {activeStop ? (
          <StopOverlay
            activeStop={activeStop}
            causes={causes}
            onEndStop={() => endStop(activeStop.id)}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              <TRSGauges
                availability={liveTRS.availability}
                performance={liveTRS.performance}
                quality={liveTRS.quality}
                trs={liveTRS.trs}
              />
              <QuantityPanel
                totalGood={totalGood}
                totalRejects={totalRejects}
                elapsed={formatElapsed(elapsedSec)}
                unitLabel={unitLabel}
                entries={entries}
                onSubmit={handleQuantitySubmit}
              />
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-auto pt-4">
          {!activeStop && (
            <button
              onClick={() => setShowStopModal(true)}
              className="flex-1 h-16 rounded-2xl bg-danger text-white font-bold text-lg active:scale-[0.97] transition-all flex items-center justify-center gap-3"
            >
              <OctagonX className="w-6 h-6" />
              DÉCLARER ARRÊT
            </button>
          )}
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={!!activeStop}
            className="flex-1 h-16 rounded-2xl bg-bg-card border-2 border-border-card text-text-secondary font-bold text-lg active:scale-[0.97] transition-all flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <Square className="w-6 h-6" />
            CLÔTURER SESSION
          </button>
        </div>
      </main>

      {showStopModal && (
        <StopModal
          causes={causes}
          onDeclare={async (causeId, notes) => {
            await startStop(causeId, notes);
          }}
          onClose={() => setShowStopModal(false)}
        />
      )}

      {showSMEDModal && smedStartedAt && (
        <SMEDModal
          products={products}
          currentProductId={session.product_id}
          onConfirm={handleSMEDConfirm}
          onClose={() => {
            if (smedStopId) endStop(smedStopId);
            setShowSMEDModal(false);
            setSmedStartedAt(null);
            setSmedStopId(null);
          }}
          startedAt={smedStartedAt}
        />
      )}

      {showCloseModal && (
        <CloseSessionModal
          sessionStartedAt={session.started_at}
          cycleTimeMs={session.cycle_time_used_ms ?? 1000}
          qtyProduced={session.qty_produced || 0}
          qtyConforming={session.qty_conforming || 0}
          stops={stops}
          causes={causes}
          thresholds={thresholds}
          totalStopSeconds={totalStopSeconds}
          lineName={lineName}
          productName={productName}
          onConfirm={handleCloseConfirm}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
