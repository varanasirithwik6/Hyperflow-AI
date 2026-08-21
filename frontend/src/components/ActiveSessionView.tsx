import React, { useState, useEffect } from 'react';
import {
  Zap, Clock, ShieldCheck, AlertCircle, ArrowUpRight, TrendingUp, Info, DollarSign, Leaf, CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { predictCCVTrajectory } from '../services/api';

export const ActiveSessionView: React.FC = () => {
  const [soc, setSoc] = useState<number>(62);
  const [allocatedPower, setAllocatedPower] = useState<number>(42);
  const [trajectoryData, setTrajectoryData] = useState<any[]>([]);

  useEffect(() => {
    const loadTrajectory = async () => {
      const data = await predictCCVTrajectory(18, 80, 40.5, 60.0);
      if (data && data.trajectory) {
        setTrajectoryData(data.trajectory);
      }
    };
    loadTrajectory();
  }, []);

  const isCvPhase = soc >= 80;
  const currentTariff = soc >= 90 ? 22.0 : soc >= 85 ? 19.0 : soc >= 80 ? 16.0 : 14.0;
  
  const energyDelivered = 18.4;
  const co2Emitted = (energyDelivered * 0.45).toFixed(2);
  const co2Avoided = (energyDelivered * 0.28).toFixed(2);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* Session Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
              LIVE CHARGING SESSION • HUB B (GUN 01)
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">Tata Nexon EV (40.5 kWh)</h1>
          <p className="text-xs text-slate-400 mt-0.5">Session ID: sess-103 • Started at 14:15</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Grid Status</div>
            <div className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <ShieldCheck className="w-4 h-4" /> SAFE
            </div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-center">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Current Tariff</div>
            <div className="text-sm font-bold text-cyan-400 font-mono mt-0.5">₹{currentTariff}/kWh</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Circular SOC Ring & Live Gauge */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden">
            {/* Glowing Ring */}
            <div className="relative w-52 h-52 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-slate-800"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Animated Foreground Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  className="stroke-cyan-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray="264"
                  strokeDashoffset={264 - (264 * soc) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-white font-mono tracking-tight">{soc}%</span>
                <span className="text-xs text-slate-400 font-medium mt-1">State of Charge</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-2 border ${
                  isCvPhase ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}>
                  {isCvPhase ? 'CV TAPER PHASE' : 'CC FAST CHARGE'}
                </span>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 w-full pt-4 border-t border-slate-800 text-center">
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Power</div>
                <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{allocatedPower} kW</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">ETA 80%</div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">18 min</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase">Energy</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{energyDelivered} kWh</div>
              </div>
            </div>
          </div>

          {/* GREENCHARGE IMPACT SESSION CARD */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Leaf className="w-4 h-4 text-emerald-400" />
                ESTIMATED CO₂ IMPACT
              </div>
              <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                GREENCHARGE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-center">
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Estimated CO₂ Emitted</div>
                <div className="text-slate-200 font-bold text-sm mt-0.5">{co2Emitted} kg</div>
              </div>
              <div className="p-2.5 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-[10px] text-slate-400">Estimated CO₂ Avoided</div>
                <div className="text-emerald-400 font-bold text-sm mt-0.5">{co2Avoided} kg</div>
              </div>
            </div>

            <p className="text-[11px] text-emerald-300/90 italic font-mono text-center">
              "Your charging impact has been added to your lifetime total."
            </p>
          </div>

          {/* Anti-Taper Pricing Notice Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/30 border border-amber-800/40 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              ANTI-TAPER DYNAMIC PRICING STRUCTURE
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Fast charging power naturally tapers past 80% SOC. HyperFlow uses progressive tariff incentives to prevent station queue congestion.
            </p>
            <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono pt-1 text-center">
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400">0-80%</div>
                <div className="text-emerald-400 font-bold">₹14/kWh</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400">80-85%</div>
                <div className="text-slate-200 font-bold">₹16/kWh</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400">85-90%</div>
                <div className="text-amber-400 font-bold">₹19/kWh</div>
              </div>
              <div className="p-2 rounded bg-slate-950/80 border border-slate-800">
                <div className="text-slate-400">90%+</div>
                <div className="text-red-400 font-bold">₹22/kWh</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right CC-CV Trajectory Visualizer */}
        <div className="lg:col-span-7 space-y-6">


          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Non-Linear CC-CV Power Trajectory P(t)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">LightGBM prototype model prediction</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> CC Phase
                </span>
                <span className="flex items-center gap-1.5 text-amber-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> CV Taper
                </span>
              </div>
            </div>

            {/* Recharts Trajectory Graph */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trajectoryData}>
                  <defs>
                    <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="minute" stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tickLine={false} tick={{ fontSize: 11 }} unit=" kW" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Area type="monotone" dataKey="power_kw" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#powerGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upfront Cost & ETA Transparency Panel */}
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4" />
              UPFRONT COST & ETA TRANSPARENCY
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Energy:</span>
                  <span className="text-slate-200">25.1 kWh</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Base Energy Cost:</span>
                  <span className="text-slate-200">₹351.40</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Congestion Surcharge:</span>
                  <span className="text-emerald-400">₹0.00</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800 font-bold">
                  <span className="text-white">TOTAL ESTIMATE:</span>
                  <span className="text-cyan-400 text-sm">₹351.40</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Time to 80% SOC:</span>
                  <span className="text-emerald-400 font-bold">18 min</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Time to 100% Target:</span>
                  <span className="text-slate-200">32 min</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Power Optimization:</span>
                  <span className="text-cyan-400">ACTIVE</span>
                </div>
                <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800 font-bold">
                  <span className="text-white">GRID CAPACITY:</span>
                  <span className="text-emerald-400">PROTECTED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
