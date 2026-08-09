'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import SessionPanel from '@/components/SessionPanel';
import TRSGauges from '@/components/TRSGauges';
import StopHistory from '@/components/StopHistory';
import StopModal from '@/components/StopModal';
import CloseSessionModal from '@/components/CloseSessionModal';
import ConfirmScreen from '@/components/ConfirmScreen';
import { useSession } from '@/hooks/useSession';
import { useStopCauses } from '@/hooks/useStopCauses';
import { useThresholds } from '@/hooks/useThresholds';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  return `${m} min`;
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
    addManualStop,
    closeSession,
  } = useSession(sessionId);

  const { causes } = useStopCauses();
  const { thresholds } = useThresholds();

  const [showStopModal, setShowStopModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closed, setClosed] = useState(false);
  const [closedTRS, setClosedTRS] = useState<{
    trs: number; availability: number; performance: number; quality: number; trsLevel: string;
  } | null>(null);

  const [lineName, setLineName] = useState(lineNameParam);
  const [productName, setProductName] = useState(productNameParam);

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
          .from('products')
          .select('name')
          .eq('id', session.product_id)
          .single();
        if (data) setProductName(data.name);
      }
    }
    fetchNames();
  }, [session, lineName, productName]);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const liveAvailability = useMemo(() => {
    if (!session) return null;
    const totalSec = (now - new Date(session.started_at).getTime()) / 1000;
    if (totalSec <= 0) return null;
    return Math.max(0, Math.min(1, (totalSec - totalStopSeconds) / totalSec));
  }, [session, now, totalStopSeconds]);

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center min-h-screen text-text-secondary">
        Session introuvable
      </div>
    );
  }

  if (closed && closedTRS) {
    const sessionDuration = session
      ? Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)
      : 0;

    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <ConfirmScreen
          lineName={lineName}
          productName={productName}
          duration={formatDuration(sessionDuration)}
          trs={{
            ...closedTRS,
            trsLevel: closedTRS.trsLevel as 'excellent' | 'good' | 'warning' | 'critical',
          }}
          onNewSession={() => router.push('/')}
        />
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

  async function handleResume() {
    if (activeStop) {
      await endStop(activeStop.id);
    }
  }

  async function handleCloseConfirm(
    qtyProduced: number,
    qtyNonConforming: number,
    trsValues: { trs: number; availability: number; performance: number; quality: number; trsLevel: string },
  ) {
    const success = await closeSession(qtyProduced, qtyNonConforming, trsValues);
    if (success) {
      setClosedTRS(trsValues);
      setClosed(true);
      setShowCloseModal(false);
    }
  }

  function handleOpenCloseModal() {
    if (activeStop) {
      endStop(activeStop.id).then(() => setShowCloseModal(true));
    } else {
      setShowCloseModal(true);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header lineName={lineName} onBack={() => router.push('/')} />

      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
          <div className="lg:col-span-3 flex flex-col">
            <SessionPanel
              lineName={lineName}
              productName={productName}
              startedAt={session.started_at}
              activeStop={activeStop}
              onStopClick={() => setShowStopModal(true)}
              onResumeClick={handleResume}
              onCloseSession={handleOpenCloseModal}
            />
          </div>

          <div className="lg:col-span-2 flex flex-col gap-6">
            <TRSGauges
              availability={liveAvailability}
              performance={null}
              quality={null}
              trs={liveAvailability}
            />
            <StopHistory stops={stops} causes={causes} />
          </div>
        </div>
      </main>

      {showStopModal && (
        <StopModal
          causes={causes}
          onStartRealtime={async (causeId, notes) => {
            await startStop(causeId, notes);
          }}
          onAddManual={async (causeId, dur, notes) => {
            await addManualStop(causeId, dur, notes);
          }}
          onClose={() => setShowStopModal(false)}
        />
      )}

      {showCloseModal && (
        <CloseSessionModal
          sessionStartedAt={session.started_at}
          cycleTimeMs={session.cycle_time_used_ms ?? 1000}
          stops={stops}
          causes={causes}
          thresholds={thresholds}
          totalStopSeconds={totalStopSeconds}
          onConfirm={handleCloseConfirm}
          onClose={() => setShowCloseModal(false)}
        />
      )}
    </div>
  );
}
