"""
Pydantic schemas for HyperFlow AI software-only EV charging orchestration platform.
Python 3.10 compatible.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class VehicleProfile(BaseModel):
    name: str
    battery_capacity_kwh: float
    max_dc_power_kw: float
    charging_efficiency: float = 0.92

class Hub(BaseModel):
    id: str
    name: str
    location_tag: str
    total_guns: int
    active_guns: int
    distance_km: float
    transformer_capacity_kw: float
    transformer_load_kw: float
    thermal_state_pct: float
    ambient_temp_c: float
    base_tariff_inr: float
    reliability_score: float
    current_queue_count: int
    predicted_queue_15m: int
    estimated_wait_min: float
    congestion_level: str  # LOW, MODERATE, HIGH, CRITICAL

class EVSEGun(BaseModel):
    id: str
    hub_id: str
    gun_number: int
    max_power_kw: float
    current_power_kw: float
    status: str  # AVAILABLE, CHARGING, DEGRADED, SERVICE_REQUIRED
    reliability_score: float
    active_session_id: Optional[str] = None
    heartbeat_latency_ms: float = 45.0
    power_jitter_kw: float = 0.2
    error_count_last_hr: int = 0

class EVSession(BaseModel):
    id: str
    vehicle_model: str
    battery_capacity_kwh: float
    initial_soc: float
    current_soc: float
    target_soc: float
    allocated_power_kw: float
    urgency: str  # CRITICAL, MEDIUM, LOW
    phase: str  # CC_PHASE, CV_PHASE
    energy_delivered_kwh: float
    total_cost_inr: float
    current_tariff_inr: float
    estimated_time_to_80_min: float
    estimated_time_to_target_min: float
    hub_id: str
    gun_id: str
    is_phantom_assigned: bool = False
    driver_arrival_delay_min: float = 0.0
    co2_emitted_kg: float = 0.0
    co2_avoided_kg: float = 0.0

class DriverInput(BaseModel):
    current_location: str = "Tech Corridor"
    vehicle_model: str = "Tata Nexon EV"
    current_soc: float = Field(..., ge=1, le=99)
    target_soc: float = Field(default=80.0, ge=20, le=100)
    preferred_speed: str = "FAST"  # FAST, BALANCED, ECO

class HubRecommendation(BaseModel):
    hub_id: str
    hub_name: str
    distance_km: float
    wait_min: float
    charging_duration_min: float
    total_cost_inr: float
    reliability_score: float
    composite_score: float
    reason: str
    is_best_option: bool
    savings_vs_nearest_inr: float = 0.0
    wait_savings_vs_nearest_min: float = 0.0
    co2_avoided_kg: float = 0.0
    green_charging_pct: float = 65.0

class RecommendationResponse(BaseModel):
    driver_input: DriverInput
    best_recommendation: HubRecommendation
    all_recommendations: List[HubRecommendation]
    explanation: str

class PowerAllocationItem(BaseModel):
    session_id: str
    vehicle_model: str
    soc_pct: float
    power_before_kw: float
    power_after_kw: float
    priority_level: str  # CRITICAL, MEDIUM, LOW
    ai_action: str  # BOOSTED, THROTTLED, MAINTAINED
    why_reason: str

class TransformerStatus(BaseModel):
    transformer_id: str = "TRANSFORMER-HUB-04"
    capacity_kw: float
    current_load_kw: float
    thermal_state_pct: float
    safe_headroom_kw: float
    ambient_temp_c: float
    thermal_constraint_active: bool
    why_explanation: str

class OCPPMessage(BaseModel):
    timestamp: str
    message_id: str
    action: str  # SetChargingProfile, TransactionEvent, StatusNotification, Heartbeat
    evse_id: str
    payload: Dict[str, Any]
    summary: str

class AIDecisionEvent(BaseModel):
    timestamp: str
    category: str  # RECOMMENDATION, OPTIMIZATION, THERMAL_HEADROOM, RELIABILITY_ANOMALY, REROUTE, PHANTOM_SLOT
    action: str
    target_id: str
    why_reason: str

class SimulationScenarioRequest(BaseModel):
    scenario: str  # NORMAL, PEAK_DEMAND, CC_CV_CONGESTION, GRID_SURGE, CHARGER_FAILURE, DRIVER_DELAY, HIGH_TEMP, RESET

class PhantomSlotStatus(BaseModel):
    is_active: bool = False
    original_driver_id: str = "EV-08 (Driver A)"
    reserved_time: str = "15:00"
    expected_arrival_time: str = "15:00"
    actual_arrival_time: str = "15:12"
    delay_min: float = 12.0
    threshold_min: float = 8.0
    reserved_hub_name: str = "Hub B — Guindy Metro"
    reserved_gun_id: str = "gun-hub-b-1"
    status_label: str = "PHANTOM SLOT ACTIVE"
    temporary_ev_id: str = "EV-17 (Waiting)"
    temporary_ev_soc: float = 14.0
    temporary_topup_min: float = 8.0
    reservation_protected: bool = True
    why_explanation: str = "Unused reserved capacity temporarily allocated to EV-17 while original reservation remains 100% protected."

class LiveMetrics(BaseModel):
    baseline_wait_min: float
    hyperflow_wait_min: float
    wait_reduction_pct: float
    baseline_utilization_pct: float
    hyperflow_utilization_pct: float
    utilization_improvement_pct: float
    overload_events_avoided: int
    average_cost_savings_inr: float
    reroutes_count: int
    phantom_recoveries_count: int
    failed_chargers_count: int
    total_energy_delivered_kwh: float = 842.0
    total_co2_emitted_kg: float = 378.9
    total_co2_avoided_kg: float = 235.8
    network_green_charging_pct: float = 64.0
    phantom_slot: Optional[PhantomSlotStatus] = None


class Reservation(BaseModel):
    """Represents a driver's charged slot reservation in the system."""
    reservation_id: str
    driver_id: str                      # e.g. "EV-08"
    hub_id: str
    hub_name: str
    gun_id: Optional[str] = None        # assigned on arrival
    vehicle_model: str
    reservation_date: str = ""          # YYYY-MM-DD date of reservation
    arrival_time: str                   # HH:MM format
    target_soc: float = 80.0
    status: str = "RESERVED"           # RESERVED|ARRIVED|QUEUED|CHARGING|COMPLETED|LATE|PHANTOM_ACTIVE|CANCELLED
    created_at: str = ""
    # Phantom-Slot fields (populated on simulate_late_arrival)
    expected_arrival_time: str = ""
    actual_arrival_time: str = ""
    delay_min: float = 0.0
    phantom_active: bool = False
    phantom_ev_id: str = ""
    phantom_topup_min: float = 0.0
    reservation_protected: bool = True


class BookingRequest(BaseModel):
    hub_id: str
    vehicle_model: str
    reservation_date: str              # YYYY-MM-DD
    arrival_time: str                  # HH:MM
    target_soc: float = 80.0
    driver_id: Optional[str] = None    # auto-generated if missing


class SlotAvailability(BaseModel):
    """Availability status for a specific slot on a given date."""
    hub_id: str
    hub_name: str
    date: str                          # YYYY-MM-DD
    time_slot: str                     # HH:MM
    status: str                        # AVAILABLE | BOOKED | UNAVAILABLE
    reservation_id: Optional[str] = None
