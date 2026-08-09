'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import DailyTargetBar from '@/components/DailyTargetBar';
import TRSGauges from '@/components/TRSGauges';
import StopOverlay from '@/components/StopOverlay';
import StopModal from '@/components/StopModal';
import SMEDModal from '@/components/SMEDModal';
import CloseSessionModal from '@/components/CloseSessionModal';
import CheckpointModal from '@/components/CheckpointModal';
import CheckpointHistory from '@/components/CheckpointHistory';
import MessageBanner from '@/components/MessageBanner';
import QualityControlModal from '@/components/QualityControlModal';
import { useSession } from '@/hooks/useSession';
import { useProducts } from '@/hooks/useProducts';
import { useStopCauses } from '@/hooks/useStopCauses';
import { useThresholds } from '@/hooks/useThresholds';
import { useCheckpoints } from '@/hooks/useCheckpoints';
import { useMessages } from '@/hooks/useMessages';
import { useDailyTarget } from '@/hooks/useDailyTarget';
import { supabase } from '@/lib/supabase';
import { OctagonX, Square, BarChart3, Microscope, Package, AlertTriangle, Clock, Zap } from 'lucide-react';

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
  const { checkpoints, addCheckpoint, totalGood: cpTotalGood, totalRejects: cpTotalRejects } = useCheckpoints(sessionId);
  const { messages, markAsRead } = useMessages(lineId);
  const { targetQuantity } = useDailyTarget(lineId, session?.product_id ?? null);

  const [showStopModal, setShowStopModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showSMEDModal, setShowSMEDModal] = useState(false);
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [smedStartedAt, setSmedStartedAt] = useState<Date | null>(null);
  const [smedStopId, setSmedStopId] = useState<string | null>(null);

  const [lineName, setLineName] = useState(lineNameParam);
  const [productName, setProductName] = useState(productNameParam);

  const [trsAlertDismissed, setTrsAlertDismissed] = useState(false);

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

  useEffect(() => {
    if (!session) return;
    const product = products.find((p) => p.id === session.product_id);
    if (product && product.name !== productName) {
      setProductName(product.name);
    }
  }, [session?.product_id, products, productName, session]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
      trs = quality !== null ? availability * performance * quality : availability * performance;
    }

    return { availability, performance, quality, trs };
  }, [session, now, totalStopSeconds]);

  const trsAlertClass = useMemo(() => {
    if (trsAlertDismissed || liveTRS.trs === null) return '';
    if (liveTRS.trs < 0.6) return 'trs-alert-red';
    if (liveTRS.trs < 0.7) return 'trs-alert-orange';
    return '';
  }, [liveTRS.trs, trsAlertDismissed]);

  useEffect(() => {
    if (!trsAlertDismissed) return;
    const id = setTimeout(() => setTrsAlertDismissed(false), 10 * 60 * 1000);
    return () => clearTimeout(id);
  }, [trsAlertDismissed]);

  const handleCheckpointSubmit = useCallback(
    async (goodQty: number, rejectQty: number, comment?: string) => {
      const success = await addCheckpoint(goodQty, rejectQty, comment);
      if (success) {
        await updateQuantities(goodQty, rejectQty);
        setShowCheckpointModal(false);
      }
    },
    [addCheckpoint, updateQuantities]
  );

  async function handleStartSMED() {
    const smedCause = causes.find((c) => c.name.toLowerCase().includes('changement'));
    if (!smedCause) return;
    const smedTime = new Date();
    const ok = await startStop(smedCause.id, 'Changement de série');
    if (ok) {
      setSmedStartedAt(smedTime);
      const latestStop = stops.find((s) => !s.ended_at);
      if (latestStop) setSmedStopId(latestStop.id);
      setShowSMEDModal(true);
    }
  }

  useEffect(() => {
    if (showSMEDModal && !smedStopId) {
      const openStop = stops.find((s) => !s.ended_at);
      if (openStop) setSmedStopId(openStop.id);
    }
  }, [stops, showSMEDModal, smedStopId]);

  async function handleSMEDConfirm(newProduct: { id: string; effective_cycle_time_ms: number } | null) {
    if (smedStopId) await endStop(smedStopId);
    if (newProduct) await updateSessionProduct(newProduct.id, newProduct.effective_cycle_time_ms);
    setShowSMEDModal(false);
    setSmedStartedAt(null);
    setSmedStopId(null);
  }

  async function handleCloseConfirm(trsValues: {
    trs: number; availability: number; performance: number; quality: number; trsLevel: string;
  }) {
    const success = await closeSession(trsValues);
    if (success) router.push('/');
  }

  if (!sessionId) {
    return <div className="flex items-center justify-center min-h-screen text-text-secondary">Session introuvable</div>;
  }
  if (!session) {
    return <div className="flex items-center justify-center min-h-screen text-text-secondary">Chargement de la session...</div>;
  }

  const elapsedSec = Math.round((now - new Date(session.started_at).getTime()) / 1000);
  const totalGood = session.qty_conforming || 0;
  const totalRejects = (session.qty_produced || 0) - totalGood;
  const currentProduct = products.find((p) => p.id === session.product_id);
  const unitLabel = currentProduct?.unit_label || 'pièce';
  const effectiveTarget = targetQuantity || session.daily_target || 0;

  const cadence = elapsedSec > 0 ? Math.round((totalGood / elapsedSec) * 3600) : 0;

  return (
    <div
      className={`flex flex-col min-h-screen ${trsAlertClass}`}
      onClick={trsAlertClass ? () => setTrsAlertDismissed(true) : undefined}
    >
      <MessageBanner messages={messages} onDismiss={markAsRead} />

      <Header
        lineName={lineName}
        productName={productName}
        onBack={() => router.push('/')}
        onSMED={handleStartSMED}
        onQualityControl={() => setShowQualityModal(true)}
        onCheckpoint={() => setShowCheckpointModal(true)}
        showSMED={!activeStop}
        showActions={!activeStop}
      />

      <DailyTargetBar
        produced={session.qty_produced || 0}
        target={effectiveTarget}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
            {/* Left: TRS Gauge */}
            <TRSGauges
              availability={liveTRS.availability}
              performance={liveTRS.performance}
              quality={liveTRS.quality}
              trs={liveTRS.trs}
            />

            {/* Right: Stats */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
                  <Package className="w-5 h-5 text-success mb-1" />
                  <span className="text-3xl font-bold text-text" style={{ fontSize: 28 }}>{totalGood}</span>
                  <span className="text-xs text-text-secondary">Bonnes pièces</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
                  <AlertTriangle className="w-5 h-5 text-danger mb-1" />
                  <span className="text-3xl font-bold text-text" style={{ fontSize: 28 }}>{totalRejects}</span>
                  <span className="text-xs text-text-secondary">Rebuts</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
                  <Clock className="w-5 h-5 text-primary mb-1" />
                  <span className="text-2xl font-bold text-text">{formatElapsed(elapsedSec)}</span>
                  <span className="text-xs text-text-secondary">Durée</span>
                </div>
                <div className="flex flex-col items-center p-4 rounded-xl bg-bg-main border border-border-card">
                  <Zap className="w-5 h-5 text-warning mb-1" />
                  <span className="text-2xl font-bold text-text">{cadence}/h</span>
                  <span className="text-xs text-text-secondary">Cadence</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <CheckpointHistory checkpoints={checkpoints} />

        {/* Action buttons */}
        <div className="flex gap-3 mt-auto pt-2">
          {!activeStop && (
            <>
              <button
                onClick={() => setShowCheckpointModal(true)}
                className="flex-1 h-16 rounded-2xl bg-primary text-white font-bold text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2 hover:bg-primary-hover"
              >
                <BarChart3 className="w-5 h-5" />
                CHECKPOINT
              </button>
              <button
                onClick={() => setShowStopModal(true)}
                className="flex-1 h-16 rounded-2xl bg-danger text-white font-bold text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <OctagonX className="w-5 h-5" />
                ARRÊT
              </button>
              <button
                onClick={() => setShowQualityModal(true)}
                className="flex-1 h-16 rounded-2xl bg-bg-card border-2 border-primary/30 text-primary font-bold text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <Microscope className="w-5 h-5" />
                QUALITÉ
              </button>
            </>
          )}
          <button
            onClick={() => setShowCloseModal(true)}
            disabled={!!activeStop}
            className="flex-1 h-16 rounded-2xl bg-bg-card border-2 border-border-card text-text-secondary font-bold text-base active:scale-[0.97] transition-all flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Square className="w-5 h-5" />
            CLÔTURER
          </button>
        </div>
      </main>

      {showStopModal && (
        <StopModal
          causes={causes}
          onDeclare={async (causeId, notes) => { await startStop(causeId, notes); }}
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

      {showCheckpointModal && (
        <CheckpointModal
          unitLabel={unitLabel}
          onSubmit={handleCheckpointSubmit}
          onClose={() => setShowCheckpointModal(false)}
        />
      )}

      {showQualityModal && lineId && (
        <QualityControlModal
          sessionId={sessionId}
          lineId={lineId}
          lineName={lineName}
          productId={session.product_id}
          productName={productName}
          theoreticalWeight={currentProduct?.theoretical_weight ?? null}
          tolerancePercent={currentProduct?.weight_tolerance_percent ?? null}
          o2ThresholdWarning={currentProduct?.o2_threshold_warning ?? null}
          o2ThresholdCritical={currentProduct?.o2_threshold_critical ?? null}
          unitLabel={unitLabel}
          onClose={() => setShowQualityModal(false)}
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
