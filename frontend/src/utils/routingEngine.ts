/**
 * HyperFlow AI — Advanced Road Network Routing Engine
 * Implements Graph-based A* (A-Star), Dijkstra, and Green Eco-Routing algorithms
 * across key Chennai metropolitan arterial road networks.
 */

export interface RoadNode {
  id: string;
  name: string;
  coords: [number, number]; // [lat, lng]
  adjacent: Array<{ targetId: string; distanceKm: number; speedKmh: number; congestionFactor: number }>;
}

export interface RouteResult {
  algorithm: 'A_STAR' | 'DIJKSTRA' | 'ECO_GREEN';
  algorithmName: string;
  pathCoords: [number, number][];
  totalDistanceKm: number;
  estimatedDurationMin: number;
  energyConsumptionKwh: number;
  co2AvoidedKg: number;
  turnByTurn: string[];
}

// Chennai Arterial Highway & Major Road Network Graph Nodes
export const CHENNAI_ROAD_GRAPH: Record<string, RoadNode> = {
  // Origin / Local OMR
  'driver_origin': {
    id: 'driver_origin',
    name: 'Karapakkam Tech Hub (Driver Origin)',
    coords: [12.9080, 80.2240],
    adjacent: [
      { targetId: 'hub-a', distanceKm: 1.2, speedKmh: 45, congestionFactor: 1.3 },
      { targetId: 'thoraipakkam_200ft', distanceKm: 3.1, speedKmh: 50, congestionFactor: 1.1 },
    ],
  },
  'hub-a': {
    id: 'hub-a',
    name: 'Hub A — OMR Sholinganallur',
    coords: [12.9010, 80.2279],
    adjacent: [
      { targetId: 'driver_origin', distanceKm: 1.2, speedKmh: 45, congestionFactor: 1.3 },
      { targetId: 'hub-i', distanceKm: 8.2, speedKmh: 65, congestionFactor: 1.0 },
      { targetId: 'medavakkam_jn', distanceKm: 4.8, speedKmh: 40, congestionFactor: 1.4 },
      { targetId: 'thoraipakkam_200ft', distanceKm: 3.9, speedKmh: 50, congestionFactor: 1.2 },
    ],
  },
  'hub-i': {
    id: 'hub-i',
    name: 'Hub I — Siruseri SIPCOT Supercharger',
    coords: [12.8285, 80.2195],
    adjacent: [
      { targetId: 'hub-a', distanceKm: 8.2, speedKmh: 65, congestionFactor: 1.0 },
    ],
  },
  'thoraipakkam_200ft': {
    id: 'thoraipakkam_200ft',
    name: 'Thoraipakkam 200ft Radial Rd Junction',
    coords: [12.9350, 80.2310],
    adjacent: [
      { targetId: 'driver_origin', distanceKm: 3.1, speedKmh: 50, congestionFactor: 1.1 },
      { targetId: 'hub-a', distanceKm: 3.9, speedKmh: 50, congestionFactor: 1.2 },
      { targetId: 'perungudi_toll', distanceKm: 3.5, speedKmh: 55, congestionFactor: 1.1 },
      { targetId: 'keelkattalai_radial', distanceKm: 6.2, speedKmh: 60, congestionFactor: 1.1 },
    ],
  },
  'perungudi_toll': {
    id: 'perungudi_toll',
    name: 'Perungudi OMR Toll Plaza',
    coords: [12.9650, 80.2420],
    adjacent: [
      { targetId: 'thoraipakkam_200ft', distanceKm: 3.5, speedKmh: 55, congestionFactor: 1.1 },
      { targetId: 'tidel_park_jn', distanceKm: 2.8, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'velachery_mrts', distanceKm: 3.2, speedKmh: 40, congestionFactor: 1.3 },
    ],
  },
  'tidel_park_jn': {
    id: 'tidel_park_jn',
    name: 'TIDEL Park / Madhya Kailash Junction',
    coords: [12.9890, 80.2490],
    adjacent: [
      { targetId: 'perungudi_toll', distanceKm: 2.8, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'hub-h', distanceKm: 1.8, speedKmh: 45, congestionFactor: 1.1 },
      { targetId: 'saidapet_bridge', distanceKm: 4.2, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'hub-f', distanceKm: 3.5, speedKmh: 40, congestionFactor: 1.2 },
    ],
  },
  'hub-h': {
    id: 'hub-h',
    name: 'Hub H — ECR Thiruvanmiyur Beach Hub',
    coords: [12.9830, 80.2594],
    adjacent: [
      { targetId: 'tidel_park_jn', distanceKm: 1.8, speedKmh: 45, congestionFactor: 1.1 },
    ],
  },
  'velachery_mrts': {
    id: 'velachery_mrts',
    name: 'Velachery MRTS Bypass Road',
    coords: [12.9800, 80.2220],
    adjacent: [
      { targetId: 'perungudi_toll', distanceKm: 3.2, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'hub-f', distanceKm: 1.4, speedKmh: 35, congestionFactor: 1.4 },
      { targetId: 'medavakkam_jn', distanceKm: 6.5, speedKmh: 45, congestionFactor: 1.2 },
    ],
  },
  'hub-f': {
    id: 'hub-f',
    name: 'Hub F — Velachery Phoenix Hub',
    coords: [12.9915, 80.2170],
    adjacent: [
      { targetId: 'velachery_mrts', distanceKm: 1.4, speedKmh: 35, congestionFactor: 1.4 },
      { targetId: 'tidel_park_jn', distanceKm: 3.5, speedKmh: 40, congestionFactor: 1.2 },
      { targetId: 'kathipara_cloverleaf', distanceKm: 2.9, speedKmh: 50, congestionFactor: 1.2 },
    ],
  },
  'medavakkam_jn': {
    id: 'medavakkam_jn',
    name: 'Medavakkam Koot Road',
    coords: [12.9180, 80.1920],
    adjacent: [
      { targetId: 'hub-a', distanceKm: 4.8, speedKmh: 40, congestionFactor: 1.4 },
      { targetId: 'velachery_mrts', distanceKm: 6.5, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'keelkattalai_radial', distanceKm: 4.1, speedKmh: 45, congestionFactor: 1.2 },
    ],
  },
  'keelkattalai_radial': {
    id: 'keelkattalai_radial',
    name: 'Keelkattalai 200ft Radial Road',
    coords: [12.9520, 80.1750],
    adjacent: [
      { targetId: 'thoraipakkam_200ft', distanceKm: 6.2, speedKmh: 60, congestionFactor: 1.1 },
      { targetId: 'medavakkam_jn', distanceKm: 4.1, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'hub-c', distanceKm: 3.6, speedKmh: 55, congestionFactor: 1.1 },
    ],
  },
  'hub-c': {
    id: 'hub-c',
    name: 'Hub C — Chennai Airport GST Hub',
    coords: [12.9815, 80.1645],
    adjacent: [
      { targetId: 'keelkattalai_radial', distanceKm: 3.6, speedKmh: 55, congestionFactor: 1.1 },
      { targetId: 'kathipara_cloverleaf', distanceKm: 4.5, speedKmh: 60, congestionFactor: 1.2 },
      { targetId: 'hub-g', distanceKm: 6.8, speedKmh: 50, congestionFactor: 1.3 },
    ],
  },
  'kathipara_cloverleaf': {
    id: 'kathipara_cloverleaf',
    name: 'Kathipara Grand Cloverleaf Junction',
    coords: [13.0070, 80.2030],
    adjacent: [
      { targetId: 'hub-b', distanceKm: 0.8, speedKmh: 40, congestionFactor: 1.1 },
      { targetId: 'hub-c', distanceKm: 4.5, speedKmh: 60, congestionFactor: 1.2 },
      { targetId: 'hub-f', distanceKm: 2.9, speedKmh: 50, congestionFactor: 1.2 },
      { targetId: 'saidapet_bridge', distanceKm: 2.6, speedKmh: 50, congestionFactor: 1.3 },
      { targetId: 'hub-g', distanceKm: 5.4, speedKmh: 55, congestionFactor: 1.2 },
    ],
  },
  'hub-b': {
    id: 'hub-b',
    name: 'Hub B — Guindy Metro Hub',
    coords: [13.0067, 80.2020],
    adjacent: [
      { targetId: 'kathipara_cloverleaf', distanceKm: 0.8, speedKmh: 40, congestionFactor: 1.1 },
      { targetId: 'saidapet_bridge', distanceKm: 2.4, speedKmh: 45, congestionFactor: 1.3 },
    ],
  },
  'saidapet_bridge': {
    id: 'saidapet_bridge',
    name: 'Saidapet Maraimalai Adigalar Bridge',
    coords: [13.0210, 80.2230],
    adjacent: [
      { targetId: 'kathipara_cloverleaf', distanceKm: 2.6, speedKmh: 50, congestionFactor: 1.3 },
      { targetId: 'hub-b', distanceKm: 2.4, speedKmh: 45, congestionFactor: 1.3 },
      { targetId: 'tidel_park_jn', distanceKm: 4.2, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'nandanam_signal', distanceKm: 1.8, speedKmh: 40, congestionFactor: 1.4 },
    ],
  },
  'nandanam_signal': {
    id: 'nandanam_signal',
    name: 'Nandanam Anna Salai Signal',
    coords: [13.0310, 80.2390],
    adjacent: [
      { targetId: 'saidapet_bridge', distanceKm: 1.8, speedKmh: 40, congestionFactor: 1.4 },
      { targetId: 'hub-e', distanceKm: 1.4, speedKmh: 35, congestionFactor: 1.5 },
      { targetId: 'gemini_flyover', distanceKm: 2.6, speedKmh: 40, congestionFactor: 1.3 },
    ],
  },
  'hub-e': {
    id: 'hub-e',
    name: 'Hub E — T. Nagar Central Hub',
    coords: [13.0418, 80.2341],
    adjacent: [
      { targetId: 'nandanam_signal', distanceKm: 1.4, speedKmh: 35, congestionFactor: 1.5 },
      { targetId: 'gemini_flyover', distanceKm: 2.1, speedKmh: 35, congestionFactor: 1.4 },
      { targetId: 'koyambedu_cmbt', distanceKm: 5.2, speedKmh: 40, congestionFactor: 1.4 },
    ],
  },
  'gemini_flyover': {
    id: 'gemini_flyover',
    name: 'Gemini Flyover (Anna Salai)',
    coords: [13.0520, 80.2510],
    adjacent: [
      { targetId: 'nandanam_signal', distanceKm: 2.6, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'hub-e', distanceKm: 2.1, speedKmh: 35, congestionFactor: 1.4 },
    ],
  },
  'hub-g': {
    id: 'hub-g',
    name: 'Hub G — Porur DLF Cybercity Hub',
    coords: [13.0336, 80.1583],
    adjacent: [
      { targetId: 'kathipara_cloverleaf', distanceKm: 5.4, speedKmh: 55, congestionFactor: 1.2 },
      { targetId: 'hub-c', distanceKm: 6.8, speedKmh: 50, congestionFactor: 1.3 },
      { targetId: 'koyambedu_cmbt', distanceKm: 5.8, speedKmh: 50, congestionFactor: 1.3 },
      { targetId: 'hub-j', distanceKm: 7.4, speedKmh: 55, congestionFactor: 1.2 },
    ],
  },
  'koyambedu_cmbt': {
    id: 'koyambedu_cmbt',
    name: 'Koyambedu CMBT Bus Interchange',
    coords: [13.0690, 80.1950],
    adjacent: [
      { targetId: 'hub-e', distanceKm: 5.2, speedKmh: 40, congestionFactor: 1.4 },
      { targetId: 'hub-g', distanceKm: 5.8, speedKmh: 50, congestionFactor: 1.3 },
      { targetId: 'hub-d', distanceKm: 2.2, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'hub-j', distanceKm: 4.8, speedKmh: 45, congestionFactor: 1.2 },
    ],
  },
  'hub-d': {
    id: 'hub-d',
    name: 'Hub D — Anna Nagar CMBT Hub',
    coords: [13.0850, 80.2101],
    adjacent: [
      { targetId: 'koyambedu_cmbt', distanceKm: 2.2, speedKmh: 40, congestionFactor: 1.3 },
      { targetId: 'hub-j', distanceKm: 5.1, speedKmh: 45, congestionFactor: 1.2 },
    ],
  },
  'hub-j': {
    id: 'hub-j',
    name: 'Hub J — Ambattur Industrial Tech Hub',
    coords: [13.0980, 80.1620],
    adjacent: [
      { targetId: 'hub-d', distanceKm: 5.1, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'koyambedu_cmbt', distanceKm: 4.8, speedKmh: 45, congestionFactor: 1.2 },
      { targetId: 'hub-g', distanceKm: 7.4, speedKmh: 55, congestionFactor: 1.2 },
    ],
  },
};

