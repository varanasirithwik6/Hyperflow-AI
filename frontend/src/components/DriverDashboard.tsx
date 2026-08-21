import React, { useState } from 'react';
import {
  Car, MapPin, Zap, Clock, DollarSign, ShieldCheck, Sparkles, Navigation, CheckCircle2, AlertTriangle, Info, Leaf, Route
} from 'lucide-react';
import { DriverInput, RecommendationResponse, HubRecommendation, Hub, Reservation } from '../types';
import { fetchRecommendation } from '../services/api';
import { DriverMap } from './DriverMap';
import { ReservationBookingFlow } from './ReservationBookingFlow';

interface DriverDashboardProps {
  hubs: Hub[];
  onStartSession: () => void;
  reservations?: Reservation[];
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ hubs, onStartSession, reservations }) => {
  const [input, setInput] = useState<DriverInput>({
    current_location: 'OMR IT Corridor, Chennai',
    vehicle_model: 'Tata Nexon EV',
    current_soc: 18,
    target_soc: 80,
    preferred_speed: 'FAST',
  });


  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [selectedHubId, setSelectedHubId] = useState<string | null>('hub-b');
  const [showRouteSummary, setShowRouteSummary] = useState<boolean>(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingStep('Analyzing 4 nearby charging hubs...');

    setTimeout(() => setLoadingStep('Predicting queue & congestion trajectory...'), 300);
    setTimeout(() => setLoadingStep('Evaluating transformer thermal headroom...'), 600);
    setTimeout(() => setLoadingStep('Assessing telemetry reliability & GreenCharge carbon impact...'), 900);

    setTimeout(async () => {
      const res = await fetchRecommendation(input);
      setRecommendation(res);
      if (res.best_recommendation) {
        setSelectedHubId(res.best_recommendation.hub_id);
      }
      setLoadingStep(null);
    }, 1200);
  };

  const best = recommendation?.best_recommendation;

  const handleGetRoute = (hubId: string) => {
    setSelectedHubId(hubId);
    setShowRouteSummary(true);
  };

  const activeHub = hubs.find((h) => h.id === selectedHubId) || hubs[1] || hubs[0];
  const activeRec = recommendation?.all_recommendations.find((r) => r.hub_id === selectedHubId) || best;

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            CLOSED-LOOP AI ORCHESTRATION & NAVIGATION
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-white">
            Where should I charge?
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time interactive map, near-future queue predictions, grid headroom & GreenCharge carbon impact.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT PANEL: INTERACTIVE NAVIGATION MAP & FORM */}
        <div className="lg:col-span-7 space-y-6">
          {/* Interactive Leaflet Navigation Map */}
          <DriverMap
            hubs={hubs}
            recommendations={recommendation?.all_recommendations || []}
            bestRecommendation={best || null}
            selectedHubId={selectedHubId}
            onSelectHub={(id) => setSelectedHubId(id)}
            onGetRoute={handleGetRoute}
          />

          {/* TRIP / ROUTE SUMMARY CARD */}
          {showRouteSummary && activeHub && (
            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/40 space-y-4 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2 font-bold text-xs text-cyan-400 uppercase tracking-wider">
                  <Route className="w-4 h-4 text-cyan-400" />
                  ROUTE TO {activeHub.name.toUpperCase()}
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold">
                  ACTIVE ROUTE
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Drive Time</div>
                  <div className="text-white font-bold mt-0.5">5 min</div>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Queue Wait</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{activeHub.estimated_wait_min} min</div>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Charging Time</div>
                  <div className="text-white font-bold mt-0.5">{activeRec?.charging_duration_min || 28} min</div>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">TOTAL TRIP</div>
                  <div className="text-cyan-400 font-black mt-0.5">
                    {5 + activeHub.estimated_wait_min + (activeRec?.charging_duration_min || 28)} min
                  </div>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Total Cost</div>
                  <div className="text-white font-bold mt-0.5">₹{activeRec?.total_cost_inr || 350}</div>
                </div>
                <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                  <div className="text-[10px] text-slate-400">CO₂ Avoided</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{activeRec?.co2_avoided_kg || 2.1} kg</div>
                </div>
              </div>
            </div>
          )}

          {/* PROTECTED RESERVATION BANNER FOR LATE ARRIVALS */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-cyan-950/40 border border-cyan-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                YOUR RESERVATION IS PROTECTED
              </div>
              <span className="text-[10px] font-mono bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded font-bold border border-cyan-500/40">
                HYPERFLOW PHANTOM-SLOT
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              "Your arrival is delayed by 12 minutes. HyperFlow is temporarily using the unused charging capacity while protecting your reserved slot."
            </p>
            <div className="text-[11px] text-emerald-400 font-mono font-bold flex items-center gap-1 pt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Your charging slot at Hub B (Guindy Metro) will be ready upon your arrival.
            </div>
          </div>

          {/* Trip & Vehicle Setup Form */}
          <form onSubmit={handleSearch} className="glass-panel p-6 rounded-2xl space-y-5">

            <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Car className="w-5 h-5 text-cyan-400" />
              Trip & Vehicle Setup
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  Current Location
                </label>
                <input
                  type="text"
                  value={input.current_location}
                  onChange={(e) => setInput({ ...input, current_location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-cyan-400" />
                  EV Vehicle Model
                </label>
                <select
                  value={input.vehicle_model}
                  onChange={(e) => setInput({ ...input, vehicle_model: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
                >
                  <option value="Tata Nexon EV">Tata Nexon EV (40.5 kWh)</option>
                  <option value="MG ZS EV">MG ZS EV (50.3 kWh)</option>
                  <option value="BYD Atto 3">BYD Atto 3 (60.4 kWh)</option>
                  <option value="Mahindra XUV400">Mahindra XUV400 (39.4 kWh)</option>
                  <option value="Tata Tiago EV">Tata Tiago EV (24.0 kWh)</option>
                </select>
              </div>
            </div>

            {/* SOC Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Current Battery SOC</span>
                  <span className="text-cyan-400 font-mono">{input.current_soc}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="75"
                  value={input.current_soc}
                  onChange={(e) => setInput({ ...input, current_soc: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Target SOC</span>
                  <span className="text-cyan-400 font-mono">{input.target_soc}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={input.target_soc}
                  onChange={(e) => setInput({ ...input, target_soc: Number(e.target.value) })}
                  className="w-full accent-cyan-400 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingStep !== null}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-glow transition duration-200 flex items-center justify-center gap-2 text-sm"
            >
              {loadingStep ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating AI Hubs...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  FIND BEST CHARGE
                </>
              )}
            </button>
          </form>

          {/* GREENCHARGE IMPACT COMPACT CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-xs text-emerald-400 uppercase tracking-wider">
                <Leaf className="w-4 h-4 text-emerald-400" />
                GREENCHARGE IMPACT
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                CARBON FOOTPRINT MONITOR
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Energy Used</div>
                <div className="text-white font-bold mt-0.5">24.7 kWh</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Est. CO₂</div>
                <div className="text-slate-200 font-bold mt-0.5">11.1 kg</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">CO₂ Avoided</div>
                <div className="text-emerald-400 font-bold mt-0.5">6.9 kg</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Green %</div>
                <div className="text-emerald-400 font-bold mt-0.5">68%</div>
              </div>
            </div>

            <div className="text-[11px] text-emerald-300 font-mono flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>This Month:</span>
              <strong className="text-emerald-400 font-bold">34.2 kg CO₂ avoided vs. baseline</strong>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: AI SPOTLIGHT CARD & HUB COMPARISONS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Real Phantom-Slot Slot Reservation Card / Modal */}
          <ReservationBookingFlow hubs={hubs} liveReservations={reservations || []} />

          {best ? (
            <>
              {/* BEST OPTION SPOTLIGHT CARD */}
              <div className="glass-panel-glow p-6 rounded-2xl relative overflow-hidden space-y-6">
                <div className="absolute top-0 right-0 bg-gradient-to-l from-cyan-500 to-blue-600 text-slate-950 text-[11px] font-extrabold px-4 py-1 rounded-bl-xl tracking-wider uppercase flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3.5 h-3.5" />
                  BEST OPTION FOR YOU
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-2xl font-black text-white tracking-tight">{best.hub_name}</h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                      {best.reliability_score}% RELIABLE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                    {best.distance_km} km away • {best.wait_min} min predicted queue wait
                  </p>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">PREDICTED WAIT</div>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{best.wait_min} min</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">CHARGING TIME</div>
                    <div className="text-lg font-black text-white font-mono mt-0.5">{best.charging_duration_min} min</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">ESTIMATED COST</div>
                    <div className="text-lg font-black text-cyan-400 font-mono mt-0.5">₹{best.total_cost_inr}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">CO₂ AVOIDED</div>
                    <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">{best.co2_avoided_kg || 2.1} kg</div>
                  </div>
                </div>

                {/* Highlighted Savings Banner */}
                {best.wait_savings_vs_nearest_min > 0 && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-800/40 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span className="text-emerald-200 font-medium">
                        Recommended because you save <strong>{best.wait_savings_vs_nearest_min} minutes</strong> and <strong>₹{best.savings_vs_nearest_inr}</strong> compared with nearest Hub A.
                      </span>
                    </div>
                  </div>
                )}

                {/* Explainable AI Reason */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    WHY THIS CHARGER WAS RECOMMENDED
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {best.reason}
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => handleGetRoute(best.hub_id)}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl transition shadow-glow flex items-center justify-center gap-2 text-xs"
                  >
                    <Route className="w-4 h-4" />
                    GET ROUTE TO {best.hub_name.toUpperCase()}
                  </button>

                  <button
                    onClick={onStartSession}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition shadow-glow-green text-center text-sm"
                  >
                    START CHARGING AT {best.hub_name.toUpperCase()}
                  </button>
                </div>
              </div>

              {/* ALL HUBS COMPARISON CARDS */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  ALL NEARBY CHARGING HUBS
                </h4>
                <div className="space-y-2.5">
                  {recommendation.all_recommendations.map((hub) => (
                    <div
                      key={hub.hub_id}
                      onClick={() => handleGetRoute(hub.hub_id)}
                      className={`p-3.5 rounded-xl border transition cursor-pointer ${
                        selectedHubId === hub.hub_id
                          ? 'bg-cyan-950/40 border-cyan-500/70 shadow-glow'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-white">{hub.hub_name}</span>
                        {hub.is_best_option && (
                          <span className="text-[9px] bg-cyan-500/20 text-cyan-300 font-extrabold px-2 py-0.5 rounded">
                            BEST AI
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-slate-400">
                        <div>Dist: <strong className="text-slate-200">{hub.distance_km}km</strong></div>
                        <div>Wait: <strong className={hub.wait_min > 10 ? 'text-amber-400' : 'text-emerald-400'}>{hub.wait_min}m</strong></div>
                        <div>Cost: <strong className="text-slate-200">₹{hub.total_cost_inr}</strong></div>
                        <div>CO₂: <strong className="text-emerald-400">{hub.co2_avoided_kg || 2.1}kg</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Default Initial State Box */
            <div className="glass-panel p-8 rounded-2xl text-center space-y-4 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                <Navigation className="w-7 h-7 text-cyan-400" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-lg font-bold text-white mb-1">
                  Interactive EV Navigation
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click any marker on the map to inspect charging hubs, or click <strong>FIND BEST CHARGE</strong> to view HyperFlow AI’s multi-factor composite recommendation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
