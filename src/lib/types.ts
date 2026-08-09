export interface ProductionLine {
  id: string;
  organization_id: string;
  name: string;
  hourly_cost_cents: number | null;
  is_active: boolean;
}

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  cycle_time_ms: number;
  unit_label: string;
  is_active: boolean;
}

export interface LineProduct {
  line_id: string;
  product_id: string;
  cycle_time_override_ms: number | null;
}

export interface StopCause {
  id: string;
  organization_id: string;
  name: string;
  category: 'availability' | 'performance' | 'quality';
  icon: string | null;
  display_order: number;
  is_planned: boolean;
  is_active: boolean;
}

export interface TRSThresholds {
  organization_id: string;
  excellent_min: number;
  good_min: number;
  warning_min: number;
}

export interface OpeningHours {
  organization_id: string;
  line_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface ProductionSession {
  id: string;
  organization_id: string;
  line_id: string;
  product_id: string;
  started_at: string;
  ended_at: string | null;
  qty_produced: number | null;
  qty_conforming: number | null;
  cycle_time_used_ms: number | null;
  trs: number | null;
  availability: number | null;
  performance: number | null;
  quality: number | null;
  trs_level: 'excellent' | 'good' | 'warning' | 'critical' | null;
  daily_target: number | null;
  status: 'active' | 'completed' | 'cancelled' | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductionStop {
  id: string;
  organization_id: string;
  session_id: string;
  cause_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  notes: string | null;
  created_at: string;
}

export interface QuantityEntry {
  timestamp: string;
  goodQty: number;
  rejectQty: number;
}
