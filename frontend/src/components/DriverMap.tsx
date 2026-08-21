import React, { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Navigation,
  MapPin,
  Zap,
  Clock,
  ShieldCheck,
  Leaf,
  Filter,
  Route as RouteIcon,
  ChevronDown,
  ChevronUp,
  Cpu,
  Compass,
  BatteryCharging,
  Gauge
} from 'lucide-react';
import { Hub, HubRecommendation } from '../types';
import {
  findPathAStar,
  findPathDijkstra,
  findPathEcoGreen,
  RouteResult,
  CHENNAI_ROAD_GRAPH
} from '../utils/routingEngine';

interface DriverMapProps {
  hubs: Hub[];
  recommendations: HubRecommendation[];
  bestRecommendation: HubRecommendation | null;
  selectedHubId: string | null;
  onSelectHub: (hubId: string) => void;
  onGetRoute: (hubId: string) => void;
}

// Fixed Simulated Coordinates for Chennai EV Charging Network
const DRIVER_COORDS: [number, number] = [12.9080, 80.2240]; // OMR IT Corridor (Karapakkam)

// 10 EV Charging Hub Coordinates Across Chennai
export const HUB_COORDS: Record<string, [number, number]> = {
  'hub-a': [12.9010, 80.2279], // Hub A — OMR Sholinganallur
  'hub-b': [13.0067, 80.2020], // Hub B — Guindy Metro Hub
  'hub-c': [12.9815, 80.1645], // Hub C — Chennai Airport GST Road
  'hub-d': [13.0850, 80.2101], // Hub D — Anna Nagar & Koyambedu CMBT
  'hub-e': [13.0418, 80.2341], // Hub E — T. Nagar Central Hub (Anna Salai)
  'hub-f': [12.9915, 80.2170], // Hub F — Velachery Phoenix Hub
  'hub-g': [13.0336, 80.1583], // Hub G — Porur DLF Cybercity Hub
  'hub-h': [12.9830, 80.2594], // Hub H — ECR Thiruvanmiyur Beach Hub
  'hub-i': [12.8285, 80.2195], // Hub I — Siruseri SIPCOT Supercharger
  'hub-j': [13.0980, 80.1620], // Hub J — Ambattur Industrial Tech Hub
};

// Map Recenter Controller with Invalidation for tab switching
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 11 }) => {
  const map = useMap();
  useEffect(() => {
    // Invalidate size immediately so Leaflet calculates bounds correctly
    map.invalidateSize();
    const timer = setTimeout(() => {
      map.invalidateSize();
      map.flyTo(center, zoom, { duration: 1.0 });
    }, 150);
    return () => clearTimeout(timer);
  }, [center, zoom, map]);
  return null;
};

