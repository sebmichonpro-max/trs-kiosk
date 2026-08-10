'use client';

import { useEffect, useState } from 'react';
import { Factory, Play } from 'lucide-react';
import type { ProductionLine } from '@/lib/types';
import { supabase, ORGANIZATION_ID } from '@/lib/supabase';

interface LineSelectorProps {
  lines: ProductionLine[];
  onSelect: (line: ProductionLine, activeSessionId: string | null) => void;
}

export default function LineSelector({ lines, onSelect }: LineSelectorProps) {
  const [activeSessions, setActiveSessions] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchActive() {
      const { data } = await supabase
        .from('production_sessions')
        .select('id, line_id')
        .eq('organization_id', ORGANIZATION_ID)
        .is('ended_at', null);

      if (data) {
        const map: Record<string, string> = {};
        for (const s of data) {
          map[s.line_id] = s.id;
        }
        setActiveSessions(map);
      }
    }
    fetchActive();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-text-secondary mb-5">
        Sélectionnez une ligne de production
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {lines.map((line) => {
          const hasSession = !!activeSessions[line.id];
          return (
            <button
              key={line.id}
              onClick={() => onSelect(line, activeSessions[line.id] ?? null)}
              className={`
                relative flex flex-col items-center justify-center gap-3
                p-6 rounded-[20px] border transition-colors active:scale-[0.97]
                min-h-[140px]
                ${hasSession
                  ? 'bg-success/10 border-success/40'
                  : 'bg-bg-card border-border-card'
                }
              `}
            >
              <Factory className={`w-10 h-10 ${hasSession ? 'text-success' : 'text-primary'}`} />
              <span className="text-[17px] font-semibold text-text">{line.name}</span>
              {hasSession && (
                <div className="flex items-center gap-1.5 text-xs font-medium text-success">
                  <Play className="w-3 h-3 fill-success" />
                  Session en cours
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
