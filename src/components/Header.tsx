'use client';

import { useEffect, useState } from 'react';
import { Factory, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  lineName?: string;
  onBack?: () => void;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Header({ lineName, onBack }: HeaderProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-border-card bg-white/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center w-14 h-14 rounded-2xl bg-bg-card border border-border-card active:bg-primary/20 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-text" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <Factory className="w-7 h-7 text-primary" />
          <span className="text-xl font-bold text-text tracking-tight">
            PROD&apos;PULSE
          </span>
          <span className="text-sm font-medium text-primary">Kiosk</span>
        </div>
        {lineName && (
          <div className="ml-4 px-4 py-1.5 rounded-xl bg-primary/15 border border-primary/30">
            <span className="text-sm font-semibold text-primary">{lineName}</span>
          </div>
        )}
      </div>
      <div className="text-right">
        <div className="text-5xl font-bold text-text leading-none" style={{ fontSize: 48 }}>
          {formatTime(now)}
        </div>
        <div className="text-sm text-text-secondary mt-1 capitalize">
          {formatDate(now)}
        </div>
      </div>
    </header>
  );
}
