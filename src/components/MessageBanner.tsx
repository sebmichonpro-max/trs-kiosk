'use client';

import { X, AlertTriangle, Info } from 'lucide-react';
import type { ShopFloorMessage } from '@/lib/types';

interface MessageBannerProps {
  messages: ShopFloorMessage[];
  onDismiss: (id: string) => void;
}

export default function MessageBanner({ messages, onDismiss }: MessageBannerProps) {
  if (messages.length === 0) return null;

  return (
    <div className="flex flex-col">
      {messages.map((msg) => {
        const isUrgent = msg.priority === 'urgent';
        return (
          <div
            key={msg.id}
            className={`flex items-center gap-3 px-6 py-3 ${
              isUrgent
                ? 'bg-danger/10 border-b border-danger/20'
                : 'bg-warning/10 border-b border-warning/20'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-5 h-5 text-danger shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-warning shrink-0" />
            )}
            <p className={`flex-1 text-sm font-medium ${isUrgent ? 'text-danger' : 'text-text'}`}>
              {msg.message}
            </p>
            <span className="text-xs text-text-secondary shrink-0">
              {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              onClick={() => onDismiss(msg.id)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg shrink-0 active:scale-95 ${
                isUrgent ? 'hover:bg-danger/20' : 'hover:bg-warning/20'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
