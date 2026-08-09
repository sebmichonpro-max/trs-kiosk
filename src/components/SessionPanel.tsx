'use client';

import { useEffect, useState } from 'react';
import { OctagonX, Play, Clock, Factory, Package } from 'lucide-react';
import type { ProductionStop } from '@/lib/types';

interface SessionPanelProps {
  lineName: string;
  productName: string;
  startedAt: string;
  activeStop: ProductionStop | null;
  onStopClick: () => void;
  onResumeClick: () => void;
  onCloseSession: () => void;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionPanel({
  lineName,
  productName,
  startedAt,
  activeStop,
  onStopClick,
  onResumeClick,
  onCloseSession,
}: SessionPanelProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    function tick() {
      setElapsed(Math.round((Date.now() - new Date(startedAt).getTime()) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const isStopped = !!activeStop;

  return (
    <div className="flex flex-col gap-5 flex-1">
      <div className="p-6 rounded-[20px] bg-bg-card border border-border-card">
        <div className="flex items-center justify-between mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
            isStopped
              ? 'bg-danger/15 text-danger animate-pulse-stop'
              : 'bg-success/15 text-success'
          }`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isStopped ? 'bg-danger' : 'bg-success'}`} />
            {isStopped ? 'EN ARRÊT' : 'EN PRODUCTION'}
          </div>
          <div className="flex items-center gap-1 text-text-secondary text-sm">
            <Clock className="w-4 h-4" />
            Début : {new Date(startedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="text-6xl font-bold text-text leading-none" style={{ fontSize: 64 }}>
            {formatElapsed(elapsed)}
          </div>
          <p className="text-sm text-text-secondary mt-2">Temps écoulé</p>
        </div>

        <div className="flex gap-3 mb-5">
          <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl bg-bg-main border border-border-card">
            <Factory className="w-4 h-4 text-primary" />
            <span className="text-sm text-text truncate">{lineName}</span>
          </div>
          <div className="flex items-center gap-2 flex-1 px-4 py-3 rounded-xl bg-bg-main border border-border-card">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-sm text-text truncate">{productName}</span>
          </div>
        </div>

        {isStopped ? (
          <button
            onClick={onResumeClick}
            className="w-full h-16 rounded-2xl bg-success text-white font-bold text-xl active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <Play className="w-7 h-7 fill-white" />
            REPRISE
          </button>
        ) : (
          <button
            onClick={onStopClick}
            className="w-full h-16 rounded-2xl bg-danger text-white font-bold text-xl active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <OctagonX className="w-7 h-7" />
            ARRÊT
          </button>
        )}
      </div>

      <button
        onClick={onCloseSession}
        className="h-14 rounded-2xl bg-bg-card border border-border-card text-text-secondary font-semibold text-[17px] hover:border-warning/40 active:scale-[0.97] transition-all"
      >
        Clôturer la session
      </button>
    </div>
  );
}
