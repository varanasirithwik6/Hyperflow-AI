import { useEffect, useState, useRef } from 'react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage, Reservation } from '../types';
import { getLocalReservationsList } from '../services/api';

export interface TelemetryPayload {
  scenario: string;
  hubs: Hub[];
  sessions: EVSession[];
  transformer: TransformerStatus;
  metrics: LiveMetrics;
  reservations: Reservation[];
}

export interface EventsPayload {
  decision_feed: AIDecisionEvent[];
  ocpp_messages: OCPPMessage[];
}

// ──────────────────────────────────────────────────────────────────────────────
// DEMO SIMULATION ENGINE
// Runs entirely in the browser when no backend is reachable.
// Produces realistic, animated telemetry data at 1Hz.
// ──────────────────────────────────────────────────────────────────────────────

let _tick = 0;
let _soc1 = 22.0;
let _soc2 = 45.0;
let _soc3 = 68.0;
let _soc4 = 31.0;
let _scenario = 'NORMAL';
let _ambientTemp = 28.0;
let _extraSpawnedSessions: EVSession[] = [];

function buildDemoTelemetry(): TelemetryPayload {
  _tick++;

  // Advance SOC realistically (CC → CV taper)
  const advanceSoc = (soc: number, powerKw: number, capKwh: number) => {
    const isCC = soc < 80;
    const actualPower = isCC ? powerKw : powerKw * Math.exp(-0.06 * (soc - 80));
    const energyAdded = (actualPower * (1 / 3600)) * 0.95;
    return Math.min(100, soc + (energyAdded / capKwh) * 100);
  };

  const power1 = _scenario === 'GRID_SURGE' ? 30.0 : _soc1 < 80 ? 60.0 : Math.max(8, 60 * Math.exp(-0.065 * (_soc1 - 80)));
  const power2 = _scenario === 'GRID_SURGE' ? 28.0 : _soc2 < 80 ? 60.0 : Math.max(8, 60 * Math.exp(-0.065 * (_soc2 - 80)));
  const power3 = _scenario === 'HIGH_TEMP' ? 42.0 : _soc3 < 80 ? 48.0 : Math.max(8, 48 * Math.exp(-0.065 * (_soc3 - 80)));
  const power4 = _scenario === 'CHARGER_FAILURE' ? 0.0 : _soc4 < 80 ? 55.0 : Math.max(8, 55 * Math.exp(-0.065 * (_soc4 - 80)));

  _soc1 = advanceSoc(_soc1, 60, 40.5);
  if (_soc1 >= 99) _soc1 = 20 + Math.random() * 15;
  _soc2 = advanceSoc(_soc2, 60, 50.3);
  if (_soc2 >= 99) _soc2 = 25 + Math.random() * 20;
  _soc3 = advanceSoc(_soc3, 48, 72.6);
  if (_soc3 >= 99) _soc3 = 30 + Math.random() * 25;
  _soc4 = _scenario === 'CHARGER_FAILURE' ? _soc4 : advanceSoc(_soc4, 55, 44.0);
  if (_soc4 >= 99) _soc4 = 18 + Math.random() * 20;

  // Advance any spawned session
  _extraSpawnedSessions.forEach((s) => {
    s.current_soc = advanceSoc(s.current_soc, s.allocated_power_kw, s.battery_capacity_kwh);
    s.phase = s.current_soc >= 80 ? 'CV_PHASE' : 'CC_PHASE';
    s.energy_delivered_kwh = parseFloat((((s.current_soc - s.initial_soc) / 100) * s.battery_capacity_kwh).toFixed(2));
    s.total_cost_inr = parseFloat((s.energy_delivered_kwh * 14).toFixed(2));
  });

  const spawnedPower = _extraSpawnedSessions.reduce((sum, s) => sum + s.allocated_power_kw, 0);
  const ambientTemp = _scenario === 'HIGH_TEMP' ? 40.0 : _ambientTemp;
  const derateFactor = ambientTemp <= 30 ? 1.0 : Math.max(0.55, 1.0 - (ambientTemp - 30) * 0.022);
  const effectiveCapacity = 200 * derateFactor;
  const thermalState = Math.min(98, Math.round(55 + (ambientTemp / 50) * 35));
  const totalLoad = power1 + power2 + power3 + (_scenario === 'CHARGER_FAILURE' ? 0 : power4) + spawnedPower + 20;
  const safeHeadroom = Math.max(0, parseFloat((effectiveCapacity - totalLoad).toFixed(1)));

  const hubs: Hub[] = [
    {
      id: 'hub-a', name: 'Hub A — OMR IT Corridor',
      location_tag: 'Sholinganallur IT Park, OMR',
      total_guns: 6, active_guns: _scenario === 'CHARGER_FAILURE' ? 3 : 4,
      distance_km: 1.2, transformer_capacity_kw: 200, transformer_load_kw: Math.round(totalLoad),
      thermal_state_pct: thermalState, ambient_temp_c: ambientTemp,
      base_tariff_inr: 14.0, reliability_score: _scenario === 'CHARGER_FAILURE' ? 72.0 : 91.0,
      current_queue_count: _scenario === 'PEAK_DEMAND' ? 4 : 2,
      predicted_queue_15m: _scenario === 'PEAK_DEMAND' ? 7 : 4,
      estimated_wait_min: _scenario === 'PEAK_DEMAND' ? 32.0 : 18.0,
      congestion_level: _scenario === 'PEAK_DEMAND' ? 'CRITICAL' : 'HIGH',
    },
    {
      id: 'hub-b', name: 'Hub B — Guindy Metro Hub',
      location_tag: 'Guindy Industrial Estate',
      total_guns: 4, active_guns: 2,
      distance_km: 2.8, transformer_capacity_kw: 150, transformer_load_kw: 88,
      thermal_state_pct: 52.0, ambient_temp_c: ambientTemp,
      base_tariff_inr: 12.5, reliability_score: 97.0,
      current_queue_count: 0, predicted_queue_15m: 1,
      estimated_wait_min: 0.0, congestion_level: 'LOW',
    },
    {
      id: 'hub-c', name: 'Hub C — Airport Fast-Charge Hub',
      location_tag: 'Chennai International Airport Terminal 2',
      total_guns: 8, active_guns: 5,
      distance_km: 5.1, transformer_capacity_kw: 350, transformer_load_kw: 210,
      thermal_state_pct: 44.0, ambient_temp_c: ambientTemp,
      base_tariff_inr: 16.0, reliability_score: 99.0,
      current_queue_count: 1, predicted_queue_15m: 2,
      estimated_wait_min: 8.0, congestion_level: 'MODERATE',
    },
    {
      id: 'hub-d', name: 'Hub D — Anna Nagar Supercharger',
      location_tag: 'Anna Nagar Western Extension',
      total_guns: 6, active_guns: 3,
      distance_km: 3.4, transformer_capacity_kw: 200, transformer_load_kw: 120,
      thermal_state_pct: 58.0, ambient_temp_c: ambientTemp,
      base_tariff_inr: 13.0, reliability_score: 94.0,
      current_queue_count: 1, predicted_queue_15m: 2,
      estimated_wait_min: 10.0, congestion_level: 'MODERATE',
    },
  ];

  const sessions: EVSession[] = [
    {
      id: 'sess-633', vehicle_model: 'Tata Nexon EV',
      battery_capacity_kwh: 40.5, initial_soc: 18.0, current_soc: parseFloat(_soc1.toFixed(1)),
      target_soc: 90, allocated_power_kw: parseFloat(power1.toFixed(1)),
      urgency: 'CRITICAL', phase: _soc1 >= 80 ? 'CV_PHASE' : 'CC_PHASE',
      energy_delivered_kwh: parseFloat((((_soc1 - 18) / 100) * 40.5).toFixed(2)),
      total_cost_inr: parseFloat((((_soc1 - 18) / 100) * 40.5 * 14).toFixed(2)),
      current_tariff_inr: _soc1 >= 80 ? 22.0 : 14.0,
      estimated_time_to_80_min: Math.max(0, Math.round((80 - _soc1) / 100 * 40.5 / 60 * 60)),
      estimated_time_to_target_min: Math.max(0, Math.round((90 - _soc1) / 100 * 40.5 / 60 * 60)),
      hub_id: 'hub-a', gun_id: 'gun-hub-a-1',
    },
    {
      id: 'sess-690', vehicle_model: 'Mahindra XUV400',
      battery_capacity_kwh: 50.3, initial_soc: 30.0, current_soc: parseFloat(_soc2.toFixed(1)),
      target_soc: 85, allocated_power_kw: parseFloat(power2.toFixed(1)),
      urgency: 'MEDIUM', phase: _soc2 >= 80 ? 'CV_PHASE' : 'CC_PHASE',
      energy_delivered_kwh: parseFloat((((_soc2 - 30) / 100) * 50.3).toFixed(2)),
      total_cost_inr: parseFloat((((_soc2 - 30) / 100) * 50.3 * 14).toFixed(2)),
      current_tariff_inr: 14.0,
      estimated_time_to_80_min: Math.max(0, Math.round((80 - _soc2) / 100 * 50.3 / 60 * 60)),
      estimated_time_to_target_min: Math.max(0, Math.round((85 - _soc2) / 100 * 50.3 / 60 * 60)),
      hub_id: 'hub-a', gun_id: 'gun-hub-a-2',
    },
    {
      id: 'sess-741', vehicle_model: 'Hyundai Ioniq 5',
      battery_capacity_kwh: 72.6, initial_soc: 12.0, current_soc: parseFloat(_soc3.toFixed(1)),
      target_soc: 80, allocated_power_kw: parseFloat(power3.toFixed(1)),
      urgency: 'CRITICAL', phase: _soc3 >= 80 ? 'CV_PHASE' : 'CC_PHASE',
      energy_delivered_kwh: parseFloat((((_soc3 - 12) / 100) * 72.6).toFixed(2)),
      total_cost_inr: parseFloat((((_soc3 - 12) / 100) * 72.6 * 14).toFixed(2)),
      current_tariff_inr: 14.0,
      estimated_time_to_80_min: Math.max(0, Math.round((80 - _soc3) / 100 * 72.6 / 48 * 60)),
      estimated_time_to_target_min: Math.max(0, Math.round((80 - _soc3) / 100 * 72.6 / 48 * 60)),
      hub_id: 'hub-a', gun_id: 'gun-hub-a-3',
    },
  ];

  if (_scenario !== 'CHARGER_FAILURE') {
    sessions.push({
      id: 'sess-812', vehicle_model: 'MG ZS EV',
      battery_capacity_kwh: 44.0, initial_soc: 25.0, current_soc: parseFloat(_soc4.toFixed(1)),
      target_soc: 90, allocated_power_kw: parseFloat(power4.toFixed(1)),
      urgency: 'LOW', phase: _soc4 >= 80 ? 'CV_PHASE' : 'CC_PHASE',
      energy_delivered_kwh: parseFloat((((_soc4 - 25) / 100) * 44).toFixed(2)),
      total_cost_inr: parseFloat((((_soc4 - 25) / 100) * 44 * 14).toFixed(2)),
      current_tariff_inr: 14.0,
      estimated_time_to_80_min: Math.max(0, Math.round((80 - _soc4) / 100 * 44 / 55 * 60)),
      estimated_time_to_target_min: Math.max(0, Math.round((90 - _soc4) / 100 * 44 / 55 * 60)),
      hub_id: 'hub-a', gun_id: 'gun-hub-a-4',
    });
  }

  // Include any interactively spawned EV sessions
  sessions.push(..._extraSpawnedSessions);

  const transformer: TransformerStatus = {
    transformer_id: 'TRANSFORMER-HUB-04',
    capacity_kw: 200,
    current_load_kw: parseFloat(totalLoad.toFixed(1)),
    thermal_state_pct: thermalState,
    safe_headroom_kw: parseFloat(Math.max(0, safeHeadroom).toFixed(1)),
    ambient_temp_c: ambientTemp,
    thermal_constraint_active: _scenario === 'HIGH_TEMP',
    why_explanation: _scenario === 'HIGH_TEMP'
      ? 'IEEE C57.91 thermal derating active: 40°C ambient reduces continuous capacity to 75%. SLSQP optimizer reducing all sessions.'
      : 'All sessions within safe limits. SLSQP optimizer maintaining optimal load distribution.',
  };

  const metrics: LiveMetrics = {
    baseline_wait_min: 31.4,
    hyperflow_wait_min: 19.7,
    wait_reduction_pct: 37.3,
    baseline_utilization_pct: 62.0,
    hyperflow_utilization_pct: 86.5,
    utilization_improvement_pct: 39.5,
    overload_events_avoided: 6 + Math.floor(_tick / 60),
    average_cost_savings_inr: 42.50,
    reroutes_count: 2,
    phantom_recoveries_count: 1,
    failed_chargers_count: _scenario === 'CHARGER_FAILURE' ? 1 : 0,
  };

  const reservations = getLocalReservationsList();

  return { scenario: _scenario, hubs, sessions, transformer, metrics, reservations };
}

