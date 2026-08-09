'use client';

import { CheckCircle, RotateCcw } from 'lucide-react';
import type { TRSResult } from '@/lib/trs-calc';

interface ConfirmScreenProps {
  lineName: string;
  productName: string;
  duration: string;
  trs: TRSResult;
  onNewSession: () => void;
}

const LEVEL_COLORS: Record<string, string> = {
  excellent: '#22C55E',
  good: '#2563EB',
  warning: '#F59E0B',
  critical: '#EF4444',
};

const LEVEL_LABELS: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Bon',
  warning: 'Attention',
  critical: 'Critique',
};

export default function ConfirmScreen({ lineName, productName, duration, trs, onNewSession }: ConfirmScreenProps) {
  const color = LEVEL_COLORS[trs.trsLevel] ?? '#2563EB';
  const trsPct = Math.round(trs.trs * 100);

  const gaugeSize = 180;
  const strokeWidth = 14;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - trs.trs);

  return (
    <div className="flex flex-col items-center justify-center flex-1 p-8">
      <div className="flex flex-col items-center gap-6 p-10 rounded-[20px] bg-bg-card border border-border-card max-w-md w-full">
        <CheckCircle className="w-20 h-20 text-success" />
        <h1 className="text-2xl font-bold text-text">Session clôturée</h1>

        <div className="w-full space-y-2">
          <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
            <span className="text-sm text-text-secondary">Ligne</span>
            <span className="text-sm font-semibold text-text">{lineName}</span>
          </div>
          <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
            <span className="text-sm text-text-secondary">Produit</span>
            <span className="text-sm font-semibold text-text">{productName}</span>
          </div>
          <div className="flex justify-between px-4 py-3 rounded-xl bg-bg-main border border-border-card">
            <span className="text-sm text-text-secondary">Durée</span>
            <span className="text-sm font-semibold text-text">{duration}</span>
          </div>
        </div>

        <div className="relative" style={{ width: gaugeSize, height: gaugeSize }}>
          <svg width={gaugeSize} height={gaugeSize} className="-rotate-90">
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              fill="none"
              stroke="#1E293B"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={gaugeSize / 2}
              cy={gaugeSize / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-text">{trsPct}%</span>
            <span className="text-sm font-medium" style={{ color }}>
              {LEVEL_LABELS[trs.trsLevel] ?? ''}
            </span>
          </div>
        </div>

        <button
          onClick={onNewSession}
          className="w-full h-14 rounded-2xl bg-primary text-white font-semibold text-[17px] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-5 h-5" />
          Nouveau pointage
        </button>
      </div>
    </div>
  );
}
