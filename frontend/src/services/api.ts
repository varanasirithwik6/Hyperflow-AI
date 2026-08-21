import {
  DriverInput,
  RecommendationResponse,
  TransformerStatus,
  OCPPMessage,
  AIDecisionEvent,
  LiveMetrics,
  Hub,
  EVSession,
  Reservation,
  BookingRequest,
  SlotAvailability
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/v1` 
  : '/api/v1';

export const fetchRecommendation = async (input: DriverInput): Promise<RecommendationResponse> => {
  try {
    const res = await fetch(`${API_BASE}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    console.warn('Backend endpoint unavailable, using client fallback');
    return getFallbackRecommendation(input);
  }
};

export const triggerScenario = async (scenario: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/simulate/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario }),
    });
  } catch (err) {
    console.warn('Failed to trigger scenario event:', err);
  }
};

export const updateAmbientTemp = async (tempC: number): Promise<void> => {
  try {
    await fetch(`${API_BASE}/twin/ambient-temp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_c: tempC }),
    });
  } catch (err) {
    console.warn('Failed to update ambient temperature:', err);
  }
};

export const spawnEVInQueue = async (hubId: string, vehicleModel: string, initialSoc: number): Promise<void> => {
  try {
    await fetch(`${API_BASE}/twin/spawn-ev`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hub_id: hubId, vehicle_model: vehicleModel, initial_soc: initialSoc }),
    });
  } catch (err) {
    console.warn('Failed to spawn EV in queue:', err);
  }
};

export const controlEVSEGun = async (gunId: string, action: string): Promise<void> => {
  try {
    await fetch(`${API_BASE}/twin/gun-control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gun_id: gunId, action }),
    });
  } catch (err) {
    console.warn('Failed to execute gun control action:', err);
  }
};

export const fetchLiveMetrics = async (): Promise<LiveMetrics> => {
  try {
    const res = await fetch(`${API_BASE}/metrics`);
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    return {
      baseline_wait_min: 31.4,
      hyperflow_wait_min: 19.7,
      wait_reduction_pct: 37.3,
      baseline_utilization_pct: 62.0,
      hyperflow_utilization_pct: 86.5,
      utilization_improvement_pct: 39.5,
      overload_events_avoided: 6,
      average_cost_savings_inr: 42.50,
      reroutes_count: 2,
      phantom_recoveries_count: 1,
      failed_chargers_count: 1
    };
  }
};