/**
 * Haversine Euclidean Distance Heuristic (km)
 */
function haversineDistance(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Core Path Finding: A* Search Algorithm
 */
export function findPathAStar(startId: string = 'driver_origin', targetId: string): RouteResult {
  const targetNode = CHENNAI_ROAD_GRAPH[targetId];
  const startNode = CHENNAI_ROAD_GRAPH[startId] || CHENNAI_ROAD_GRAPH['driver_origin'];

  if (!targetNode) {
    return createDirectFallback(startNode.coords, [13.0067, 80.2020], 'Hub B', 'A_STAR');
  }

  const openSet = new Set<string>([startId]);
  const cameFrom: Record<string, string> = {};

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};

  Object.keys(CHENNAI_ROAD_GRAPH).forEach((id) => {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
  });

  gScore[startId] = 0;
  fScore[startId] = haversineDistance(startNode.coords, targetNode.coords);

  while (openSet.size > 0) {
    // Pick node with lowest fScore
    let currentId = '';
    let minF = Infinity;
    openSet.forEach((id) => {
      if (fScore[id] < minF) {
        minF = fScore[id];
        currentId = id;
      }
    });

    if (currentId === targetId) {
      return reconstructRoute(cameFrom, currentId, 'A_STAR');
    }

    openSet.delete(currentId);
    const currNode = CHENNAI_ROAD_GRAPH[currentId];
    if (!currNode) continue;

    for (const edge of currNode.adjacent) {
      const neighborId = edge.targetId;
      const neighborNode = CHENNAI_ROAD_GRAPH[neighborId];
      if (!neighborNode) continue;

      // Cost function: distance weighted by speed and congestion
      const edgeWeight = edge.distanceKm * (1.0 + (edge.congestionFactor - 1.0) * 0.5);
      const tentativeG = gScore[currentId] + edgeWeight;

      if (tentativeG < gScore[neighborId]) {
        cameFrom[neighborId] = currentId;
        gScore[neighborId] = tentativeG;
        fScore[neighborId] = tentativeG + haversineDistance(neighborNode.coords, targetNode.coords);
        openSet.add(neighborId);
      }
    }
  }

  return reconstructRoute(cameFrom, targetId, 'A_STAR');
}

