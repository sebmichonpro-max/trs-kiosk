'use client';

interface GaugeProps {
  value: number | null;
  label: string;
  color: string;
  size?: number;
}

function Gauge({ value, label, color, size = 120 }: GaugeProps) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const displayValue = value !== null ? Math.round(value * 100) : null;
  const offset = value !== null
    ? circumference * (1 - Math.min(value, 1))
    : circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
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
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-text" style={{ fontSize: 24 }}>
            {displayValue !== null ? `${displayValue}%` : '—'}
          </span>
        </div>
      </div>
      <span className="text-[13px] font-medium text-text-secondary">{label}</span>
    </div>
  );
}

interface TRSGaugesProps {
  availability: number | null;
  performance: number | null;
  quality: number | null;
  trs: number | null;
}

export default function TRSGauges({ availability, performance, quality, trs }: TRSGaugesProps) {
  return (
    <div className="p-6 rounded-[20px] bg-bg-card border border-border-card">
      <h3 className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">
        TRS Temps réel
      </h3>
      <div className="flex justify-center mb-6">
        <Gauge value={trs} label="TRS Global" color="#2d5a3d" size={140} />
      </div>
      <div className="flex justify-around">
        <Gauge value={availability} label="Disponibilité" color="#22C55E" size={100} />
        <Gauge value={performance} label="Performance" color="#A855F7" size={100} />
        <Gauge value={quality} label="Qualité" color="#F59E0B" size={100} />
      </div>
    </div>
  );
}
