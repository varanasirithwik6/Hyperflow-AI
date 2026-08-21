import React from 'react';
import {
  Activity, ShieldAlert, Cpu, Zap, Radio, Terminal, Server, AlertTriangle, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw, BarChart2, Leaf
} from 'lucide-react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage, Reservation } from '../types';

interface OperatorDashboardProps {
  hubs: Hub[];
  sessions: EVSession[];
  transformer: TransformerStatus | null;
  metrics: LiveMetrics | null;
  decisionFeed: AIDecisionEvent[];
  ocppFeed: OCPPMessage[];
  currentScenario: string;
  reservations?: Reservation[];
}

export const OperatorDashboard: React.FC<OperatorDashboardProps> = ({
  hubs,
  sessions,
  transformer,
  metrics,
  decisionFeed,
  ocppFeed,
  currentScenario,
  reservations = [],
}) => {
  const hubA = hubs.find((h) => h.id === 'hub-a') || hubs[0];

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Operator Control Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              CPO CONTROL CENTER • LIVE NETWORK ORCHESTRATOR
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">HYPERFLOW CONTROL CENTER</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Autonomous multi-hub optimization, IEEE C57.91-inspired thermal headroom, SLSQP power allocation, GreenCharge CO₂ monitoring & Virtual OCPP 2.0.1 simulation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">ACTIVE SCENARIO: </span>
            <strong className="text-cyan-400 font-bold">{currentScenario}</strong>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS + GREENCHARGE IMPACT */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            ACTIVE SESSIONS
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{sessions.length + 9}</div>
          <div className="text-[10px] text-emerald-400 font-mono">● 100% Online</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            NETWORK LOAD
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 font-mono">
            {transformer ? transformer.current_load_kw : 186} kW
          </div>
          <div className="text-[10px] text-slate-400 font-mono">Feeder #04</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            TRANSFORMER HEADROOM
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {transformer ? transformer.safe_headroom_kw : 22} kW
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">SAFE HEADROOM</div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            PREDICTED WAIT
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {metrics ? metrics.hyperflow_wait_min : 11} min
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">
            {metrics ? `${metrics.wait_reduction_pct}% lower wait` : '37.3% lower wait'}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl space-y-1">
          <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            RELIABILITY
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">96.2%</div>
          <div className="text-[10px] text-slate-400 font-mono">Anomaly Detector Active</div>
        </div>

        {/* GREENCHARGE NETWORK ENVIRONMENTAL IMPACT CARD */}
        <div className="glass-panel p-4 rounded-xl space-y-1 bg-gradient-to-br from-emerald-950/30 to-slate-900 border-emerald-800/40">
          <div className="text-[11px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center justify-between">
            ENVIRONMENTAL
            <Leaf className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {metrics?.total_co2_avoided_kg || 235.8} kg
          </div>
          <div className="text-[10px] text-emerald-300 font-mono flex items-center justify-between">
            <span>CO₂ Avoided</span>
            <strong>{metrics?.network_green_charging_pct || 64}% Green</strong>
          </div>
        </div>
      </div>

      {/* PHANTOM-SLOT / LATE-ARRIVAL MANAGEMENT CARD */}
      {(() => {
        const liveRes = reservations.find(r => r.status === 'PHANTOM_ACTIVE' || r.status === 'LATE' || r.status === 'CHARGING' || r.status === 'RESERVED') || reservations[0];
        const isPhantom = liveRes ? liveRes.phantom_active : (metrics?.phantom_slot?.is_active ?? false);
        const driverName = liveRes ? liveRes.driver_id : (metrics?.phantom_slot?.original_driver_id || 'EV-08 (Driver A)');
        const reservedTime = liveRes ? liveRes.arrival_time : (metrics?.phantom_slot?.reserved_time || '15:00');
        const expectedActual = liveRes ? `${liveRes.expected_arrival_time || liveRes.arrival_time} → ${liveRes.actual_arrival_time || '15:12'}` : `${metrics?.phantom_slot?.expected_arrival_time || '15:00'} → ${metrics?.phantom_slot?.actual_arrival_time || '15:12'}`;
        const delayMin = liveRes ? (liveRes.delay_min || 12) : (metrics?.phantom_slot?.delay_min || 12);
        const tempEv = liveRes?.phantom_ev_id || metrics?.phantom_slot?.temporary_ev_id || 'EV-17 (Waiting)';
        const topupMin = liveRes?.phantom_topup_min || metrics?.phantom_slot?.temporary_topup_min || 8;
        const isDriverArrivedCharging = liveRes?.status === 'CHARGING';

        return (
          <div className="glass-panel p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-cyan-500/40 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin-slow" />
                <span className="font-bold text-xs text-white uppercase tracking-wider">
                  PHANTOM-SLOT / LATE-ARRIVAL MANAGEMENT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  isPhantom
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isDriverArrivedCharging
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                }`}>
                  {isPhantom ? '● PHANTOM SLOT ACTIVE' : isDriverArrivedCharging ? '✓ DRIVER ARRIVED — PRIORITY RESTORED' : '● MONITORING RESERVATIONS'}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  RESERVATION PROTECTED
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center text-xs font-mono">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Reservation</div>
                <div className="text-white font-bold mt-0.5">{driverName}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Expected</div>
                <div className="text-slate-300 font-bold mt-0.5">{reservedTime}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Expected / Actual</div>
                <div className="text-amber-400 font-bold mt-0.5">{expectedActual}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Delay</div>
                <div className="text-amber-400 font-bold mt-0.5">+{delayMin} min</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Temporary EV</div>
                <div className="text-cyan-400 font-bold mt-0.5">{tempEv}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400">Temporary Slot</div>
                <div className="text-emerald-400 font-bold mt-0.5">{topupMin} min</div>
              </div>
            </div>

            {isDriverArrivedCharging ? (
              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-emerald-200">
                    <strong>PHANTOM SLOT ENDS:</strong> Temporary EV released — <strong>{driverName} PRIORITY RESTORED</strong> and charging active.
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                  <span className="text-cyan-200">
                    <strong>STATUS:</strong> {isPhantom ? 'PHANTOM-SLOT ACTIVE — RESERVATION PROTECTED' : 'RESERVATION MONITORING ACTIVE — Threshold >8 min delay'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  Threshold: &gt;8 min delay
                </span>
              </div>
            )}
          </div>
        );
      })()}

      {/* MIDDLE SECTION: MAP & TRANSFORMER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Live Network Map (4 Hubs) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              LIVE NETWORK MAP (4 SIMULATED CHARGING HUBS)
            </h3>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
              REAL-TIME VECTOR MAP
            </span>
          </div>

          {/* Interactive SVG Network Map */}
          <div className="relative w-full h-72 rounded-xl bg-slate-950 border border-slate-800 p-4 flex flex-col justify-between overflow-hidden">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#38bdf8_1px,transparent_1px),linear-gradient(to_bottom,#38bdf8_1px,transparent_1px)] bg-[size:24px_24px]" />

            <div className="relative z-10 grid grid-cols-2 gap-4 h-full">
              {hubs.map((h) => (
                <div
                  key={h.id}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between transition ${
                    h.congestion_level === 'HIGH'
                      ? 'bg-amber-950/20 border-amber-500/40'
                      : h.id === 'hub-b'
                      ? 'bg-cyan-950/20 border-cyan-500/50 shadow-glow'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-xs text-white">{h.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{h.location_tag}</div>
                    </div>
                    <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      h.congestion_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {h.congestion_level}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1 text-[10px] font-mono pt-2 border-t border-slate-800/60 text-slate-300">
                    <div>Load: <strong className="text-white">{h.transformer_load_kw}kW</strong></div>
                    <div>Wait: <strong className={h.estimated_wait_min > 10 ? 'text-amber-400' : 'text-emerald-400'}>{h.estimated_wait_min}m</strong></div>
                    <div>Rel: <strong className="text-emerald-400">{h.reliability_score}%</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Transformer Thermal Headroom Panel */}
        <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              TRANSFORMER FEEDER #04
            </h3>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
              THERMAL HEADROOM
            </span>
          </div>

          {transformer && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Configured Base Capacity:</span>
                  <span className="text-white font-bold">{transformer.capacity_kw} kW</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Current Continuous Load:</span>
                  <span className="text-cyan-400 font-bold">{transformer.current_load_kw} kW</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Ambient Temperature:</span>
                  <span className="text-amber-400 font-bold">{transformer.ambient_temp_c}°C</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400">Thermal Winding State:</span>
                  <span className="text-emerald-400 font-bold">{transformer.thermal_state_pct}%</span>
                </div>
                <div className="flex justify-between items-center text-xs font-mono pt-2 border-t border-slate-800">
                  <span className="text-white font-bold">SAFE CHARGING HEADROOM:</span>
                  <span className="text-emerald-400 text-sm font-black">{transformer.safe_headroom_kw} kW</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-xs text-cyan-200 leading-relaxed font-mono">
                <strong>AI STATUS:</strong> {transformer.why_explanation}
              </div>

              <p className="text-[10px] text-slate-500 italic">
                * Transformer Thermal Headroom Simulation inspired by IEEE C57.91 loading principles.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* LIVE POWER ALLOCATION TABLE (BEFORE VS AFTER SLSQP) */}
      <div className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              LIVE SLSQP POWER ALLOCATION (BEFORE vs AFTER OPTIMIZATION)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">SciPy SLSQP constrained non-linear power distribution</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="p-3">SESSION / EV</th>
                <th className="p-3">SOC %</th>
                <th className="p-3">BEFORE POWER</th>
                <th className="p-3">AFTER (SLSQP)</th>
                <th className="p-3">PRIORITY</th>
                <th className="p-3">AI ACTION</th>
                <th className="p-3">EXPLAINABLE WHY REASON</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.map((s) => {
                const isThrottled = s.allocated_power_kw < 20;
                const isBoosted = s.urgency === 'CRITICAL';
                return (
                  <tr key={s.id} className="hover:bg-slate-900/50 transition">
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      {s.vehicle_model}
                    </td>
                    <td className="p-3 font-bold text-slate-200">{s.current_soc.toFixed(0)}%</td>
                    <td className="p-3 text-slate-400">{isBoosted ? '30.0 kW' : '60.0 kW'}</td>
                    <td className="p-3 font-bold text-cyan-400">{s.allocated_power_kw.toFixed(1)} kW</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.urgency === 'CRITICAL' ? 'bg-red-500/20 text-red-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {s.urgency}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isBoosted ? 'bg-emerald-500/20 text-emerald-300' : isThrottled ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                      }`}>
                        {isBoosted ? 'BOOSTED' : isThrottled ? 'THROTTLED' : 'MAINTAINED'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 text-[11px]">
                      {isBoosted
                        ? `Prioritized critical low SOC (${s.current_soc.toFixed(0)}%); allocated maximum headroom power.`
                        : `Throttled power due to high SOC (${s.current_soc.toFixed(0)}%) taper and thermal headroom limits.`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM DUAL SECTION: OCPP STREAM & AI DECISION FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Virtual OCPP 2.0.1 Protocol Stream */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              VIRTUAL EVSE / OCPP 2.0.1 STREAM
            </h3>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30">
              WEBSOCKET PAYLOADS
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-64 overflow-y-auto space-y-2 font-mono text-xs">
            {ocppFeed && ocppFeed.length > 0 ? (
              ocppFeed.map((msg, idx) => (
                <div key={idx} className="p-2 rounded bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="text-cyan-400 font-bold">[{msg.timestamp}] {msg.action}</span>
                    <span className="text-slate-500">{msg.evse_id}</span>
                  </div>
                  <p className="text-slate-200 text-[11px]">{msg.summary}</p>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs italic text-center pt-8">
                Streaming Virtual OCPP 2.0.1 smart charging payloads over WebSockets...
              </div>
            )}
          </div>
        </div>

        {/* Autonomous AI Decision Feed */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              AUTONOMOUS AI DECISION FEED
            </h3>
            <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
              EXPLAINABLE LOG
            </span>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-64 overflow-y-auto space-y-2.5 font-mono text-xs">
            {decisionFeed && decisionFeed.length > 0 ? (
              decisionFeed.map((evt, idx) => (
                <div key={idx} className="p-2.5 rounded bg-slate-900/60 border border-slate-800/80 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-400 font-bold">✓ {evt.timestamp} • {evt.action}</span>
                    <span className="text-slate-500">{evt.category}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    <strong className="text-cyan-400">WHY? </strong> {evt.why_reason}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-slate-500 text-xs italic text-center pt-8">
                Listening for real-time autonomous AI decision events...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