/**
 * Multi-Objective Dijkstra Algorithm (Balanced)
 */
export function findPathDijkstra(startId: string = 'driver_origin', targetId: string): RouteResult {
  const dist: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const unvisited = new Set<string>(Object.keys(CHENNAI_ROAD_GRAPH));

  Object.keys(CHENNAI_ROAD_GRAPH).forEach((id) => {
    dist[id] = Infinity;
  });
  dist[startId] = 0;

  while (unvisited.size > 0) {
    let u = '';
    let minDist = Infinity;
    unvisited.forEach((id) => {
      if (dist[id] < minDist) {
        minDist = dist[id];
        u = id;
      }
    });

    if (!u || u === targetId || minDist === Infinity) break;
    unvisited.delete(u);

    const node = CHENNAI_ROAD_GRAPH[u];
    if (!node) continue;

    for (const edge of node.adjacent) {
      if (!unvisited.has(edge.targetId)) continue;
      // Multi-objective travel-time cost
      const timeCostMin = (edge.distanceKm / edge.speedKmh) * 60 * edge.congestionFactor;
      const alt = dist[u] + timeCostMin;
      if (alt < dist[edge.targetId]) {
        dist[edge.targetId] = alt;
        prev[edge.targetId] = u;
      }
    }
  }

  return reconstructRoute(prev, targetId, 'DIJKSTRA');
}

