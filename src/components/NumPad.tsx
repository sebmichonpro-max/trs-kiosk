'use client';

import { Delete } from 'lucide-react';

interface NumPadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  unit?: string;
}

export default function NumPad({ value, onChange, label, unit }: NumPadProps) {
  function handleKey(key: string) {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
    } else if (key === 'clear') {
      onChange('');
    } else if (key === '.') {
      if (value.includes('.')) return;
      onChange(value === '' ? '0.' : value + '.');
    } else {
      if (value.length >= 8) return;
      onChange(value + key);
    }
  }

  const numKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const;
  const bottomKeys = ['clear', '0', '.', 'backspace'] as const;

  return (
    <div className="flex flex-col gap-3">
      {label && (
        <label className="text-[13px] font-medium text-text-secondary">{label}</label>
      )}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-bg-main border border-border-card min-h-[56px]">
        <span className="flex-1 text-4xl font-bold text-text" style={{ fontSize: 36 }}>
          {value || '0'}
        </span>
        {unit && <span className="text-sm text-text-secondary">{unit}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {numKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className="flex items-center justify-center rounded-2xl font-semibold text-[17px] active:scale-95 transition-transform bg-bg-card border border-border-card text-text hover:border-primary/40"
            style={{ minWidth: 72, minHeight: 58 }}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {bottomKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className={`
              flex items-center justify-center rounded-2xl font-semibold text-[17px]
              active:scale-95 transition-transform
              ${key === 'clear'
                ? 'bg-danger/15 text-danger border border-danger/30'
                : key === 'backspace'
                ? 'bg-bg-card border border-border-card text-text-secondary'
                : 'bg-bg-card border border-border-card text-text hover:border-primary/40'
              }
            `}
            style={{ minHeight: 58 }}
          >
            {key === 'backspace' ? (
              <Delete className="w-6 h-6" />
            ) : key === 'clear' ? (
              'C'
            ) : key === '.' ? (
              ','
            ) : (
              key
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