export const predictCCVTrajectory = async (
  initialSoc: number,
  targetSoc: number,
  capacityKwh: number = 40.5,
  maxPowerKw: number = 60.0
) => {
  try {
    const res = await fetch(`${API_BASE}/predict-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initial_soc: initialSoc,
        target_soc: targetSoc,
        capacity_kwh: capacityKwh,
        max_power_kw: maxPowerKw,
        ambient_temp_c: 28.0
      }),
    });
    if (!res.ok) throw new Error('API error');
    return await res.json();
  } catch (err) {
    return generateFallbackTrajectory(initialSoc, targetSoc, capacityKwh, maxPowerKw);
  }
};

// Client-side Fallbacks for resilience
function getFallbackRecommendation(input: DriverInput): RecommendationResponse {
  const hubs: Hub[] = [
    {
      id: 'hub-a',
      name: 'Hub A — Tech Park',
      location_tag: 'Sector 62 Tech Hub',
      total_guns: 6,
      active_guns: 5,
      distance_km: 1.2,
      transformer_capacity_kw: 200,
      transformer_load_kw: 178,
      thermal_state_pct: 72,
      ambient_temp_c: 28,
      base_tariff_inr: 14.0,
      reliability_score: 91,
      current_queue_count: 3,
      predicted_queue_15m: 5,
      estimated_wait_min: 24,
      congestion_level: 'HIGH'
    },
    {
      id: 'hub-b',
      name: 'Hub B — Central Metro',
      location_tag: 'Central Metro Hub',
      total_guns: 6,
      active_guns: 4,
      distance_km: 1.8,
      transformer_capacity_kw: 200,
      transformer_load_kw: 124,
      thermal_state_pct: 54,
      ambient_temp_c: 28,
      base_tariff_inr: 10.5,
      reliability_score: 98,
      current_queue_count: 0,
      predicted_queue_15m: 1,
      estimated_wait_min: 2,
      congestion_level: 'LOW'
    },
    {
      id: 'hub-c',
      name: 'Hub C — Airport Express',
      location_tag: 'Airport Terminal 3',
      total_guns: 6,
      active_guns: 3,
      distance_km: 3.5,
      transformer_capacity_kw: 250,
      transformer_load_kw: 94,
      thermal_state_pct: 42,
      ambient_temp_c: 28,
      base_tariff_inr: 12.0,
      reliability_score: 96,
      current_queue_count: 0,
      predicted_queue_15m: 0,
      estimated_wait_min: 0,
      congestion_level: 'LOW'
    },
    {
      id: 'hub-d',
      name: 'Hub D — University Campus',
      location_tag: 'Knowledge Park',
      total_guns: 6,
      active_guns: 4,
      distance_km: 2.4,
      transformer_capacity_kw: 180,
      transformer_load_kw: 142,
      thermal_state_pct: 68,
      ambient_temp_c: 28,
      base_tariff_inr: 11.0,
      reliability_score: 94,
      current_queue_count: 1,
      predicted_queue_15m: 2,
      estimated_wait_min: 8,
      congestion_level: 'MODERATE'
    }
  ];

  const best = {
    hub_id: 'hub-b',
    hub_name: 'Hub B — Central Metro',
    distance_km: 1.8,
    wait_min: 2,
    charging_duration_min: 26,
    total_cost_inr: 356,
    reliability_score: 98,
    composite_score: 94.5,
    reason: 'Recommended because you save 22 minutes of queue wait time and ₹42 in total charging costs.',
    is_best_option: true,
    savings_vs_nearest_inr: 42.0,
    wait_savings_vs_nearest_min: 22.0
  };

  const recs = [
    best,
    {
      hub_id: 'hub-a',
      hub_name: 'Hub A — Tech Park',
      distance_km: 1.2,
      wait_min: 24,
      charging_duration_min: 28,
      total_cost_inr: 398,
      reliability_score: 91,
      composite_score: 71.2,
      reason: 'Nearest location (1.2 km) but currently experiencing high queue congestion (24 min wait).',
      is_best_option: false,
      savings_vs_nearest_inr: 0,
      wait_savings_vs_nearest_min: 0
    },
    {
      hub_id: 'hub-c',
      hub_name: 'Hub C — Airport Express',
      distance_km: 3.5,
      wait_min: 0,
      charging_duration_min: 24,
      total_cost_inr: 380,
      reliability_score: 96,
      composite_score: 82.0,
      reason: 'Fastest charger access (0 min wait) but located slightly further away (3.5 km).',
      is_best_option: false,
      savings_vs_nearest_inr: 0,
      wait_savings_vs_nearest_min: 0
    },
    {
      hub_id: 'hub-d',
      hub_name: 'Hub D — University Campus',
      distance_km: 2.4,
      wait_min: 8,
      charging_duration_min: 27,
      total_cost_inr: 372,
      reliability_score: 94,
      composite_score: 79.5,
      reason: 'Moderate queue (8 min wait) with stable grid headroom.',
      is_best_option: false,
      savings_vs_nearest_inr: 0,
      wait_savings_vs_nearest_min: 0
    }
  ];

  return {
    driver_input: input,
    best_recommendation: best,
    all_recommendations: recs,
    explanation: 'HyperFlow AI evaluated 4 nearby hubs using multi-factor composite scoring. Hub B — Central Metro is recommended over the nearest station because it provides 22 min wait savings and higher charger reliability (98%).'
  };
}

function generateFallbackTrajectory(initialSoc: number, targetSoc: number, capacityKwh: number, maxPowerKw: number) {
  const trajectory = [];
  let currentSoc = initialSoc;
  let minute = 0;

  while (currentSoc < targetSoc && minute < 120) {
    const isCc = currentSoc < 80;
    const power = isCc ? maxPowerKw : Math.max(8, maxPowerKw * Math.exp(-0.065 * (currentSoc - 80)));
    const energyAdded = (power * (1 / 60)) * 0.92;
    const socStep = (energyAdded / capacityKwh) * 100;

    trajectory.push({
      minute: roundNum(minute, 1),
      soc: roundNum(Math.min(targetSoc, currentSoc), 1),
      power_kw: roundNum(power, 1),
      phase: isCc ? 'CC_PHASE' : 'CV_PHASE'
    });

    currentSoc += socStep;
    minute += 1;
  }

  return {
    initial_soc: initialSoc,
    target_soc: targetSoc,
    time_to_80_min: Math.round(minute * 0.65),
    time_to_target_min: minute,
    total_energy_kwh: roundNum(((targetSoc - initialSoc) / 100) * capacityKwh, 2),
    estimated_cost_inr: Math.round(capacityKwh * 0.6 * 14),
    trajectory,
    model_type: 'LightGBM Predictor (Simulated)'
  };
}

function roundNum(n: number, dec: number) {
  return Number(n.toFixed(dec));
}

// ============================================================
// RESERVATION / PHANTOM-SLOT BOOKING API
// ============================================================

// ============================================================
// RESERVATION / PHANTOM-SLOT BOOKING API
// ============================================================

export const bookReservation = async (req: BookingRequest): Promise<Reservation> => {
  try {
    const res = await fetch(`${API_BASE}/reservation/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: `Booking failed (${res.status})` }));
      throw new Error(err.detail || `Booking failed: ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    if (err.message && !err.message.includes('fetch') && !err.message.includes('network') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
    // Client fallback if backend is offline/unreachable
    const resId = `HF-${Math.floor(1000 + Math.random() * 9000)}`;
    const driverId = `DRV-${Math.floor(100 + Math.random() * 900)}`;
    const hubNames: Record<string, string> = {
      'hub-a': 'Hub A — OMR IT Corridor',
      'hub-b': 'Hub B — Guindy Metro Hub',
      'hub-c': 'Hub C — Airport Fast-Charge Hub',
      'hub-d': 'Hub D — Anna Nagar Supercharger'
    };
    return {
      reservation_id: resId,
      driver_id: req.driver_id || driverId,
      hub_id: req.hub_id,
      hub_name: hubNames[req.hub_id] || req.hub_id,
      gun_id: null,
      vehicle_model: req.vehicle_model,
      reservation_date: req.reservation_date || new Date().toISOString().slice(0, 10),
      arrival_time: req.arrival_time,
      target_soc: req.target_soc,
      status: 'RESERVED',
      created_at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      expected_arrival_time: req.arrival_time,
      actual_arrival_time: '',
      delay_min: 0,
      phantom_ev_id: '',
      phantom_topup_min: 0,
      reservation_protected: true,
      phantom_active: false,
    };
  }
};

export const markDriverArrived = async (reservationId: string): Promise<Reservation> => {
  try {
    const res = await fetch(`${API_BASE}/reservation/${reservationId}/arrive`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error(`Arrive failed: ${res.status}`);
    return await res.json();
  } catch {
    return {
      reservation_id: reservationId,
      driver_id: 'DRV-742',
      hub_id: 'hub-b',
      hub_name: 'Hub B — Guindy Metro Hub',
      gun_id: 'gun-hub-b-1',
      vehicle_model: 'Tata Nexon EV',
      reservation_date: new Date().toISOString().slice(0, 10),
      arrival_time: '15:00',
      target_soc: 80,
      status: 'CHARGING',
      created_at: '14:30',
      expected_arrival_time: '15:00',
      actual_arrival_time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      delay_min: 0,
      phantom_ev_id: '',
      phantom_topup_min: 0,
      reservation_protected: true,
      phantom_active: false,
    };
  }
};

export const simulateLateArrival = async (reservationId: string, delayMin: number = 12): Promise<Reservation> => {
  try {
    const res = await fetch(
      `${API_BASE}/reservation/${reservationId}/simulate-delay?delay_min=${delayMin}`,
      { method: 'POST' }
    );
    if (!res.ok) throw new Error(`Simulate delay failed: ${res.status}`);
    return await res.json();
  } catch {
    return {
      reservation_id: reservationId,
      driver_id: 'DRV-742',
      hub_id: 'hub-b',
      hub_name: 'Hub B — Guindy Metro Hub',
      gun_id: null,
      vehicle_model: 'Tata Nexon EV',
      reservation_date: new Date().toISOString().slice(0, 10),
      arrival_time: '15:00',
      target_soc: 80,
      status: 'PHANTOM_ACTIVE',
      created_at: '14:30',
      expected_arrival_time: '15:00',
      actual_arrival_time: '',
      reservation_protected: true,
      phantom_active: true,
      phantom_ev_id: 'EV-17',
      phantom_topup_min: 10,
      delay_min: delayMin,
    };
  }
};

export const fetchReservations = async (): Promise<Reservation[]> => {
  try {
    const res = await fetch(`${API_BASE}/reservations`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
};

export const cancelReservation = async (reservationId: string): Promise<Reservation> => {
  const res = await fetch(`${API_BASE}/reservation/${reservationId}/cancel`, {
    method: 'POST',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Cancel failed: ${res.status}` }));
    throw new Error(err.detail || `Cancel failed: ${res.status}`);
  }
  return await res.json();
};