/**
 * Green Eco-Route Algorithm (Maximizes EV battery efficiency & regen)
 */
export function findPathEcoGreen(startId: string = 'driver_origin', targetId: string): RouteResult {
  // Eco-route prioritizes cruising 50-60 km/h with low congestion penalty
  const dist: Record<string, number> = {};
  const prev: Record<string, string> = {};
  const unvisited = new Set<string>(Object.keys(CHENNAI_ROAD_GRAPH));

  Object.keys(CHENNAI_ROAD_GRAPH).forEach((id) => {
    dist[id] = Infinity;
  });
  dist[startId] = 0;

  while (unvisited.size > 0) {
    let u = '';
    let minDist = Infinity;
    unvisited.forEach((id) => {
      if (dist[id] < minDist) {
        minDist = dist[id];
        u = id;
      }
    });

    if (!u || u === targetId || minDist === Infinity) break;
    unvisited.delete(u);

    const node = CHENNAI_ROAD_GRAPH[u];
    if (!node) continue;

    for (const edge of node.adjacent) {
      if (!unvisited.has(edge.targetId)) continue;
      // Energy loss model: high speed = aerodynamic drag, high congestion = braking loss
      const energyFactor = 1.0 + (edge.speedKmh > 55 ? 0.2 : 0.0) + (edge.congestionFactor > 1.2 ? 0.35 : 0.0);
      const ecoCost = edge.distanceKm * energyFactor;
      const alt = dist[u] + ecoCost;
      if (alt < dist[edge.targetId]) {
        dist[edge.targetId] = alt;
        prev[edge.targetId] = u;
      }
    }
  }

  return reconstructRoute(prev, targetId, 'ECO_GREEN');
}

