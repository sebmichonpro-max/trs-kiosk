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
  theoretical_weight: number | null;
  weight_tolerance_percent: number | null;
  o2_threshold_warning: number | null;
  o2_threshold_critical: number | null;
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

export interface ProductionCheckpoint {
  id: string;
  organization_id: string;
  session_id: string;
  good_quantity: number;
  reject_quantity: number;
  comment: string | null;
  created_at: string;
}

export interface ShopFloorMessage {
  id: string;
  organization_id: string;
  message: string;
  priority: 'info' | 'urgent';
  target: 'all' | 'trs' | 'pointage';
  target_line_id: string | null;
  sent_by: string | null;
  is_read: boolean;
  created_at: string;
}

export interface DailyProductionTarget {
  id: string;
  organization_id: string;
  line_id: string;
  product_id: string;
  target_date: string;
  target_quantity: number;
  created_by: string | null;
  created_at: string;
}

export interface QualityControl {
  id: string;
  organization_id: string;
  session_id: string;
  line_id: string;
  product_id: string;
  control_type: 'o2' | 'weight' | 'combined';
  o2_level: number | null;
  o2_conformity: boolean | null;
  weight_average: number | null;
  weight_min: number | null;
  weight_max: number | null;
  weight_std_dev: number | null;
  weight_out_of_tolerance: number | null;
  theoretical_weight: number | null;
  tolerance_percent: number | null;
  comment: string | null;
  controlled_at: string;
}

export interface QualityControlWeight {
  id: string;
  control_id: string;
  position: number;
  weight: number;
  is_conforming: boolean;
}

export interface QuantityEntry {
  timestamp: string;
  goodQty: number;
  rejectQty: number;
}
