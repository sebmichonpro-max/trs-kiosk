'use client';

import { Check } from 'lucide-react';

interface DailyTargetBarProps {
  produced: number;
  target: number;
  unitLabel: string;
}

export default function DailyTargetBar({ produced, target, unitLabel }: DailyTargetBarProps) {
  if (target <= 0) return null;

  const pct = Math.min((produced / target) * 100, 100);
  const reached = produced >= target;

  return (
    <div className="px-6 py-3 bg-bg-card border-b border-border-card">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-4 rounded-full bg-border-card overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${reached ? 'bg-success' : 'bg-primary'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap min-w-[180px] justify-end">
          {reached && <Check className="w-5 h-5 text-success" />}
          <span className={reached ? 'text-success' : 'text-text'}>
            {produced} / {target} {unitLabel}s
          </span>
        </div>
      </div>
    </div>
  );
}