// Marker DivIcons Helper
const createMarkerIcon = (color: string, label: string, isSelected: boolean = false, isBest: boolean = false) => {
  const ringClass = isSelected ? 'ring-4 ring-cyan-400 scale-110 shadow-glow' : isBest ? 'ring-2 ring-blue-400' : '';
  const pulseClass = isSelected ? '<span class="absolute w-8 h-8 rounded-full bg-cyan-400 animate-ping opacity-60"></span>' : '';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `
      <div class="relative flex items-center justify-center">
        ${pulseClass}
        <div class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-slate-950 font-mono shadow-xl transition-transform ${ringClass}" style="background-color: ${color}">
          ${label}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const driverIcon = L.divIcon({
  className: 'custom-driver-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <span class="absolute w-9 h-9 rounded-full bg-cyan-400 animate-ping opacity-75"></span>
      <div class="w-8 h-8 rounded-full bg-cyan-500 border-2 border-white flex items-center justify-center text-slate-950 shadow-glow">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export const DriverMap: React.FC<DriverMapProps> = ({
  hubs,
  recommendations,
  bestRecommendation,
  selectedHubId,
  onSelectHub,
  onGetRoute,
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [routingAlgorithm, setRoutingAlgorithm] = useState<'A_STAR' | 'DIJKSTRA' | 'ECO_GREEN'>('A_STAR');
  const [showDirections, setShowDirections] = useState<boolean>(false);

  const activeHubId = selectedHubId || bestRecommendation?.hub_id || 'hub-b';

  // Calculate Optimal Road Network Route using Selected Algorithm
  const routeResult: RouteResult = useMemo(() => {
    if (routingAlgorithm === 'A_STAR') {
      return findPathAStar('driver_origin', activeHubId);
    } else if (routingAlgorithm === 'DIJKSTRA') {
      return findPathDijkstra('driver_origin', activeHubId);
    } else {
      return findPathEcoGreen('driver_origin', activeHubId);
    }
  }, [activeHubId, routingAlgorithm]);

  // Merge full hub list with fallback coordinates
  const allDisplayHubs = useMemo(() => {
    // If backend only returns 6 hubs, merge default 10 hubs so map is full
    const existingIds = new Set(hubs.map((h) => h.id));
    const fallbackHubs: Hub[] = [
      {
        id: 'hub-g',
        name: 'Hub G — Porur DLF Cybercity',
        location_tag: 'Mount-Poonamallee High Rd, Porur',
        total_guns: 6,
        active_guns: 3,
        distance_km: 5.4,
        transformer_capacity_kw: 240,
        transformer_load_kw: 130,
        thermal_state_pct: 54,
        ambient_temp_c: 28,
        base_tariff_inr: 12.0,
        reliability_score: 96,
        current_queue_count: 0,
        predicted_queue_15m: 1,
        estimated_wait_min: 0,
        congestion_level: 'LOW',
      },
      {
        id: 'hub-h',
        name: 'Hub H — ECR Thiruvanmiyur Beach Hub',
        location_tag: 'East Coast Road, Thiruvanmiyur',
        total_guns: 6,
        active_guns: 2,
        distance_km: 4.6,
        transformer_capacity_kw: 180,
        transformer_load_kw: 68,
        thermal_state_pct: 38,
        ambient_temp_c: 28,
        base_tariff_inr: 13.0,
        reliability_score: 98,
        current_queue_count: 0,
        predicted_queue_15m: 0,
        estimated_wait_min: 0,
        congestion_level: 'LOW',
      },
      {
        id: 'hub-i',
        name: 'Hub I — Siruseri SIPCOT Supercharger',
        location_tag: 'SIPCOT IT Park Phase 2, OMR',
        total_guns: 8,
        active_guns: 4,
        distance_km: 8.2,
        transformer_capacity_kw: 300,
        transformer_load_kw: 145,
        thermal_state_pct: 48,
        ambient_temp_c: 28,
        base_tariff_inr: 11.0,
        reliability_score: 99,
        current_queue_count: 0,
        predicted_queue_15m: 1,
        estimated_wait_min: 0,
        congestion_level: 'LOW',
      },
      {
        id: 'hub-j',
        name: 'Hub J — Ambattur Industrial Tech Hub',
        location_tag: 'Ambattur Industrial Estate 3rd Main',
        total_guns: 6,
        active_guns: 2,
        distance_km: 11.2,
        transformer_capacity_kw: 200,
        transformer_load_kw: 80,
        thermal_state_pct: 40,
        ambient_temp_c: 28,
        base_tariff_inr: 10.0,
        reliability_score: 95,
        current_queue_count: 0,
        predicted_queue_15m: 0,
        estimated_wait_min: 0,
        congestion_level: 'LOW',
      },
    ];

    const merged = [...hubs];
    fallbackHubs.forEach((fh) => {
      if (!existingIds.has(fh.id)) merged.push(fh);
    });
    return merged;
  }, [hubs]);

  const filteredHubs = allDisplayHubs.filter((h) => {
    if (filter === 'AVAILABLE') return h.active_guns < h.total_guns;
    if (filter === 'LOW_WAIT') return h.estimated_wait_min <= 5;
    if (filter === 'FAST') return h.transformer_capacity_kw >= 200;
    if (filter === 'HIGH_REL') return h.reliability_score >= 95;
    return true;
  });

  const activeHubObj = allDisplayHubs.find((h) => h.id === activeHubId) || allDisplayHubs[0];

  return (
    <div className="glass-panel p-4 rounded-2xl space-y-3 relative overflow-hidden flex flex-col min-h-[580px] font-sans">
      
      {/* Map Header, Algorithm Selector & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3 z-10">
        
        {/* Title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="font-extrabold text-xs text-white uppercase tracking-wider flex items-center gap-2">
              CHENNAI REAL-TIME EV NAVIGATION & CHARGER MAP
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Graph-based A* &amp; Dijkstra Multi-Objective Routing
            </span>
          </div>
        </div>

        {/* Algorithm Switcher Bar */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 px-2 flex items-center gap-1 font-bold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> ALGORITHM:
          </span>
          
          <button
            onClick={() => setRoutingAlgorithm('A_STAR')}
            title="A* Fast Path with Euclidean & Congestion Heuristic"
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
              routingAlgorithm === 'A_STAR'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Zap className="w-3 h-3 text-cyan-400" />
            A* FAST
          </button>

          <button
            onClick={() => setRoutingAlgorithm('DIJKSTRA')}
            title="Dijkstra Multi-Objective (Time + Congestion Balanced)"
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
              routingAlgorithm === 'DIJKSTRA'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <RouteIcon className="w-3 h-3 text-blue-400" />
            DIJKSTRA
          </button>

          <button
            onClick={() => setRoutingAlgorithm('ECO_GREEN')}
            title="Green Eco-Regen Route (Optimized battery efficiency)"
            className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition flex items-center gap-1 ${
              routingAlgorithm === 'ECO_GREEN'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Leaf className="w-3 h-3 text-emerald-400" />
            ECO GREEN
          </button>
        </div>

        {/* Hub Filters Bar */}
        <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-mono">
          <Filter className="w-3 h-3 text-slate-400 mr-1" />
          {['ALL', 'AVAILABLE', 'LOW_WAIT', 'FAST', 'HIGH_REL'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-0.5 rounded border transition ${
                filter === f
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Real-time Route Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 shadow-md">
        <div>
          <div className="text-[9px] text-slate-400 uppercase">TARGET DESTINATION</div>
          <div className="text-white font-extrabold truncate mt-0.5">{activeHubObj?.name || 'Selected Hub'}</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 uppercase">ROUTE DISTANCE</div>
          <div className="text-cyan-400 font-extrabold mt-0.5">{routeResult.totalDistanceKm} km</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 uppercase">EST. TRAVEL TIME</div>
          <div className="text-emerald-400 font-extrabold mt-0.5">{routeResult.estimatedDurationMin} min</div>
        </div>
        <div>
          <div className="text-[9px] text-slate-400 uppercase">EV ENERGY USED</div>
          <div className="text-amber-400 font-extrabold mt-0.5">{routeResult.energyConsumptionKwh} kWh</div>
        </div>
        <div className="flex items-center justify-end col-span-2 sm:col-span-1">
          <button
            onClick={() => setShowDirections((v) => !v)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-700 hover:border-cyan-500 transition"
          >
            <span>{showDirections ? 'Hide Steps' : 'Turn Steps'}</span>
            {showDirections ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Turn-by-Turn Expandable Directions Drawer */}
      {showDirections && (
        <div className="p-3 bg-slate-950/95 border border-cyan-500/30 rounded-xl text-xs font-mono space-y-1.5 max-h-36 overflow-y-auto animate-fade-in z-20">
          <div className="text-[10px] font-bold text-cyan-400 uppercase flex items-center justify-between border-b border-slate-800 pb-1">
            <span>TURN-BY-TURN ROAD GUIDANCE ({routeResult.algorithmName})</span>
            <span>{routeResult.turnByTurn.length} Waypoints</span>
          </div>
          <div className="space-y-1 pt-1">
            {routeResult.turnByTurn.map((step, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                <span className="w-4 h-4 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 flex items-center justify-center text-[9px] font-bold">
                  {idx + 1}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaflet Interactive Map Canvas */}
      <div className="w-full rounded-xl overflow-hidden relative z-0 border border-slate-800 h-[460px] min-h-[460px]">
        <MapContainer
          center={[12.9800, 80.2100]}
          zoom={11}
          scrollWheelZoom={true}
          style={{ width: '100%', height: '460px', minHeight: '460px', backgroundColor: '#090d16' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapRecenter center={HUB_COORDS[activeHubId] || DRIVER_COORDS} />

          {/* Simulated Driver Marker */}
          <Marker position={DRIVER_COORDS} icon={driverIcon}>
            <Popup className="dark-popup">
              <div className="text-xs font-mono p-1">
                <strong className="text-cyan-400 font-bold">MY CURRENT LOCATION</strong>
                <p className="text-slate-300 text-[11px]">OMR IT Corridor, Karapakkam, Chennai</p>
                <div className="mt-1 text-[10px] text-emerald-400 font-bold">EV Ready: 18% SOC</div>
              </div>
            </Popup>
          </Marker>

          {/* Real Graph-based Road Polyline Route (A*, Dijkstra, Eco-Green) */}
          <Polyline
            positions={routeResult.pathCoords}
            pathOptions={{
              color: routingAlgorithm === 'ECO_GREEN' ? '#10b981' : routingAlgorithm === 'DIJKSTRA' ? '#60a5fa' : '#22d3ee',
              weight: 5,
              opacity: 0.9,
              dashArray: routingAlgorithm === 'ECO_GREEN' ? '6, 6' : undefined,
            }}
          />

          {/* Charging Hub Markers */}
          {filteredHubs.map((h) => {
            const isBest = bestRecommendation?.hub_id === h.id;
            const isSelected = activeHubId === h.id;
            const rec = recommendations.find((r) => r.hub_id === h.id);

            // Marker Color Logic
            let color = '#10b981'; // Green
            if (h.reliability_score < 80 || h.congestion_level === 'CRITICAL') color = '#ef4444'; // Red
            else if (h.congestion_level === 'HIGH' || h.estimated_wait_min > 15) color = '#f59e0b'; // Yellow
            else if (isBest) color = '#38bdf8'; // Blue for AI Best

            const iconLabel = h.id.replace('hub-', '').toUpperCase();
            const icon = createMarkerIcon(color, iconLabel, isSelected, isBest);
            const coords = HUB_COORDS[h.id] || DRIVER_COORDS;

            return (
              <Marker
                key={h.id}
                position={coords}
                icon={icon}
                eventHandlers={{
                  click: () => onSelectHub(h.id),
                }}
              >
                <Popup className="custom-dark-leaflet-popup">
                  <div className="p-2 space-y-2 text-xs font-mono w-56">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-1">
                      <strong className="text-white font-bold">{h.name}</strong>
                      {isBest && (
                        <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-extrabold px-1.5 py-0.5 rounded border border-cyan-500/40">
                          BEST AI
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Distance:</span>
                        <strong className="text-slate-100">{h.distance_km} km</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Wait Time:</span>
                        <strong className={h.estimated_wait_min > 10 ? 'text-amber-400' : 'text-emerald-400'}>
                          {h.estimated_wait_min} min
                        </strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Guns Available:</span>
                        <strong className="text-slate-100">{h.total_guns - h.active_guns}/{h.total_guns}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Capacity:</span>
                        <strong className="text-cyan-400">{h.transformer_capacity_kw} kW</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Base Tariff:</span>
                        <strong className="text-slate-100">₹{h.base_tariff_inr}/kWh</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Reliability:</span>
                        <strong className="text-emerald-400">{h.reliability_score}%</strong>
                      </div>
                    </div>

                    <div className="pt-1.5 flex gap-1.5">
                      <button
                        onClick={() => onSelectHub(h.id)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded text-[10px] border border-slate-700"
                      >
                        SELECT
                      </button>
                      <button
                        onClick={() => onGetRoute(h.id)}
                        className="flex-1 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-[10px] shadow-glow"
                      >
                        NAVIGATE
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Map Legend */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow" /> Selected / AI Best
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> High Availability
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Moderate Queue
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Congested / Degraded
          </span>
        </div>
        <div className="text-[10px] text-cyan-400 font-bold">
          10 EV Fast Charging Hubs Active
        </div>
      </div>

    </div>
  );
};