/**
 * Reconstructs route path, turn-by-turn directions, and live energy metrics
 */
function reconstructRoute(
  cameFrom: Record<string, string>,
  targetId: string,
  algorithm: 'A_STAR' | 'DIJKSTRA' | 'ECO_GREEN'
): RouteResult {
  const nodePath: string[] = [targetId];
  let curr = targetId;
  while (cameFrom[curr]) {
    curr = cameFrom[curr];
    nodePath.unshift(curr);
  }

  if (nodePath.length === 1 && targetId !== 'driver_origin') {
    // Fallback direct path
    const targetNode = CHENNAI_ROAD_GRAPH[targetId];
    return createDirectFallback(
      CHENNAI_ROAD_GRAPH['driver_origin'].coords,
      targetNode?.coords || [13.0067, 80.2020],
      targetNode?.name || 'Target Hub',
      algorithm
    );
  }

  let totalDistKm = 0;
  let totalMinutes = 0;
  const pathCoords: [number, number][] = [];
  const turnByTurn: string[] = [];

  for (let i = 0; i < nodePath.length; i++) {
    const node = CHENNAI_ROAD_GRAPH[nodePath[i]];
    if (node) {
      pathCoords.push(node.coords);
      if (i > 0) {
        const prevNode = CHENNAI_ROAD_GRAPH[nodePath[i - 1]];
        const edge = prevNode?.adjacent.find((a) => a.targetId === node.id);
        const d = edge ? edge.distanceKm : haversineDistance(prevNode.coords, node.coords);
        const speed = edge ? edge.speedKmh : 45;
        const cong = edge ? edge.congestionFactor : 1.2;
        totalDistKm += d;
        totalMinutes += (d / speed) * 60 * cong;

        turnByTurn.push(`Follow arterial route via ${node.name} (${d.toFixed(1)} km)`);
      } else {
        turnByTurn.push(`Depart from ${node.name}`);
      }
    }
  }

  // Calculate EV Energy (0.16 kWh/km average for Nexon EV / Atto 3)
  const energyKwh = totalDistKm * 0.155;
  const co2AvoidedKg = totalDistKm * 0.145; // vs petrol equivalent (145g CO2/km saved)

  const algoNames = {
    A_STAR: 'A* Fast Path (Euclidean Heuristic)',
    DIJKSTRA: 'Dijkstra Multi-Objective (Time & Flow Balanced)',
    ECO_GREEN: 'Green Eco-Regen Route (Optimized Energy)',
  };

  return {
    algorithm,
    algorithmName: algoNames[algorithm],
    pathCoords,
    totalDistanceKm: Number(totalDistKm.toFixed(1)),
    estimatedDurationMin: Math.max(2, Math.round(totalMinutes)),
    energyConsumptionKwh: Number(energyKwh.toFixed(2)),
    co2AvoidedKg: Number(co2AvoidedKg.toFixed(2)),
    turnByTurn,
  };
}

function createDirectFallback(
  start: [number, number],
  dest: [number, number],
  destName: string,
  algorithm: 'A_STAR' | 'DIJKSTRA' | 'ECO_GREEN'
): RouteResult {
  const dist = haversineDistance(start, dest);
  return {
    algorithm,
    algorithmName: 'A* Direct Interpolation',
    pathCoords: [start, dest],
    totalDistanceKm: Number(dist.toFixed(1)),
    estimatedDurationMin: Math.round((dist / 40) * 60),
    energyConsumptionKwh: Number((dist * 0.16).toFixed(2)),
    co2AvoidedKg: Number((dist * 0.14).toFixed(2)),
    turnByTurn: [`Depart from Karapakkam`, `Direct arterial approach to ${destName}`],
  };
}