function buildDemoEvents(): EventsPayload {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return {
    decision_feed: [
      { timestamp: now, category: 'OPTIMIZATION', action: 'SLSQP Power Distribution Complete', target_id: 'hub-a', why_reason: 'SciPy SLSQP optimizer allocated power across 4 active sessions within transformer headroom.' },
      { timestamp: now, category: 'RECOMMENDATION', action: 'Driver DRV-742 routed to Hub B', target_id: 'hub-b', why_reason: 'Hub A has HIGH congestion (2 queue). Hub B has zero queue and 62 kW headroom.' },
      { timestamp: now, category: 'THERMAL_HEADROOM', action: 'Transformer thermal check passed', target_id: 'TRANSFORMER-HUB-04', why_reason: 'Thermal state at 68%. IEEE C57.91 model confirms safe continuous operation.' },
      { timestamp: now, category: 'PHANTOM_SLOT', action: 'Reservation HF-1001 protected', target_id: 'HF-1001', why_reason: 'Phantom-Slot algorithm holding slot for DRV-742 at Hub B on tomorrow 15:00.' },
      { timestamp: now, category: 'OPTIMIZATION', action: 'Anti-Taper Tariff Active — sess-633', target_id: 'sess-633', why_reason: 'Tata Nexon EV entered CV phase at 80% SOC. Progressive tariff ₹22/kWh discourages bay camping.' },
    ],
    ocpp_messages: [
      { timestamp: now, message_id: 'msg-001', action: 'StatusNotification', evse_id: 'gun-hub-a-1', payload: { status: 'Charging', connectorId: 1 }, summary: 'Charger gun-hub-a-1 reporting active charging session' },
      { timestamp: now, message_id: 'msg-002', action: 'TransactionEvent', evse_id: 'gun-hub-a-2', payload: { eventType: 'Updated', seqNo: _tick }, summary: `Transaction updated — sequence ${_tick}` },
      { timestamp: now, message_id: 'msg-003', action: 'SetChargingProfile', evse_id: 'gun-hub-a-3', payload: { stackLevel: 0, chargingProfilePurpose: 'TxProfile' }, summary: 'SLSQP power profile applied to gun 3' },
      { timestamp: now, message_id: 'msg-004', action: 'Heartbeat', evse_id: 'gun-hub-b-1', payload: { currentTime: now }, summary: 'Hub B gun-1 heartbeat OK' },
    ],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN HOOK
// ──────────────────────────────────────────────────────────────────────────────

export const useWebSockets = () => {
  const [telemetry, setTelemetry] = useState<TelemetryPayload | null>(null);
  const [events, setEvents] = useState<EventsPayload | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const telemetryWsRef = useRef<WebSocket | null>(null);
  const eventsWsRef = useRef<WebSocket | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsFailedRef = useRef(false);

  useEffect(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;

    const baseWsUrl = import.meta.env.VITE_WS_URL
      ? import.meta.env.VITE_WS_URL.replace(/\/$/, '')
      : `${wsProtocol}//${host}`;

    // Start demo simulation immediately as a fallback ticker
    // Will be cancelled if a real WebSocket connects
    const startDemoMode = () => {
      if (demoIntervalRef.current) return;
      // Seed initial data immediately
      setTelemetry(buildDemoTelemetry());
      setEvents(buildDemoEvents());
      setIsConnected(true); // Show as "DEMO CONNECTED"
      demoIntervalRef.current = setInterval(() => {
        setTelemetry(buildDemoTelemetry());
        if (_tick % 3 === 0) setEvents(buildDemoEvents());
      }, 1000);
    };

    const stopDemoMode = () => {
      if (demoIntervalRef.current) {
        clearInterval(demoIntervalRef.current);
        demoIntervalRef.current = null;
      }
    };

    const connectTelemetry = () => {
      try {
        const ws = new WebSocket(`${baseWsUrl}/ws/telemetry`);
        telemetryWsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            ws.close();
            wsFailedRef.current = true;
            startDemoMode();
          }
        }, 4000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          stopDemoMode();
          setIsConnected(true);
        };

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            _scenario = data.scenario || 'NORMAL';
            setTelemetry(data);
          } catch (e) {
            console.error('Error parsing telemetry JSON:', e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          if (!wsFailedRef.current) {
            wsFailedRef.current = true;
            startDemoMode();
          }
          setTimeout(connectTelemetry, 8000);
        };

        ws.onerror = () => {
          clearTimeout(connectionTimeout);
          wsFailedRef.current = true;
          startDemoMode();
        };
      } catch (err) {
        wsFailedRef.current = true;
        startDemoMode();
      }
    };

    const connectEvents = () => {
      try {
        const ws = new WebSocket(`${baseWsUrl}/ws/events`);
        eventsWsRef.current = ws;

        ws.onmessage = (evt) => {
          try {
            const data = JSON.parse(evt.data);
            setEvents(data);
          } catch (e) {
            console.error('Error parsing events JSON:', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connectEvents, 8000);
        };
      } catch (err) {
        // Events WS failed - demo mode already handles events
      }
    };

    connectTelemetry();
    connectEvents();

    return () => {
      telemetryWsRef.current?.close();
      eventsWsRef.current?.close();
      stopDemoMode();
    };
  }, []);

  // Expose a way for scenario triggers & spawn EV to update the demo
  useEffect(() => {
    const scenarioHandler = (e: CustomEvent) => {
      _scenario = e.detail?.scenario || 'NORMAL';
    };
    const spawnHandler = (e: CustomEvent) => {
      const detail = e.detail || {};
      const newSessId = `sess-${Math.floor(200 + Math.random() * 700)}`;
      const hubId = detail.hub_id || 'hub-a';
      const model = detail.vehicle_model || 'Tata Nexon EV';
      const soc = Number(detail.initial_soc) || 18.0;
      const cap = model.includes('Ioniq') ? 72.6 : model.includes('XUV') ? 50.3 : 40.5;

      const newSess: EVSession = {
        id: newSessId,
        vehicle_model: model,
        battery_capacity_kwh: cap,
        initial_soc: soc,
        current_soc: soc,
        target_soc: 85,
        allocated_power_kw: 48.0,
        urgency: 'CRITICAL',
        phase: soc >= 80 ? 'CV_PHASE' : 'CC_PHASE',
        energy_delivered_kwh: 0,
        total_cost_inr: 0,
        current_tariff_inr: 14.0,
        estimated_time_to_80_min: Math.max(5, Math.round((80 - soc) / 100 * cap / 48 * 60)),
        estimated_time_to_target_min: Math.max(8, Math.round((85 - soc) / 100 * cap / 48 * 60)),
        hub_id: hubId,
        gun_id: `gun-${hubId}-5`,
      };

      // Keep maximum 2 extra spawned sessions
      if (_extraSpawnedSessions.length >= 2) {
        _extraSpawnedSessions.shift();
      }
      _extraSpawnedSessions.push(newSess);
    };

    const tempHandler = (e: CustomEvent) => {
      const val = Number(e.detail?.temp_c);
      if (!isNaN(val)) {
        _ambientTemp = val;
      }
    };

    window.addEventListener('hyperflow-scenario', scenarioHandler as EventListener);
    window.addEventListener('hyperflow-spawn-ev', spawnHandler as EventListener);
    window.addEventListener('hyperflow-ambient-temp', tempHandler as EventListener);
    return () => {
      window.removeEventListener('hyperflow-scenario', scenarioHandler as EventListener);
      window.removeEventListener('hyperflow-spawn-ev', spawnHandler as EventListener);
      window.removeEventListener('hyperflow-ambient-temp', tempHandler as EventListener);
    };
  }, []);

  return { telemetry, events, isConnected };
};