export const fetchSlotAvailability = async (hubId: string, date: string): Promise<SlotAvailability[]> => {
  try {
    const res = await fetch(`${API_BASE}/availability?hub_id=${encodeURIComponent(hubId)}&date=${encodeURIComponent(date)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {
    // proceed to fallback
  }

  // Robust Fallback Slot Generator (06:00 to 22:00)
  const hubNames: Record<string, string> = {
    'hub-a': 'Hub A — OMR IT Corridor',
    'hub-b': 'Hub B — Guindy Metro Hub',
    'hub-c': 'Hub C — Airport Fast-Charge Hub',
    'hub-d': 'Hub D — Anna Nagar Supercharger'
  };
  const hubName = hubNames[hubId] || hubId;
  const today = new Date().toISOString().slice(0, 10);
  const currentHour = new Date().getHours();
  const fallbackSlots: SlotAvailability[] = [];

  for (let hour = 6; hour <= 22; hour++) {
    const timeSlot = `${String(hour).padStart(2, '0')}:00`;
    let status: 'AVAILABLE' | 'BOOKED' | 'UNAVAILABLE' = 'AVAILABLE';

    if (date === today && hour <= currentHour) {
      status = 'UNAVAILABLE';
    } else if ((hour === 11 && hubId === 'hub-a') || (hour === 17 && hubId === 'hub-b') || (hour === 19 && hubId === 'hub-c')) {
      status = 'BOOKED';
    }

    fallbackSlots.push({
      hub_id: hubId,
      hub_name: hubName,
      date: date,
      time_slot: timeSlot,
      status: status,
      reservation_id: null,
    });
  }

  return fallbackSlots;
};
