export interface Hub {
  id: string;
  name: string;
  location_tag: string;
  total_guns: number;
  active_guns: number;
  distance_km: number;
  transformer_capacity_kw: number;
  transformer_load_kw: number;
  thermal_state_pct: number;
  ambient_temp_c: number;
  base_tariff_inr: number;
  reliability_score: number;
  current_queue_count: number;
  predicted_queue_15m: number;
  estimated_wait_min: number;
  congestion_level: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
}

export interface EVSEGun {
  id: string;
  hub_id: string;
  gun_number: number;
  max_power_kw: number;
  current_power_kw: number;
  status: 'AVAILABLE' | 'CHARGING' | 'DEGRADED' | 'SERVICE_REQUIRED';
  reliability_score: number;
  active_session_id?: string;
  heartbeat_latency_ms: number;
  power_jitter_kw: number;
  error_count_last_hr: number;
}

export interface EVSession {
  id: string;
  vehicle_model: string;
  battery_capacity_kwh: number;
  initial_soc: number;
  current_soc: number;
  target_soc: number;
  allocated_power_kw: number;
  urgency: 'CRITICAL' | 'MEDIUM' | 'LOW';
  phase: 'CC_PHASE' | 'CV_PHASE';
  energy_delivered_kwh: number;
  total_cost_inr: number;
  current_tariff_inr: number;
  estimated_time_to_80_min: number;
  estimated_time_to_target_min: number;
  hub_id: string;
  gun_id: string;
  is_phantom_assigned?: boolean;
  co2_emitted_kg?: number;
  co2_avoided_kg?: number;
}

export interface DriverInput {
  current_location: string;
  vehicle_model: string;
  current_soc: number;
  target_soc: number;
  preferred_speed: string;
}

export interface HubRecommendation {
  hub_id: string;
  hub_name: string;
  distance_km: number;
  wait_min: number;
  charging_duration_min: number;
  total_cost_inr: number;
  reliability_score: number;
  composite_score: number;
  reason: string;
  is_best_option: boolean;
  savings_vs_nearest_inr: number;
  wait_savings_vs_nearest_min: number;
  co2_avoided_kg?: number;
  green_charging_pct?: number;
}

export interface RecommendationResponse {
  driver_input: DriverInput;
  best_recommendation: HubRecommendation;
  all_recommendations: HubRecommendation[];
  explanation: string;
}

export interface TransformerStatus {
  transformer_id: string;
  capacity_kw: number;
  current_load_kw: number;
  thermal_state_pct: number;
  safe_headroom_kw: number;
  ambient_temp_c: number;
  thermal_constraint_active: boolean;
  why_explanation: string;
}

export interface OCPPMessage {
  timestamp: string;
  message_id: string;
  action: string;
  evse_id: string;
  payload: any;
  summary: string;
}

export interface AIDecisionEvent {
  timestamp: string;
  category: 'RECOMMENDATION' | 'OPTIMIZATION' | 'THERMAL_HEADROOM' | 'RELIABILITY_ANOMALY' | 'REROUTE' | 'PHANTOM_SLOT';
  action: string;
  target_id: string;
  why_reason: string;
}

export interface PhantomSlotStatus {
  is_active: boolean;
  original_driver_id: string;
  reserved_time: string;
  expected_arrival_time: string;
  actual_arrival_time: string;
  delay_min: number;
  threshold_min: number;
  reserved_hub_name: string;
  reserved_gun_id: string;
  status_label: string;
  temporary_ev_id: string;
  temporary_ev_soc: number;
  temporary_topup_min: number;
  reservation_protected: boolean;
  why_explanation: string;
}

export interface LiveMetrics {
  baseline_wait_min: number;
  hyperflow_wait_min: number;
  wait_reduction_pct: number;
  baseline_utilization_pct: number;
  hyperflow_utilization_pct: number;
  utilization_improvement_pct: number;
  overload_events_avoided: number;
  average_cost_savings_inr: number;
  reroutes_count: number;
  phantom_recoveries_count: number;
  failed_chargers_count: number;
  total_energy_delivered_kwh?: number;
  total_co2_emitted_kg?: number;
  total_co2_avoided_kg?: number;
  network_green_charging_pct?: number;
  phantom_slot?: PhantomSlotStatus;
}

export interface PowerAllocationItem {
  session_id: string;
  vehicle_model: string;
  soc_pct: number;
  power_before_kw: number;
  power_after_kw: number;
  priority_level: 'CRITICAL' | 'MEDIUM' | 'LOW';
  ai_action: 'BOOSTED' | 'THROTTLED' | 'MAINTAINED';
  why_reason: string;
}

export type ReservationStatus =
  | 'RESERVED'
  | 'ARRIVED'
  | 'QUEUED'
  | 'CHARGING'
  | 'COMPLETED'
  | 'LATE'
  | 'PHANTOM_ACTIVE'
  | 'CANCELLED';

export interface Reservation {
  reservation_id: string;
  driver_id: string;
  hub_id: string;
  hub_name: string;
  gun_id: string | null;
  vehicle_model: string;
  reservation_date: string;   // YYYY-MM-DD
  arrival_time: string;
  target_soc: number;
  status: ReservationStatus;
  created_at: string;
  expected_arrival_time: string;
  actual_arrival_time: string;
  delay_min: number;
  phantom_active: boolean;
  phantom_ev_id: string;
  phantom_topup_min: number;
  reservation_protected: boolean;
}

export interface BookingRequest {
  hub_id: string;
  vehicle_model: string;
  reservation_date: string;   // YYYY-MM-DD
  arrival_time: string;
  target_soc: number;
  driver_id?: string;
}

export interface SlotAvailability {
  hub_id: string;
  hub_name: string;
  date: string;
  time_slot: string;
  status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE';
  reservation_id: string | null;
}
