import React, { useEffect, useRef, useState } from 'react';
import {
  Zap, Activity, ShieldCheck, ShieldAlert, Cpu, Flame, Play, Pause, RotateCcw, AlertTriangle, CheckCircle2, RefreshCw, Car, ArrowRight, Radio, Layers, Gauge, Sparkles, Server, Eye, Maximize2, Compass, Wrench, X, PlusCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage } from '../types';
import { triggerScenario, updateAmbientTemp, spawnEVInQueue, controlEVSEGun } from '../services/api';

interface DigitalTwinVisualizerProps {
  hubs: Hub[];
  sessions: EVSession[];
  transformer: TransformerStatus | null;
  metrics: LiveMetrics | null;
  decisionFeed: AIDecisionEvent[];
  ocppFeed: OCPPMessage[];
  currentScenario: string;
  onScenarioChange: (scenario: string) => void;
}

type CameraView = 'OVERVIEW' | 'GRID' | 'TRANSFORMER' | 'CHARGERS' | 'QUEUE';

export const DigitalTwinVisualizer: React.FC<DigitalTwinVisualizerProps> = ({
  hubs,
  sessions,
  transformer,
  metrics,
  decisionFeed,
  ocppFeed,
  currentScenario,
  onScenarioChange,
}) => {
  const [demoPlaying, setDemoPlaying] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const [cameraView, setCameraView] = useState<CameraView>('OVERVIEW');
  const [selectedGunId, setSelectedGunId] = useState<string | null>(null);
  const [faultedGuns, setFaultedGuns] = useState<Set<string>>(new Set());
  const [ambientTempSlider, setAmbientTempSlider] = useState<number>(28);
  const [spawnHubId, setSpawnHubId] = useState<string>('hub-a');
  const [spawnModel, setSpawnModel] = useState<string>('Tata Nexon EV');
  const [spawnSoc, setSpawnSoc] = useState<number>(18);
  const [isSpawning, setIsSpawning] = useState<boolean>(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Demo sequence configuration with synchronized camera presets
  const demoScenarios = [
    { name: 'NORMAL', camera: 'OVERVIEW' as CameraView, title: '1. Baseline Operating State', desc: '415V AC Grid Substation, healthy DC fast chargers, standard queue & transformer headroom.' },
    { name: 'PEAK_DEMAND', camera: 'QUEUE' as CameraView, title: '2. Peak Demand Surge & Queue Pressure', desc: 'EV arrival surge at Hub A (5 queued EVs). AI shifts driver recommendations to Hub B.' },
    { name: 'GRID_SURGE', camera: 'GRID' as CameraView, title: '3. Grid Surge & SLSQP Power Optimization', desc: 'Feeder load spikes to 194 kW. SLSQP continuous optimizer throttles high-SOC EVs.' },
    { name: 'HIGH_TEMP', camera: 'TRANSFORMER' as CameraView, title: '4. High Temp (40°C) Thermal Protection', desc: 'IEEE C57.91 thermal derating reduces continuous headroom to 6 kW with thermal heat-map aura.' },
    { name: 'CC_CV_CONGESTION', camera: 'CHARGERS' as CameraView, title: '5. CC-CV Taper & Anti-Taper Tariff', desc: 'EV-102 enters CV taper (92% SOC). Progressive anti-taper tariff (₹22/kWh) activates.' },
    { name: 'CHARGER_FAILURE', camera: 'CHARGERS' as CameraView, title: '6. Telemetry Anomaly & Driver Rerouting', desc: 'Gun-A4 fails (480ms latency). Isolation Forest flags fault; yellow reroute path guides driver to Hub B.' },
    { name: 'DRIVER_DELAY', camera: 'CHARGERS' as CameraView, title: '7. Phantom-Slot Capacity Recovery', desc: 'EV-08 delayed +12 min. Temporary 8-min top-up slot assigned to EV-17 while EV-08 protected.' },
    { name: 'RESET', camera: 'OVERVIEW' as CameraView, title: '8. Baseline Restoration', desc: 'Simulation state restored to standard operating baseline.' },
  ];

  // Auto Demo Tour Timer
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (demoPlaying) {
      timer = setInterval(() => {
        setDemoStep((prev) => {
          const nextStep = (prev + 1) % demoScenarios.length;
          const target = demoScenarios[nextStep];
          onScenarioChange(target.name);
          triggerScenario(target.name);
          setCameraView(target.camera);
          return nextStep;
        });
      }, 8000);
    }
    return () => clearInterval(timer);
  }, [demoPlaying, onScenarioChange]);

  const toggleDemoPlay = () => {
    if (!demoPlaying) {
      setDemoStep(0);
      onScenarioChange('NORMAL');
      triggerScenario('NORMAL');
      setCameraView('OVERVIEW');
      setDemoPlaying(true);
    } else {
      setDemoPlaying(false);
    }
  };

  const handleTempSlider = async (val: number) => {
    setAmbientTempSlider(val);
    await updateAmbientTemp(val);
  };

  const handleSpawnEV = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSpawning(true);
    window.dispatchEvent(
      new CustomEvent('hyperflow-spawn-ev', {
        detail: { hub_id: spawnHubId, vehicle_model: spawnModel, initial_soc: spawnSoc },
      })
    );
    await spawnEVInQueue(spawnHubId, spawnModel, spawnSoc);
    setTimeout(() => {
      setIsSpawning(false);
      showToast(`✓ ${spawnModel} arrived at ${spawnHubId.toUpperCase()} (${spawnSoc}% SOC) — Connected & Charging at 48 kW!`, 'success');
    }, 500);
  };

  const handleGunAction = async (gunId: string, action: string) => {
    await controlEVSEGun(gunId, action);
    if (action === 'FAULT') {
      setFaultedGuns((prev) => new Set([...prev, gunId]));
      showToast(`⚠ Telemetry fault injected into ${gunId} — anomaly detector triggered`, 'error');
    } else {
      setFaultedGuns((prev) => { const s = new Set(prev); s.delete(gunId); return s; });
      showToast(`✓ ${gunId} restored to 98% reliable service`, 'success');
    }
    setSelectedGunId(null);
  };

  // Default fallback hubs to prevent undefined property errors
  const defaultHubA: Hub = {
    id: 'hub-a',
    name: 'Hub A — OMR IT Corridor',
    location_tag: 'OMR IT Park',
    total_guns: 6,
    active_guns: 4,
    distance_km: 4.2,
    transformer_capacity_kw: 200,
    transformer_load_kw: 148,
    thermal_state_pct: 68,
    ambient_temp_c: 28.0,
    base_tariff_inr: 14.0,
    reliability_score: 98.0,
    current_queue_count: 0,
    predicted_queue_15m: 2,
    estimated_wait_min: 0,
    congestion_level: 'MODERATE',
  };

  const defaultHubB: Hub = {
    id: 'hub-b',
    name: 'Hub B — Guindy Metro Hub',
    location_tag: 'Guindy Metro',
    total_guns: 6,
    active_guns: 5,
    distance_km: 7.8,
    transformer_capacity_kw: 200,
    transformer_load_kw: 95,
    thermal_state_pct: 54,
    ambient_temp_c: 28.0,
    base_tariff_inr: 14.0,
    reliability_score: 98.0,
    current_queue_count: 0,
    predicted_queue_15m: 0,
    estimated_wait_min: 0,
    congestion_level: 'LOW',
  };

  const activeHubA = (hubs && hubs.length > 0) ? (hubs.find((h) => h.id === 'hub-a') || hubs[0] || defaultHubA) : defaultHubA;
  const activeHubB = (hubs && hubs.length > 1) ? (hubs.find((h) => h.id === 'hub-b') || hubs[1] || defaultHubB) : defaultHubB;

  const hubASessions = sessions.filter((s) => s.hub_id === 'hub-a');
  const hubBSessions = sessions.filter((s) => s.hub_id === 'hub-b');

  const isHighTemp = currentScenario === 'HIGH_TEMP' || (transformer ? transformer.ambient_temp_c > 35 : false);
  const isGridSurge = currentScenario === 'GRID_SURGE';
  const isFaulted = currentScenario === 'CHARGER_FAILURE';
  const isPhantom = currentScenario === 'DRIVER_DELAY';

  // 60fps Real-Time Canvas Renderer for Industrial Digital Twin Scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particleOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particleOffset = (particleOffset + 2.0) % 40;

      // Apply camera view scale / pan transformations
      ctx.save();
      if (cameraView === 'GRID') {
        ctx.scale(1.25, 1.25);
        ctx.translate(20, -10);
      } else if (cameraView === 'TRANSFORMER') {
        ctx.scale(1.3, 1.3);
        ctx.translate(-80, -30);
      } else if (cameraView === 'CHARGERS') {
        ctx.scale(1.2, 1.2);
        ctx.translate(-150, -40);
      } else if (cameraView === 'QUEUE') {
        ctx.scale(1.25, 1.25);
        ctx.translate(-180, -70);
      }

      // 1. SITE ASPHALT & BAY PARKING MARKS (BACKGROUND)
      ctx.fillStyle = '#080d1a';
      ctx.fillRect(0, 0, 960, 480);

      // Grid site lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < 960; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }

      // 2. GRID SUBSTATION STRUCTURE (LEFT)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.fillRect(20, 40, 160, 110);
      ctx.strokeRect(20, 40, 160, 110);

      ctx.fillStyle = '#0284c7';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('⚡ 415V SUBSTATION BUS', 30, 60);

      // Substation Transformers / Circuit Breakers
      ctx.fillStyle = '#334155';
      ctx.fillRect(35, 75, 30, 40);
      ctx.fillRect(85, 75, 30, 40);
      ctx.fillRect(135, 75, 30, 40);

      // 3. POWER FLOW ANIMATED LINES (Grid -> Transformer -> Hubs)
      const flowSpeed = isGridSurge ? 4.0 : 2.0;
      ctx.beginPath();
      ctx.moveTo(180, 95);
      ctx.lineTo(240, 95);
      ctx.lineTo(240, 180);
      ctx.lineTo(310, 180);
      ctx.strokeStyle = isGridSurge ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 6]);
      ctx.lineDashOffset = -particleOffset * flowSpeed;
      ctx.stroke();
      ctx.setLineDash([]);

      // 4. REALISTIC DISTRIBUTION TRANSFORMER #04 (CENTER LEFT)
      const transLoad = transformer ? transformer.current_load_kw : 148;
      const transTemp = transformer ? transformer.ambient_temp_c : 28;

      // Transformer Tank Shadow & Glow
      if (isHighTemp) {
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 20;
      }
      ctx.fillStyle = isHighTemp ? '#451a03' : '#0f172a';
      ctx.strokeStyle = isHighTemp ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.fillRect(310, 120, 180, 160);
      ctx.strokeRect(310, 120, 180, 160);
      ctx.shadowBlur = 0;

      // Transformer Cooling Fins / Radiators
      ctx.fillStyle = isHighTemp ? '#78350f' : '#1e293b';
      for (let finX = 320; finX < 480; finX += 16) {
        ctx.fillRect(finX, 135, 10, 80);
      }

      // Bushings & Warning Signage
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(330, 100, 12, 20);
      ctx.fillRect(395, 100, 12, 20);
      ctx.fillRect(455, 100, 12, 20);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(360, 230, 80, 24);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('DANGER 200kW', 365, 245);

      // Transformer Label Overlay
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('TRANSFORMER #04', 325, 272);

      // 5. HUB BAYS & DC FAST CHARGERS (RIGHT SECTION)
      const bays = [
        { y: 60, name: 'HUB A — BAY 01', sess: hubASessions[0], hub: activeHubA },
        { y: 200, name: 'HUB B — BAY 02', sess: hubBSessions[0], hub: activeHubB },
      ];

      bays.forEach((bay, idx) => {
        // Feeder connection line from Transformer to Bay
        ctx.beginPath();
        ctx.moveTo(490, 200);
        ctx.lineTo(550, bay.y + 40);
        ctx.lineTo(600, bay.y + 40);
        ctx.strokeStyle = isGridSurge ? '#ef4444' : '#38bdf8';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -particleOffset * (bay.sess ? bay.sess.allocated_power_kw / 20 : 1);
        ctx.stroke();
        ctx.setLineDash([]);

        // DC Fast Charger Cabinet Structure
        const chargerX = 600;
        const chargerY = bay.y;
        const gunFault = idx === 0 && isFaulted;

        ctx.fillStyle = gunFault ? '#450a0a' : '#0f172a';
        ctx.strokeStyle = gunFault ? '#ef4444' : '#0284c7';
        ctx.lineWidth = 2;
        ctx.fillRect(chargerX, chargerY, 50, 90);
        ctx.strokeRect(chargerX, chargerY, 50, 90);

        // Charger Digital Display & Status LED
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(chargerX + 8, chargerY + 12, 34, 24);
        ctx.fillStyle = gunFault ? '#ef4444' : '#10b981';
        ctx.beginPath();
        ctx.arc(chargerX + 25, chargerY + 46, 5, 0, Math.PI * 2);
        ctx.fill();

        // 6. REALISTIC EV CAR MODELS & CHARGING CABLES
        const carX = 720;
        const carY = bay.y + 15;

        // Marked EV Bay Asphalt Base
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 2;
        ctx.strokeRect(690, bay.y, 180, 90);

        // Heavy DC Charging Cable connected to EV Charging Port
        ctx.beginPath();
        ctx.moveTo(chargerX + 45, chargerY + 60);
        ctx.quadraticCurveTo(carX - 20, carY + 30, carX + 10, carY + 30);
        ctx.strokeStyle = gunFault ? '#ef4444' : '#10b981';
        ctx.lineWidth = 4;
        ctx.stroke();

        // EV Car Body Representation
        ctx.fillStyle = idx === 0 ? '#0284c7' : '#0d9488';
        ctx.fillRect(carX, carY, 130, 60);
        ctx.strokeRect(carX, carY, 130, 60);

        // EV Roof / Windshield
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(carX + 30, carY + 10, 70, 40);

        // 4 EV Wheels
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(carX + 15, carY - 5, 24, 8);
        ctx.fillRect(carX + 90, carY - 5, 24, 8);
        ctx.fillRect(carX + 15, carY + 57, 24, 8);
        ctx.fillRect(carX + 90, carY + 57, 24, 8);

        // Headlights & Taillights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(carX + 126, carY + 5, 4, 12);
        ctx.fillRect(carX + 126, carY + 43, 4, 12);

        // EV Telemetry Label
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        const modelName = idx === 0 ? 'Tata Nexon EV' : (isPhantom ? 'EV-17 (Phantom)' : 'BYD Atto 3');
        const socVal = bay.sess ? bay.sess.current_soc.toFixed(1) : '62.0';
        const powerVal = bay.sess ? bay.sess.allocated_power_kw.toFixed(1) : '42.0';
        ctx.fillText(`${modelName}`, carX + 5, carY + 28);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`SOC ${socVal}% • ${powerVal} kW`, carX + 5, carY + 45);
      });

      // 7. REROUTE LASER PATH IF CHARGER FAULTED
      if (isFaulted) {
        ctx.beginPath();
        ctx.moveTo(650, 100);
        ctx.quadraticCurveTo(620, 160, 650, 240);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -particleOffset * 1.5;
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('⚡ REROUTE PATH → BAY 02', 660, 175);
      }

      // 8. FACILITY PARKING QUEUE AREA (BOTTOM RIGHT)
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#334155';
      ctx.fillRect(600, 360, 320, 90);
      ctx.strokeRect(600, 360, 320, 90);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`PARKING QUEUE AREA (${activeHubA.current_queue_count} EVs WAITING)`, 615, 382);

      // Render Queued Waiting Cars
      for (let q = 0; q < Math.min(3, activeHubA.current_queue_count); q++) {
        const qCarX = 620 + q * 90;
        ctx.fillStyle = '#334155';
        ctx.fillRect(qCarX, 395, 75, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`EV-Q-0${q + 1}`, qCarX + 12, 420);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [hubs, activeHubA, activeHubB, hubASessions, hubBSessions, transformer, currentScenario, cameraView, isGridSurge, isHighTemp, isFaulted, isPhantom]);

  const latestDecision = decisionFeed.length > 0 ? decisionFeed[0] : null;

  return (
    <div className="space-y-6 animate-fade-in font-mono relative">
      {/* Toast notification overlay */}
      {toast && (
        <div className="fixed top-20 right-6 z-[9999] pointer-events-none">
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-mono font-bold animate-fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/60 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-red-950/95 border-red-500/60 text-red-300'
              : 'bg-cyan-950/95 border-cyan-500/60 text-cyan-300'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400 animate-pulse" />}
            {toast.type === 'info' && <Zap className="w-4 h-4 flex-shrink-0 text-cyan-400" />}
            {toast.msg}
          </div>
        </div>
      )}

      {/* TOP DEMO PLAY & CAMERA PRESETS HEADER BAR */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleDemoPlay}
            className={`px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition duration-300 flex items-center gap-2 shadow-glow ${
              demoPlaying
                ? 'bg-amber-500 text-slate-950 shadow-glow-amber animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950'
            }`}
          >
            {demoPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                PAUSE DEMO (STEP {demoStep + 1}/8)
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                ▶ DEMO PLAY (AUTO 60S TOUR)
              </>
            )}
          </button>

          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              {demoPlaying ? demoScenarios[demoStep].title : 'REALISTIC INDUSTRIAL DIGITAL TWIN CONTROL SCENE'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {demoPlaying ? demoScenarios[demoStep].desc : 'High-fidelity engineering simulation driven by 1Hz Python WebSocket telemetry.'}
            </p>
          </div>
        </div>

        {/* CAMERA PRESET BUTTONS */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> CAMERA:
          </span>
          {(['OVERVIEW', 'GRID', 'TRANSFORMER', 'CHARGERS', 'QUEUE'] as CameraView[]).map((cam) => (
            <button
              key={cam}
              onClick={() => setCameraView(cam)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                cameraView === cam
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {cam}
            </button>
          ))}
        </div>
      </div>

      {/* HERO CANVAS 2.5D REALISTIC SCENE & HUD OVERLAY */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-slate-800 space-y-6">
        
        {/* HUD FLOATING METRICS OVERLAY */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 backdrop-blur-md relative z-20">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">FEEDER LOAD</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">
              {transformer ? transformer.current_load_kw.toFixed(1) : (148.0).toFixed(1)} kW
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">SAFE HEADROOM</div>
            <div className={`text-lg font-black mt-0.5 ${isHighTemp ? 'text-amber-400' : 'text-emerald-400'}`}>
              {transformer ? transformer.safe_headroom_kw.toFixed(1) : (52.0).toFixed(1)} kW
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">AMBIENT TEMP</div>
            <div className={`text-lg font-black mt-0.5 ${isHighTemp ? 'text-amber-400' : 'text-slate-200'}`}>
              {transformer ? transformer.ambient_temp_c.toFixed(1) : (28.0).toFixed(1)}°C
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">ACTIVE SESSIONS</div>
            <div className="text-lg font-black text-white mt-0.5">{sessions.length}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">SLSQP OPTIMIZER</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> ACTIVE
            </div>
          </div>
        </div>

        {/* 2.5D REALISTIC CANVAS SCENE */}
        <div className="relative w-full h-[480px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden p-2">
          <canvas
            ref={canvasRef}
            width={960}
            height={480}
            className="w-full h-full object-cover pointer-events-none z-10"
          />
        </div>

        {/* INTERACTIVE CONTROLS BAR: AMBIENT TEMP DIAL & SPAWN EV */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-mono">
          <div className="lg:col-span-6 glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase">
                <Flame className="w-4 h-4 text-amber-400" />
                INTERACTIVE AMBIENT TEMP DIAL (IEEE C57.91)
              </div>
              <span className="text-sm font-black text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                {ambientTempSlider}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Slide ambient temperature to watch dynamic transformer thermal headroom derate in real time.
            </p>
            <input
              type="range"
              min="10"
              max="50"
              value={ambientTempSlider}
              onChange={(e) => handleTempSlider(Number(e.target.value))}
              className="w-full accent-amber-400 bg-slate-950 rounded-lg cursor-pointer h-2"
            />
          </div>

          <form onSubmit={handleSpawnEV} className="lg:col-span-6 glass-panel p-5 rounded-2xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase">
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                SPAWN DRIVER EV INTO QUEUE
              </div>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                QUEUE INJECTOR
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Select Hub</label>
                <select
                  value={spawnHubId}
                  onChange={(e) => setSpawnHubId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                >
                  <option value="hub-a">Hub A (OMR)</option>
                  <option value="hub-b">Hub B (Guindy)</option>
                  <option value="hub-c">Hub C (Airport)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">EV Model</label>
                <select
                  value={spawnModel}
                  onChange={(e) => setSpawnModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs"
                >
                  <option value="Tata Nexon EV">Tata Nexon EV</option>
                  <option value="MG ZS EV">MG ZS EV</option>
                  <option value="BYD Atto 3">BYD Atto 3</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Initial SOC ({spawnSoc}%)</label>
                <input
                  type="range"
                  min="5"
                  max="45"
                  value={spawnSoc}
                  onChange={(e) => setSpawnSoc(Number(e.target.value))}
                  className="w-full accent-cyan-400 bg-slate-950 h-2 cursor-pointer mt-2"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSpawning}
              className={`w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-1.5 shadow-glow active:scale-95 ${isSpawning ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_0_20px_-4px_rgba(34,211,238,0.7)]'}`}
            >
              {isSpawning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Spawning EV into Queue...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  ✦ SPAWN EV INTO SIMULATION QUEUE
                </>
              )}
            </button>
          </form>
        </div>

        {/* 36-GUN INTERACTIVE CHARGER MATRIX VISUALIZER */}
        <div className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                36-GUN INTERACTIVE EVSE MATRIX (CLICK ANY GUN TO INSPECT & INJECT FAULT)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Click any virtual charger gun to open the Digital Twin Inspector, trigger faults, or restore service</p>
            </div>
            <span className="text-[10px] font-mono bg-cyan-500/10 text-cyan-400 px-2.5 py-1 rounded border border-cyan-500/30">
              INTERACTIVE MATRIX ACTIVE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hubs.map((hub) => (
              <div key={hub.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div>
                    <span className="font-bold text-xs text-white">{hub.name}</span>
                    <div className="text-[10px] text-slate-400 font-mono">Load: {hub.transformer_load_kw} kW • Queue: {hub.current_queue_count}</div>
                  </div>
                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded ${
                    hub.congestion_level === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {hub.congestion_level}
                  </span>
                </div>

                {/* 6 Guns Grid for this Hub */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6].map((gunIdx) => {
                    const gunId = `gun-${hub.id}-${gunIdx}`;
                    const isCharging = gunIdx <= hub.active_guns;
                    const isHardFault = (currentScenario === 'CHARGER_FAILURE' && gunId === 'gun-hub-a-4') || faultedGuns.has(gunId);
                    const isSelected = selectedGunId === gunId && !isHardFault;

                    return (
                      <div
                        key={gunIdx}
                        onClick={() => setSelectedGunId(gunId)}
                        title={`Click to open EVSE Inspector for ${gunId}`}
                        className={`p-2.5 rounded-lg border text-center font-mono cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 ${
                          isHardFault
                            ? 'bg-red-950/50 border-red-500/80 text-red-300 shadow-[0_0_12px_-2px_rgba(239,68,68,0.6)]'
                            : isSelected
                            ? 'bg-yellow-500/20 border-yellow-400/80 text-yellow-200 shadow-[0_0_12px_-2px_rgba(234,179,8,0.5)] ring-2 ring-yellow-400/60'
                            : isCharging
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300 hover:border-cyan-400 hover:shadow-[0_0_8px_-2px_rgba(34,211,238,0.4)]'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <div className="text-[10px] font-bold flex items-center justify-center gap-1">
                          G-{gunIdx}
                          {isHardFault && <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />}
                          {isSelected && <Wrench className="w-3 h-3 text-yellow-400" />}
                        </div>
                        <div className="text-[9px] font-bold mt-0.5">
                          {isHardFault ? 'FAULT' : isSelected ? 'SELECTED' : isCharging ? 'CHARGING' : 'AVAILABLE'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {isHardFault ? '0.0 kW' : isCharging ? (gunIdx === 1 ? '45.0 kW' : gunIdx === 2 ? '18.0 kW' : '42.0 kW') : '0.0 kW'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GUN DIGITAL TWIN INSPECTOR MODAL */}
        {selectedGunId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl border border-cyan-500/50 max-w-md w-full space-y-4 font-mono animate-scale-up shadow-2xl relative">
              <button
                onClick={() => setSelectedGunId(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-900 border border-slate-800"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Wrench className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="text-base font-extrabold text-white">EVSE GUN DIGITAL TWIN INSPECTOR</h4>
                  <div className="text-xs text-cyan-400 font-bold">{selectedGunId}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                {(() => {
                  const isFaulty = selectedGunId ? (faultedGuns.has(selectedGunId) || (currentScenario === 'CHARGER_FAILURE' && selectedGunId === 'gun-hub-a-4')) : false;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Max Configured Power:</span>
                        <span className="text-white font-bold">60.0 kW</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Heartbeat Latency:</span>
                        <span className={isFaulty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isFaulty ? '480.0 ms ⚠' : '42.0 ms ✓'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Power Jitter:</span>
                        <span className={isFaulty ? 'text-red-400 font-bold' : 'text-slate-200'}>
                          {isFaulty ? '4.2 kW ⚠' : '0.2 kW ✓'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Reliability Score:</span>
                        <span className={isFaulty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isFaulty ? '28.0% ⚠' : '98.0% ✓'}
                        </span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-800">
                        <span className="text-slate-400">Overall Status:</span>
                        <span className={isFaulty ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isFaulty ? '⛔ ANOMALY DETECTED' : '✓ HEALTHY'}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleGunAction(selectedGunId, 'FAULT')}
                  className="w-full py-2.5 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-bold border border-red-500/40 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                  INJECT TELEMETRY FAULT (LATENCY & JITTER)
                </button>

                <button
                  onClick={() => handleGunAction(selectedGunId, 'RESET')}
                  className="w-full py-2.5 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40 rounded-xl text-xs flex items-center justify-center gap-2 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  RESTORE GUN TO 98% RELIABLE SERVICE
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
