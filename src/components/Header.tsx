'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Microscope, BarChart3 } from 'lucide-react';

interface HeaderProps {
  lineName?: string;
  productName?: string;
  onBack?: () => void;
  onSMED?: () => void;
  onQualityControl?: () => void;
  onCheckpoint?: () => void;
  showSMED?: boolean;
  showActions?: boolean;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function Header({ lineName, productName, onBack, onSMED, onQualityControl, onCheckpoint, showSMED, showActions = true }: HeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border-card bg-white">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 rounded-2xl bg-bg-main border border-border-card active:bg-primary/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-text" />
          </button>
        )}
        <div className="text-4xl font-bold text-text leading-none" style={{ fontSize: 40 }}>
          {formatTime(now)}
        </div>
      </div>

      {(lineName || productName) && (
        <div className="flex items-center gap-2 text-lg">
          {lineName && <span className="font-semibold text-text">{lineName}</span>}
          {lineName && productName && <span className="text-text-secondary">—</span>}
          {productName && <span className="font-medium text-primary">{productName}</span>}
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-2">
          {showSMED && onSMED && (
            <button
              onClick={onSMED}
              className="flex items-center gap-2 h-12 px-5 rounded-2xl bg-warning text-text font-semibold active:scale-[0.97] transition-all text-sm"
            >
              <RefreshCw className="w-5 h-5" />
              Changement
            </button>
          )}
          {onQualityControl && (
            <button
              onClick={onQualityControl}
              className="flex items-center gap-2 h-12 px-4 rounded-2xl bg-primary/10 text-primary font-semibold active:scale-[0.97] transition-all text-sm border border-primary/20"
            >
              <Microscope className="w-5 h-5" />
            </button>
          )}
          {onCheckpoint && (
            <button
              onClick={onCheckpoint}
              className="flex items-center gap-2 h-12 px-4 rounded-2xl bg-primary/10 text-primary font-semibold active:scale-[0.97] transition-all text-sm border border-primary/20"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </header>
  );
}
