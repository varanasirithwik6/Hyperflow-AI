import React, { useState } from 'react';
import { RotateCcw, Cpu, CheckCircle2, Loader2, Zap, Flame, AlertTriangle, ShieldAlert, Clock, Play } from 'lucide-react';
import { LiveMetrics } from '../types';
import { triggerScenario } from '../services/api';

interface SimulationControllerProps {
  currentScenario: string;
  onScenarioChange: (scenario: string) => void;
  metrics: LiveMetrics | null;
}

interface ScenarioDef {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  hoverClass: string;
  description: string;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'NORMAL',
    label: 'NORMAL',
    icon: CheckCircle2,
    activeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-[0_0_10px_-2px_rgba(52,211,153,0.5)]',
    hoverClass: 'hover:border-emerald-700 hover:text-emerald-400',
    description: 'Stable baseline operating state',
  },
  {
    id: 'PEAK_DEMAND',
    label: 'PEAK DEMAND',
    icon: Zap,
    activeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_10px_-2px_rgba(251,191,36,0.5)]',
    hoverClass: 'hover:border-amber-700 hover:text-amber-400',
    description: 'EV arrival surge — Hub A congested',
  },
  {
    id: 'CC_CV_CONGESTION',
    label: 'CC-CV CONGESTION',
    icon: ShieldAlert,
    activeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/60 shadow-[0_0_10px_-2px_rgba(249,115,22,0.5)]',
    hoverClass: 'hover:border-orange-700 hover:text-orange-400',
    description: 'Anti-taper tariff activated at 80% SOC',
  },
  {
    id: 'GRID_SURGE',
    label: 'GRID SURGE',
    icon: AlertTriangle,
    activeClass: 'bg-red-500/20 text-red-300 border-red-500/60 shadow-[0_0_10px_-2px_rgba(239,68,68,0.5)]',
    hoverClass: 'hover:border-red-700 hover:text-red-400',
    description: 'SLSQP optimizer throttling high-SOC EVs',
  },
  {
    id: 'CHARGER_FAILURE',
    label: 'CHARGER FAILURE',
    icon: AlertTriangle,
    activeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/60 shadow-[0_0_10px_-2px_rgba(244,63,94,0.5)]',
    hoverClass: 'hover:border-rose-700 hover:text-rose-400',
    description: 'Gun fault detected — driver rerouted',
  },
  {
    id: 'DRIVER_DELAY',
    label: 'DRIVER DELAY',
    icon: Clock,
    activeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 shadow-[0_0_10px_-2px_rgba(34,211,238,0.5)]',
    hoverClass: 'hover:border-cyan-700 hover:text-cyan-400',
    description: 'Phantom-slot recovery active',
  },
  {
    id: 'HIGH_TEMP',
    label: 'HIGH TEMP 40°C',
    icon: Flame,
    activeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/60 shadow-[0_0_10px_-2px_rgba(234,179,8,0.5)]',
    hoverClass: 'hover:border-yellow-700 hover:text-yellow-400',
    description: 'IEEE C57.91 thermal derating',
  },
];

export const SimulationController: React.FC<SimulationControllerProps> = ({
  currentScenario,
  onScenarioChange,
  metrics,
}) => {
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleScenarioClick = async (scenario: ScenarioDef) => {
    if (loadingScenario) return; // prevent double clicks
    setLoadingScenario(scenario.id);
    onScenarioChange(scenario.id);
    // Notify demo simulation engine (runs when backend is offline)
    window.dispatchEvent(new CustomEvent('hyperflow-scenario', { detail: { scenario: scenario.id } }));
    await triggerScenario(scenario.id);
    setTimeout(() => {
      setLoadingScenario(null);
      showToast(`✓ Scenario activated: ${scenario.label}`);
    }, 600);
  };

  const handleReset = async () => {
    if (loadingScenario) return;
    setLoadingScenario('RESET');
    onScenarioChange('NORMAL');
    window.dispatchEvent(new CustomEvent('hyperflow-scenario', { detail: { scenario: 'NORMAL' } }));
    await triggerScenario('RESET');
    setTimeout(() => {
      setLoadingScenario(null);
      showToast('✓ Simulation reset to NORMAL baseline');
    }, 600);
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 p-4 lg:px-8 space-y-4 relative">
      {/* Toast notification */}
      {toastMsg && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 z-50 pointer-events-none">
          <div className="flex items-center gap-2 bg-emerald-950/95 border border-emerald-500/60 text-emerald-300 text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-2xl animate-fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {toastMsg}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Scenario Control Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-2 flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-cyan-400" />
            SCENARIOS:
          </span>

          {SCENARIOS.map((sc) => {
            const isActive = currentScenario === sc.id;
            const isLoading = loadingScenario === sc.id;
            const Icon = sc.icon;
            return (
              <button
                key={sc.id}
                onClick={() => handleScenarioClick(sc)}
                disabled={!!loadingScenario}
                title={sc.description}
                className={`group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 whitespace-nowrap border flex items-center gap-1.5 ${
                  isActive
                    ? sc.activeClass
                    : `bg-slate-950 text-slate-400 border-slate-800 ${sc.hoverClass}`
                } ${loadingScenario && !isActive ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className={`w-3.5 h-3.5 ${isActive ? '' : 'opacity-60 group-hover:opacity-100'}`} />
                )}
                {sc.label}
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-current animate-ping opacity-75" />
                )}
              </button>
            );
          })}

          <button
            onClick={handleReset}
            disabled={!!loadingScenario}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 hover:border-slate-500 flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loadingScenario === 'RESET' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            RESET
          </button>
        </div>

        {/* Dynamic Simulation Results Banner */}
        {metrics && (
          <div className="flex items-center gap-4 text-xs font-mono bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <span className="text-cyan-400 font-bold uppercase text-[10px]">SIMULATION RESULTS:</span>
            <div className="flex items-center gap-3">
              <span className="text-slate-300">
                Wait: <strong className="text-emerald-400">{metrics.hyperflow_wait_min}m</strong>{' '}
                <span className="text-emerald-500 text-[10px]">({metrics.wait_reduction_pct}% lower)</span>
              </span>
              <span className="text-slate-300">
                Overloads: <strong className="text-cyan-400">{metrics.overload_events_avoided}</strong>
              </span>
              <span className="text-slate-300">
                Savings: <strong className="text-emerald-400">₹{metrics.average_cost_savings_inr}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
