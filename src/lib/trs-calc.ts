import type { TRSThresholds } from './types';

export interface TRSInput {
  sessionStartedAt: Date;
  sessionEndedAt: Date;
  totalStopSeconds: number;
  plannedStopSeconds: number;
  qtyProduced: number;
  qtyConforming: number;
  cycleTimeMs: number;
}

export interface TRSResult {
  availability: number;
  performance: number;
  quality: number;
  trs: number;
  trsLevel: 'excellent' | 'good' | 'warning' | 'critical';
}

export function calculateTRS(input: TRSInput, thresholds: TRSThresholds): TRSResult {
  const totalSeconds = (input.sessionEndedAt.getTime() - input.sessionStartedAt.getTime()) / 1000;
  const requiredTime = totalSeconds - input.plannedStopSeconds;
  const operatingTime = requiredTime - (input.totalStopSeconds - input.plannedStopSeconds);

  const availability = requiredTime > 0 ? operatingTime / requiredTime : 0;

  const theoreticalQty = input.cycleTimeMs > 0 ? (operatingTime * 1000) / input.cycleTimeMs : 0;
  const performance = theoreticalQty > 0 ? input.qtyProduced / theoreticalQty : 0;

  const quality = input.qtyProduced > 0 ? input.qtyConforming / input.qtyProduced : 0;

  const trs = availability * performance * quality;
  const trsBasisPoints = Math.round(trs * 10000);

  let trsLevel: TRSResult['trsLevel'] = 'critical';
  if (trsBasisPoints >= thresholds.excellent_min) trsLevel = 'excellent';
  else if (trsBasisPoints >= thresholds.good_min) trsLevel = 'good';
  else if (trsBasisPoints >= thresholds.warning_min) trsLevel = 'warning';

  return {
    availability: Math.min(Math.max(availability, 0), 1),
    performance: Math.min(Math.max(performance, 0), 1),
    quality: Math.min(Math.max(quality, 0), 1),
    trs: Math.min(Math.max(trs, 0), 1),
    trsLevel,
  };
}
