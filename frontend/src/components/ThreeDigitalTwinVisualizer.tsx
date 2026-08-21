import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  Zap, Activity, ShieldCheck, Cpu, Flame, Play, Pause, AlertTriangle, CheckCircle2,
  RefreshCw, Car, Radio, Layers, Gauge, Sparkles, Server, Compass, Wrench, X, PlusCircle, AlertCircle,
  ZoomIn, ZoomOut, RotateCcw, Move
} from 'lucide-react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage } from '../types';
import { triggerScenario, updateAmbientTemp, spawnEVInQueue, controlEVSEGun } from '../services/api';

interface ThreeDigitalTwinVisualizerProps {
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

interface Vehicle3D {
  id: string;
  model: string;
  mesh: THREE.Group;
  chargingPortPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  targetRotY: number;
  currentPos: THREE.Vector3;
  currentRotY: number;
  status: 'ENTERING' | 'QUEUED' | 'PARKED_CHARGING' | 'LEAVING' | 'REROUTING';
  assignedBayId?: string;
  soc: number;
  powerKw: number;
  phase: string;
}

// ===== REALISTIC EV CAR BUILDER =====
function createRealisticEV(colorHex: number): THREE.Group {
  const car = new THREE.Group();
  const paintMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.22,
    metalness: 0.82,
    envMapIntensity: 1.2,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.85,
  });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.2 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.08, metalness: 0.95 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.92, roughness: 0.08 });

  // Lower body — rounded SUV crossover shape
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-2.2, 0.15);
  bodyShape.lineTo(2.0, 0.15);
  bodyShape.quadraticCurveTo(2.35, 0.15, 2.35, 0.5);
  bodyShape.lineTo(2.35, 0.85);
  bodyShape.quadraticCurveTo(2.35, 1.05, 2.15, 1.05);
  bodyShape.lineTo(-2.05, 1.05);
  bodyShape.quadraticCurveTo(-2.3, 1.05, -2.3, 0.85);
  bodyShape.lineTo(-2.3, 0.5);
  bodyShape.quadraticCurveTo(-2.3, 0.15, -2.2, 0.15);

  const bodyExtrudeSettings = { depth: 2.05, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 };
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, bodyExtrudeSettings);
  bodyGeo.center();
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.position.y = 0.6;
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  car.add(bodyMesh);

  // Upper cabin — greenhouse (tapered trapezoid cross section)
  const cabinShape = new THREE.Shape();
  cabinShape.moveTo(-1.3, 0);
  cabinShape.lineTo(1.05, 0);
  cabinShape.quadraticCurveTo(1.2, 0, 1.2, 0.15);
  cabinShape.lineTo(0.95, 0.7);
  cabinShape.quadraticCurveTo(0.9, 0.78, 0.8, 0.78);
  cabinShape.lineTo(-1.1, 0.78);
  cabinShape.quadraticCurveTo(-1.2, 0.78, -1.25, 0.7);
  cabinShape.lineTo(-1.4, 0.15);
  cabinShape.quadraticCurveTo(-1.4, 0, -1.3, 0);

  const cabinExtrudeSettings = { depth: 1.7, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 };
  const cabinGeo = new THREE.ExtrudeGeometry(cabinShape, cabinExtrudeSettings);
  cabinGeo.center();
  const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
  cabinMesh.position.set(-0.1, 1.35, 0);
  cabinMesh.castShadow = true;
  car.add(cabinMesh);

  // Cabin chrome trim strip
  const trimGeo = new THREE.BoxGeometry(2.65, 0.04, 1.85);
  const trimMesh = new THREE.Mesh(trimGeo, chromeMat);
  trimMesh.position.set(-0.1, 1.12, 0);
  car.add(trimMesh);

  // Front bumper assembly
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.35, 2.0), darkTrim);
  frontBumper.position.set(2.28, 0.42, 0);
  car.add(frontBumper);

  // Front grille (EV closed grille)
  const grilleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 1.4), grilleMat);
  grille.position.set(2.36, 0.62, 0);
  car.add(grille);

  // Rear bumper
  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 2.0), darkTrim);
  rearBumper.position.set(-2.32, 0.42, 0);
  car.add(rearBumper);

  // Wheel arches + wheels (4 corners)
  const wheelPositions = [
    { x: 1.4, z: -0.92 }, { x: 1.4, z: 0.92 },
    { x: -1.35, z: -0.92 }, { x: -1.35, z: 0.92 },
  ];
  wheelPositions.forEach((wp) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wp.x, 0.38, wp.z);

    // Tire
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.13, 12, 24), rubberMat);
    tire.rotation.y = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Rim disc
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 16), rimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // Wheel arch fender
    const archGeo = new THREE.TorusGeometry(0.42, 0.06, 6, 12, Math.PI);
    const arch = new THREE.Mesh(archGeo, darkTrim);
    arch.rotation.y = Math.PI / 2;
    arch.position.y = 0.05;
    wheelGroup.add(arch);

    car.add(wheelGroup);
  });

  // Headlights — LED DRL strips
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  [-0.65, 0.65].forEach((hz) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.42), headlightMat);
    hl.position.set(2.36, 0.82, hz);
    car.add(hl);
    // DRL accent (cyan LED)
    const drl = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.03, 0.38),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    drl.position.set(2.37, 0.72, hz);
    car.add(drl);
  });

  // Taillights — full-width LED bar
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.08, 1.7),
    new THREE.MeshBasicMaterial({ color: 0xee2233 })
  );
  tailBar.position.set(-2.34, 0.88, 0);
  car.add(tailBar);

  // Side mirrors
  [-1.08, 1.08].forEach((mz) => {
    const mirrorArm = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.04, 0.15), darkTrim);
    mirrorArm.position.set(0.85, 1.22, mz);
    car.add(mirrorArm);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), chromeMat);
    mirrorHead.position.set(0.85, 1.22, mz + (mz > 0 ? 0.12 : -0.12));
    car.add(mirrorHead);
  });

  // Roof rails
  [-0.82, 0.82].forEach((rz) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.05), chromeMat);
    rail.position.set(-0.1, 1.78, rz);
    car.add(rail);
  });

  // EV charging port indicator (small blue circle on left rear)
  const chPort = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.03, 12),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  chPort.rotation.z = Math.PI / 2;
  chPort.position.set(-1.8, 0.75, -1.04);
  car.add(chPort);

  return car;
}

// ===== TREE BUILDER =====
function createTree(height: number, canopyRadius: number): THREE.Group {
  const tree = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d7a3a, roughness: 0.7 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, height * 0.4, 8), trunkMat);
  trunk.position.y = height * 0.2;
  trunk.castShadow = true;
  tree.add(trunk);

  // Canopy layers
  for (let i = 0; i < 3; i++) {
    const layerR = canopyRadius * (1 - i * 0.2);
    const layerH = canopyRadius * 0.7;
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(layerR, 10, 8),
      leafMat
    );
    canopy.position.y = height * 0.4 + i * layerH * 0.5;
    canopy.scale.y = 0.7;
    canopy.castShadow = true;
    tree.add(canopy);
  }
  return tree;
}

export const ThreeDigitalTwinVisualizer: React.FC<ThreeDigitalTwinVisualizerProps> = ({
  hubs,
  sessions,
  transformer,
  metrics,
  decisionFeed,
  ocppFeed,
  currentScenario,
  onScenarioChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [demoPlaying, setDemoPlaying] = useState<boolean>(false);
  const [demoStep, setDemoStep] = useState<number>(0);
  const demoAbortRef = useRef<boolean>(false); // prevents duplicate demo runs
  const [cameraView, setCameraView] = useState<CameraView>('OVERVIEW');
  const [selectedGunId, setSelectedGunId] = useState<string | null>(null);
  const [ambientTempSlider, setAmbientTempSlider] = useState<number>(28);
  const [spawnHubId, setSpawnHubId] = useState<string>('hub-a');
  const [spawnModel, setSpawnModel] = useState<string>('Tata Nexon EV');
  const [spawnSoc, setSpawnSoc] = useState<number>(18);
  const [isSpawning, setIsSpawning] = useState<boolean>(false);
  const [spawnToast, setSpawnToast] = useState<string | null>(null);

  // Projected screen coordinates for floating DOM tags
  const [transformerScreenPos, setTransformerScreenPos] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });
  const [evScreenPositions, setEvScreenPositions] = useState<Array<{ id: string; model: string; soc: number; power: number; phase: string; status: string; x: number; y: number; visible: boolean }>>([]);

  // ===== REFS FOR DYNAMIC STATE (read by animation loop without re-creating scene) =====
  const cameraViewRef = useRef<CameraView>(cameraView);
  const scenarioRef = useRef<string>(currentScenario);
  const transformerRef = useRef<TransformerStatus | null>(transformer);
  const sessionsRef = useRef<EVSession[]>(sessions);
  const hubsRef = useRef<Hub[]>(hubs);
  const containerDimsRef = useRef<{ w: number; h: number }>({ w: 960, h: 520 });
  const ambientTempRef = useRef<number>(28);

  // Refs for mutable Three.js objects
  const sceneInitRef = useRef<boolean>(false);
  const vehicleListRef = useRef<Vehicle3D[]>([]);
  const thermalLightRef = useRef<THREE.PointLight | null>(null);
  const transTankMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const transFinMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const particleMatRef = useRef<THREE.PointsMaterial | null>(null);
  const cableMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const warnRingRef = useRef<THREE.Mesh | null>(null);
  const chargingCablePulseMeshes = useRef<THREE.Mesh[]>([]);
  // Per-bay LED dome materials for fault/status colour changes
  const bayLedMatsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  // Per-bay floor fill materials for scenario highlights
  const bayFillMatsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  // Camera & OrbitControls accessible outside useEffect
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(5, 38, 55));
  const cameraLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(2, 1, 0));
  const isTransitioningRef = useRef<boolean>(false);

  // Keep refs in sync with props
  useEffect(() => { scenarioRef.current = currentScenario; }, [currentScenario]);
  useEffect(() => { transformerRef.current = transformer; }, [transformer]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { hubsRef.current = hubs; }, [hubs]);

  // Camera preset transitions triggered by button click
  useEffect(() => {
    cameraViewRef.current = cameraView;
    if (cameraView === 'OVERVIEW') {
      cameraTargetPosRef.current.set(5, 38, 55);
      cameraLookAtRef.current.set(2, 1, 0);
    } else if (cameraView === 'GRID') {
      cameraTargetPosRef.current.set(-22, 18, 20);
      cameraLookAtRef.current.set(-22, 4, 0);
    } else if (cameraView === 'TRANSFORMER') {
      cameraTargetPosRef.current.set(-6, 12, 16);
      cameraLookAtRef.current.set(-6, 3, 0);
    } else if (cameraView === 'CHARGERS') {
      cameraTargetPosRef.current.set(16, 15, 22);
      cameraLookAtRef.current.set(16, 3, 0);
    } else if (cameraView === 'QUEUE') {
      cameraTargetPosRef.current.set(30, 14, 36);
      cameraLookAtRef.current.set(30, 0, 16);
    }
    isTransitioningRef.current = true;
  }, [cameraView]);

  // Auto-focus camera when scenario changes
  useEffect(() => {
    if (currentScenario === 'PEAK_DEMAND') {
      setCameraView('QUEUE');
    } else if (currentScenario === 'GRID_SURGE') {
      setCameraView('GRID');
    } else if (currentScenario === 'CHARGER_FAILURE') {
      setCameraView('CHARGERS');
    } else if (currentScenario === 'CC_CV_CONGESTION') {
      setCameraView('CHARGERS');
    } else if (currentScenario === 'HIGH_TEMP') {
      setCameraView('TRANSFORMER');
    } else if (currentScenario === 'NORMAL' || currentScenario === 'RESET') {
      setCameraView('OVERVIEW');
    }
  }, [currentScenario]);

  // Zoom In button
  const handleZoomIn = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    isTransitioningRef.current = false;
    const cam = cameraRef.current;
    const tgt = controlsRef.current.target;
    const dir = new THREE.Vector3().subVectors(cam.position, tgt);
    const newLen = Math.max(controlsRef.current.minDistance, dir.length() * 0.72);
    dir.setLength(newLen);
    cam.position.copy(tgt).add(dir);
    controlsRef.current.update();
  }, []);

  // Zoom Out button
  const handleZoomOut = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;
    isTransitioningRef.current = false;
    const cam = cameraRef.current;
    const tgt = controlsRef.current.target;
    const dir = new THREE.Vector3().subVectors(cam.position, tgt);
    const newLen = Math.min(controlsRef.current.maxDistance, dir.length() * 1.38);
    dir.setLength(newLen);
    cam.position.copy(tgt).add(dir);
    controlsRef.current.update();
  }, []);

  // Reset to overview
  const handleResetCamera = useCallback(() => {
    setCameraView('OVERVIEW');
  }, []);

  // Demo sequence: scenario name, camera, label, description, hold duration (ms)
  const DEMO_STEPS = [
    { name: 'NORMAL',          camera: 'OVERVIEW'    as CameraView, title: '1 / 7 — NORMAL MODE',         desc: 'Baseline: healthy chargers, stable transformer, standard queue.', durationMs: 8000  },
    { name: 'PEAK_DEMAND',     camera: 'QUEUE'       as CameraView, title: '2 / 7 — PEAK DEMAND',          desc: 'EV arrival surge at Hub A (5 queued). AI shifts recommendations to Hub B.', durationMs: 12000 },
    { name: 'CC_CV_CONGESTION',camera: 'CHARGERS'    as CameraView, title: '3 / 7 — CC-CV CONGESTION',     desc: 'Multiple EVs in CV taper (85–93% SOC). Anti-taper pricing ₹22/kWh active.', durationMs: 12000 },
    { name: 'GRID_SURGE',      camera: 'GRID'        as CameraView, title: '4 / 7 — GRID SURGE',           desc: 'Feeder demand spikes to ~194 kW. SLSQP redistributes power; CV EVs throttled.', durationMs: 12000 },
    { name: 'CHARGER_FAILURE', camera: 'CHARGERS'    as CameraView, title: '5 / 7 — CHARGER FAILURE',      desc: 'Gun-A3 faults (480ms latency). Isolation Forest detects; EV rerouted to Hub B.', durationMs: 12000 },
    { name: 'DRIVER_DELAY',    camera: 'CHARGERS'    as CameraView, title: '6 / 7 — RECOVERY',             desc: 'Phantom-Slot recovery: EV-17 fills reserved slot while EV-08 is protected.', durationMs: 10000 },
    { name: 'NORMAL',          camera: 'OVERVIEW'    as CameraView, title: '7 / 7 — SYSTEM RESTORED',      desc: 'All faults cleared. System restored to stable baseline.', durationMs: 5000  },
  ] as const;

  const TOTAL_DEMO_MS = DEMO_STEPS.reduce((acc, s) => acc + s.durationMs, 0);

  // Run the demo as a sequential async chain so each step can have its own duration
  const runDemo = async () => {
    demoAbortRef.current = false;
    for (let i = 0; i < DEMO_STEPS.length; i++) {
      if (demoAbortRef.current) break;
      const step = DEMO_STEPS[i];
      setDemoStep(i);
      onScenarioChange(step.name);
      await triggerScenario(step.name);
      setCameraView(step.camera);
      // Hold for this step's duration, but check abort every 200ms
      const slices = Math.ceil(step.durationMs / 200);
      for (let t = 0; t < slices; t++) {
        if (demoAbortRef.current) break;
        await new Promise<void>((res) => setTimeout(res, 200));
      }
    }
    // Always restore NORMAL at end, whether aborted or finished
    if (!demoAbortRef.current) {
      onScenarioChange('NORMAL');
      await triggerScenario('NORMAL');
      setCameraView('OVERVIEW');
    }
    setDemoPlaying(false);
    setDemoStep(0);
  };

  const toggleDemoPlay = () => {
    if (demoPlaying) {
      // Stop demo
      demoAbortRef.current = true;
      setDemoPlaying(false);
      setDemoStep(0);
      onScenarioChange('NORMAL');
      triggerScenario('NORMAL');
      setCameraView('OVERVIEW');
    } else {
      // Start demo — guard against double-click
      if (demoAbortRef.current === false) {
        setDemoPlaying(true);
        runDemo();
      }
    }
  };

  const handleTempSlider = async (val: number) => {
    setAmbientTempSlider(val);
    ambientTempRef.current = val;
    window.dispatchEvent(new CustomEvent('hyperflow-ambient-temp', { detail: { temp_c: val } }));
    await updateAmbientTemp(val);
  };

  const handleSpawnEV = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSpawning(true);

    // 1. Dispatch custom event for telemetry and demo simulation engine
    window.dispatchEvent(
      new CustomEvent('hyperflow-spawn-ev', {
        detail: { hub_id: spawnHubId, vehicle_model: spawnModel, initial_soc: spawnSoc },
      })
    );

    // 2. Call backend API endpoint
    await spawnEVInQueue(spawnHubId, spawnModel, spawnSoc);

    // 3. Immediately assign vehicle to 3D scene bay and start charging animation
    const vList = vehicleListRef.current;
    if (vList && vList.length > 0) {
      let targetBayIdx = vList.findIndex((v, i) => i < 6 && (v.powerKw === 0 || v.status !== 'PARKED_CHARGING'));
      if (targetBayIdx === -1) targetBayIdx = (Math.floor(Math.random() * 3) + 3); // pick bay B1, B2, or B3

      if (vList[targetBayIdx]) {
        vList[targetBayIdx].model = spawnModel;
        vList[targetBayIdx].soc = spawnSoc;
        vList[targetBayIdx].powerKw = 48.0;
        vList[targetBayIdx].status = 'PARKED_CHARGING';
        vList[targetBayIdx].phase = spawnSoc >= 80 ? 'CV_PHASE' : 'CC_PHASE';
      }
    }

    // 4. Focus camera on chargers view so the user sees the newly spawned car charging
    setCameraView('CHARGERS');

    // 5. Show toast notification
    setSpawnToast(`✓ ${spawnModel} Spawned at ${spawnHubId.toUpperCase()} (${spawnSoc}% SOC) — Connected & Charging at 48.0 kW!`);
    setTimeout(() => setSpawnToast(null), 4000);
    setTimeout(() => setIsSpawning(false), 500);
  };

  const handleGunAction = async (gunId: string, action: string) => {
    await controlEVSEGun(gunId, action);
    setSelectedGunId(null);
  };

  // Derived scenario flags (read from ref in animation loop)
  const isHighTemp = currentScenario === 'HIGH_TEMP' || (transformer ? transformer.ambient_temp_c > 35 : false);
  const isGridSurge = currentScenario === 'GRID_SURGE';
  const isFaulted = currentScenario === 'CHARGER_FAILURE';
  const isPhantom = currentScenario === 'DRIVER_DELAY';

  // ======================================================================
  //  THREE.JS SCENE — ONE-TIME INITIALIZATION (empty dependency array)
  // ======================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container || sceneInitRef.current) return;
    sceneInitRef.current = true;

    const width = container.clientWidth || 960;
    const height = container.clientHeight || 520;
    containerDimsRef.current = { w: width, h: height };

    // ===== SCENE =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0xb0d4f1, 80, 200);

    // ===== CAMERA =====
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 500);
    camera.position.set(5, 38, 55);

    // ===== RENDERER — FIX: Use PCFShadowMap instead of deprecated PCFSoftShadowMap =====
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap; // FIX: was PCFSoftShadowMap (deprecated)
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;

    while (container.firstChild) container.removeChild(container.firstChild);
    container.appendChild(renderer.domElement);

    // ===== ORBIT CONTROLS — Full free zoom, pan, rotate =====
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.enablePan = true;
    controls.panSpeed = 1.1;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.85;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underground
    controls.minDistance = 2;   // Can zoom in very close
    controls.maxDistance = 220; // Can zoom far out
    controls.target.set(2, 1, 0);
    controls.update();

    // Store refs for external access (HUD buttons)
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Stop preset transition when user manually interacts
    controls.addEventListener('start', () => {
      isTransitioningRef.current = false;
    });

    // ===== LIGHTING =====
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8d9db6, 1.0);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.8);
    sunLight.position.set(25, 40, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xb0d4f1, 0.7);
    fillLight.position.set(-20, 25, -15);
    scene.add(fillLight);

    const amLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(amLight);

    // Transformer thermal glow — stored in ref for dynamic updates
    const thermalLight = new THREE.PointLight(0x4fc3f7, 0.6, 20);
    thermalLight.position.set(-8, 5, 0);
    scene.add(thermalLight);
    thermalLightRef.current = thermalLight;

    // ===== MATERIAL PALETTE =====
    const M = {
      asphalt: new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.92, metalness: 0.05 }),
      concrete: new THREE.MeshStandardMaterial({ color: 0xb0b0b0, roughness: 0.75, metalness: 0.05 }),
      concreteDark: new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.8 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x8a9bae, metalness: 0.85, roughness: 0.25 }),
      galvSteel: new THREE.MeshStandardMaterial({ color: 0xa8b8c8, metalness: 0.9, roughness: 0.2 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xc87533, metalness: 0.9, roughness: 0.3 }),
      insulator: new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.15, metalness: 0.1 }),
      greenPaint: new THREE.MeshStandardMaterial({ color: 0x2d6b3f, roughness: 0.5, metalness: 0.3 }),
      transTank: new THREE.MeshStandardMaterial({ color: 0x3a6b3a, roughness: 0.4, metalness: 0.6 }),
      transFin: new THREE.MeshStandardMaterial({ color: 0x5a8a5a, roughness: 0.4, metalness: 0.7 }),
      fence: new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.5 }),
      white: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      yellowSafety: new THREE.MeshStandardMaterial({ color: 0xf5c542, roughness: 0.4, metalness: 0.3 }),
      redWarning: new THREE.MeshStandardMaterial({ color: 0xcc3333, roughness: 0.5 }),
      chargerBody: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.35, metalness: 0.4 }),
      chargerFault: new THREE.MeshStandardMaterial({ color: 0xd44040, roughness: 0.35, metalness: 0.4 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.05, metalness: 0.95 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.95 }),
    };
    transTankMatRef.current = M.transTank;
    transFinMatRef.current = M.transFin;

    // ===== GROUND — ASPHALT WITH MARKINGS =====
    const groundGrp = new THREE.Group();
    const gFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), M.asphalt);
    gFloor.rotation.x = -Math.PI / 2;
    gFloor.receiveShadow = true;
    groundGrp.add(gFloor);

    // Concrete pad under substation area
    const subPad = new THREE.Mesh(new THREE.BoxGeometry(22, 0.25, 20), M.concrete);
    subPad.position.set(-22, 0.125, 0);
    subPad.receiveShadow = true;
    groundGrp.add(subPad);

    // Concrete pad under transformer
    const txPad = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 8), M.concrete);
    txPad.position.set(-6, 0.1, 0);
    txPad.receiveShadow = true;
    groundGrp.add(txPad);

    // Concrete pad under charging station
    const chPad = new THREE.Mesh(new THREE.BoxGeometry(30, 0.2, 28), M.concreteDark);
    chPad.position.set(16, 0.1, 0);
    chPad.receiveShadow = true;
    groundGrp.add(chPad);

    scene.add(groundGrp);

    // ===== PARKING BAY DEFINITIONS =====
    const bayDefs = [
      { id: 'bay-a1', x: 8,  z: -8 },
      { id: 'bay-a2', x: 8,  z: 0 },
      { id: 'bay-a3', x: 8,  z: 8 },
      { id: 'bay-b1', x: 24, z: -8 },
      { id: 'bay-b2', x: 24, z: 0 },
      { id: 'bay-b3', x: 24, z: 8 },
    ];

    // Draw parking bay markings
    const bayLineGeo = new THREE.PlaneGeometry(0.15, 8);
    const bayFillMats: THREE.MeshBasicMaterial[] = [];
    const greenBayMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.18 });

    bayDefs.forEach((b, _bIdx) => {
      // Individual fill mat per bay so we can change colour per scenario
      const fillMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.18 });
      bayFillMats.push(fillMat);
      // Green fill
      const fill = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 7.5), fillMat);
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(b.x, 0.22, b.z);
      groundGrp.add(fill);

      // White side lines
      [-2.75, 2.75].forEach((dx) => {
        const ln = new THREE.Mesh(bayLineGeo, M.white);
        ln.rotation.x = -Math.PI / 2;
        ln.position.set(b.x + dx, 0.23, b.z);
        groundGrp.add(ln);
      });

      // Wheel stop
      const ws = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.18, 0.35),
        M.yellowSafety
      );
      ws.position.set(b.x, 0.22, b.z - 3.2);
      ws.castShadow = true;
      groundGrp.add(ws);
    });
    bayFillMatsRef.current = bayFillMats;

    // Approach road marking (center dashed line)
    for (let rz = -12; rz <= 15; rz += 3) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 1.5), M.white);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(16, 0.22, rz);
      groundGrp.add(dash);
    }

    // ===== ELECTRICAL SUBSTATION (LEFT SIDE) =====
    const subGrp = new THREE.Group();
    subGrp.position.set(-22, 0, 0);

    // Steel gantry towers
    [-6, 0, 6].forEach((gx) => {
      [-3, 3].forEach((gz) => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.25, 10, 8),
          M.galvSteel
        );
        pole.position.set(gx, 5, gz);
        pole.castShadow = true;
        subGrp.add(pole);
      });

      const crossBeam = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.25, 6.5),
        M.galvSteel
      );
      crossBeam.position.set(gx, 9.8, 0);
      crossBeam.castShadow = true;
      subGrp.add(crossBeam);

      [-2, 0, 2].forEach((iz) => {
        for (let r = 0; r < 3; r++) {
          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12),
            M.insulator
          );
          disc.position.set(gx, 9.3 - r * 0.22, iz);
          subGrp.add(disc);
        }
      });
    });

    // Overhead HV busbars
    [-2, 0, 2].forEach((bz) => {
      const busbar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 12.5, 8),
        M.copper
      );
      busbar.rotation.z = Math.PI / 2;
      busbar.position.set(0, 8.6, bz);
      subGrp.add(busbar);
    });

    // Circuit breaker box
    const cbBox = new THREE.Mesh(new THREE.BoxGeometry(2.5, 3.5, 4), M.greenPaint);
    cbBox.position.set(0, 1.75, 0);
    cbBox.castShadow = true;
    subGrp.add(cbBox);

    // Small concrete equipment pads
    [-4, 4].forEach((px) => {
      const eqPad = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 2), M.concreteDark);
      eqPad.position.set(px, 0.75, 0);
      eqPad.castShadow = true;
      subGrp.add(eqPad);
    });

    // Perimeter chain-link fence posts
    const fPostGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 6);
    for (let fx = -10; fx <= 10; fx += 4) {
      [7, -7].forEach((fz) => {
        const fPost = new THREE.Mesh(fPostGeo, M.fence);
        fPost.position.set(fx, 1.75, fz);
        fPost.castShadow = true;
        subGrp.add(fPost);
      });
    }
    [7, -7].forEach((fz) => {
      [0.5, 1.8, 3.0].forEach((fy) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(20, 0.06, 0.06),
          M.fence
        );
        rail.position.set(0, fy, fz);
        subGrp.add(rail);
      });
    });

    // Warning sign
    const warnSign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.05), M.yellowSafety);
    warnSign.position.set(-9.5, 2.5, 7.05);
    subGrp.add(warnSign);
    const warnTriangle = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.5, 0.06),
      M.redWarning
    );
    warnTriangle.position.set(-9.5, 2.55, 7.08);
    subGrp.add(warnTriangle);

    scene.add(subGrp);

    // ===== DISTRIBUTION TRANSFORMER #04 (CENTER) =====
    const txGrp = new THREE.Group();
    txGrp.position.set(-6, 0, 0);

    const txBase = new THREE.Mesh(new THREE.BoxGeometry(7, 0.6, 6), M.concrete);
    txBase.position.y = 0.3;
    txBase.receiveShadow = true;
    txGrp.add(txBase);

    const txTankGeo = new THREE.BoxGeometry(5.5, 4.5, 4.5);
    const txTank = new THREE.Mesh(txTankGeo, M.transTank);
    txTank.position.y = 2.85;
    txTank.castShadow = true;
    txTank.receiveShadow = true;
    txGrp.add(txTank);

    // Radiator cooling fin banks
    [-2.95, 2.95].forEach((sx) => {
      for (let fz = -1.8; fz <= 1.8; fz += 0.55) {
        const fin = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 3.8, 0.4),
          M.transFin
        );
        fin.position.set(sx, 2.6, fz);
        fin.castShadow = true;
        txGrp.add(fin);
      }
    });

    // HV Bushings on top
    [-1.5, 0, 1.5].forEach((bx) => {
      const bush = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.25, 1.6, 12),
        M.insulator
      );
      bush.position.set(bx, 5.9, -1.2);
      bush.castShadow = true;
      txGrp.add(bush);
      const cap = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 10, 10),
        M.copper
      );
      cap.position.set(bx, 6.75, -1.2);
      txGrp.add(cap);
    });

    // LV Bushings
    [-1.0, 0, 1.0].forEach((bx) => {
      const lvBush = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.18, 0.9, 10),
        M.insulator
      );
      lvBush.position.set(bx, 5.6, 1.5);
      txGrp.add(lvBush);
    });

    // Conservator tank
    const consv = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 3.5, 14),
      M.transTank
    );
    consv.rotation.z = Math.PI / 2;
    consv.position.set(0, 5.7, 0);
    txGrp.add(consv);

    // Grounding strip
    const gndStrip = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 3.5, 0.05),
      M.copper
    );
    gndStrip.position.set(2.6, 1.8, 2.1);
    txGrp.add(gndStrip);

    // Small safety fence around transformer
    [-3.8, 3.8].forEach((sx) => {
      [-2.8, 2.8].forEach((sz) => {
        const fp = new THREE.Mesh(fPostGeo, M.fence);
        fp.position.set(sx, 1.75, sz);
        fp.castShadow = true;
        txGrp.add(fp);
      });
    });

    // HIGH TEMP warning glow ring (hidden by default, shown dynamically)
    const warnRingMat = new THREE.MeshBasicMaterial({ color: 0xff6600, transparent: true, opacity: 0.0 });
    const warnRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.08, 8, 32),
      warnRingMat
    );
    warnRing.rotation.x = Math.PI / 2;
    warnRing.position.y = 5.2;
    txGrp.add(warnRing);
    warnRingRef.current = warnRing;

    scene.add(txGrp);

    // ===== POWER CABLES =====
    const cablePath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-22, 1.5, 0),
      new THREE.Vector3(-14, 1.2, 0),
      new THREE.Vector3(-6, 1.0, 0),
      new THREE.Vector3(0, 0.8, 0),
      new THREE.Vector3(8, 0.6, 0),
    ]);
    const mainCableMat = new THREE.MeshStandardMaterial({
      color: 0x444444,
      metalness: 0.5,
      roughness: 0.4,
    });
    cableMatRef.current = mainCableMat;
    const cableTube = new THREE.Mesh(
      new THREE.TubeGeometry(cablePath, 40, 0.12, 8, false),
      mainCableMat
    );
    cableTube.castShadow = true;
    scene.add(cableTube);

    const cable2Path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(8, 0.6, 0),
      new THREE.Vector3(16, 0.5, 0),
      new THREE.Vector3(24, 0.4, 0),
    ]);
    const cable2Tube = new THREE.Mesh(
      new THREE.TubeGeometry(cable2Path, 20, 0.1, 8, false),
      new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 })
    );
    scene.add(cable2Tube);

    // ===== OVERHEAD CANOPY =====
    const canopyGrp = new THREE.Group();
    canopyGrp.position.set(16, 0, 0);

    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7, roughness: 0.3 });
    [-10, 10].forEach((px) => {
      [-10, 10].forEach((pz) => {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 7, 12),
          pillarMat
        );
        pillar.position.set(px, 3.5, pz);
        pillar.castShadow = true;
        canopyGrp.add(pillar);
      });
    });

    const roofMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.3, metalness: 0.5 });
    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(24, 0.3, 24), roofMat);
    roofMesh.position.y = 7.15;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    canopyGrp.add(roofMesh);

    [-6, 0, 6].forEach((lz) => {
      const ledPanel = new THREE.Mesh(
        new THREE.BoxGeometry(18, 0.05, 0.6),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      ledPanel.position.set(0, 6.95, lz);
      canopyGrp.add(ledPanel);
    });

    scene.add(canopyGrp);

    // ===== DC FAST CHARGER CABINETS — store per-bay LED materials =====
    const cablePulseList: THREE.Mesh[] = [];
    const bayLedMats: THREE.MeshBasicMaterial[] = [];

    bayDefs.forEach((b) => {
      const cGrp = new THREE.Group();
      cGrp.position.set(b.x, 0, b.z - 3.5);

      // Charger main body
      const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.2, 1.2), M.chargerBody);
      cabBody.position.y = 2.1;
      cabBody.castShadow = true;
      cGrp.add(cabBody);

      // Dark screen panel
      const screenFace = new THREE.Mesh(
        new THREE.PlaneGeometry(1.0, 0.8),
        new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
      );
      screenFace.position.set(0, 2.8, 0.61);
      cGrp.add(screenFace);

      // Top status LED dome — stored per bay for dynamic colour changes
      const ledDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 14, 14),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      ledDome.position.set(0, 4.35, 0);
      bayLedMats.push(ledDome.material as THREE.MeshBasicMaterial);
      cGrp.add(ledDome);

      // Ventilation grille
      const ventGrille = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 1.5),
        new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.6, roughness: 0.5 })
      );
      ventGrille.position.set(0.81, 1.5, 0);
      ventGrille.rotation.y = Math.PI / 2;
      cGrp.add(ventGrille);

      // Charger base plate
      const basePlate = new THREE.Mesh(
        new THREE.BoxGeometry(2.0, 0.15, 1.5),
        M.concreteDark
      );
      basePlate.position.y = 0.075;
      cGrp.add(basePlate);

      // Thick charging cable with animated pulse glow
      const cableCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.5, 0.6),
        new THREE.Vector3(0, 0.7, 1.5),
        new THREE.Vector3(0, 0.6, 2.8),
      ]);
      const chargerCable = new THREE.Mesh(
        new THREE.TubeGeometry(cableCurve, 16, 0.07, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 })
      );
      cGrp.add(chargerCable);

      // Glow cable overlay (for charging pulse animation)
      const glowCableMat = new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.0 });
      const glowCable = new THREE.Mesh(
        new THREE.TubeGeometry(cableCurve, 16, 0.1, 8, false),
        glowCableMat
      );
      cGrp.add(glowCable);
      cablePulseList.push(glowCable);

      // Yellow safety bollards
      [-1.0, 1.0].forEach((bx) => {
        const bollard = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 1.0, 10),
          M.yellowSafety
        );
        bollard.position.set(bx, 0.5, 0.7);
        bollard.castShadow = true;
        cGrp.add(bollard);
      });

      scene.add(cGrp);
    });
    bayLedMatsRef.current = bayLedMats;
    chargingCablePulseMeshes.current = cablePulseList;

    // ===== PLACE REALISTIC VEHICLES =====
    const vehicleList: Vehicle3D[] = [];
    const carColors = [0x2563eb, 0xdc2626, 0x059669, 0x7c3aed, 0xf59e0b, 0x6366f1, 0xe11d48, 0x0891b2, 0x65a30d, 0xea580c];

    // ─── ROW A BAYS (x=8): All 3 bays occupied ───────────────────────
    // Bay A1 — Tata Nexon EV (Blue)
    const car1 = createRealisticEV(carColors[0]);
    car1.position.set(8, 0, -8);
    car1.rotation.y = -Math.PI / 2;
    scene.add(car1);
    vehicleList.push({
      id: 'sess-101', model: 'Tata Nexon EV', mesh: car1,
      chargingPortPos: new THREE.Vector3(8, 1.0, -7),
      currentPos: new THREE.Vector3(8, 0, -8),
      targetPos: new THREE.Vector3(8, 0, -8),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-a1',
      soc: 62.0, powerKw: 42.0, phase: 'CC_PHASE',
    });

    // Bay A2 — MG ZS EV (Crimson)
    const car3 = createRealisticEV(carColors[1]);
    car3.position.set(8, 0, 0);
    car3.rotation.y = -Math.PI / 2;
    scene.add(car3);
    vehicleList.push({
      id: 'sess-103', model: 'MG ZS EV', mesh: car3,
      chargingPortPos: new THREE.Vector3(8, 1.0, 1),
      currentPos: new THREE.Vector3(8, 0, 0),
      targetPos: new THREE.Vector3(8, 0, 0),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-a2',
      soc: 48.0, powerKw: 45.0, phase: 'CC_PHASE',
    });

    // Bay A3 — Ola S1 Pro (Indigo)
    const car4 = createRealisticEV(carColors[5]);
    car4.position.set(8, 0, 8);
    car4.rotation.y = -Math.PI / 2;
    scene.add(car4);
    vehicleList.push({
      id: 'sess-104', model: 'Ola S1 Pro', mesh: car4,
      chargingPortPos: new THREE.Vector3(8, 1.0, 9),
      currentPos: new THREE.Vector3(8, 0, 8),
      targetPos: new THREE.Vector3(8, 0, 8),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-a3',
      soc: 71.5, powerKw: 38.0, phase: 'CC_PHASE',
    });

    // ─── ROW B BAYS (x=24): All 3 bays occupied ──────────────────────
    // Bay B1 — Kia EV6 (Rose)
    const car5 = createRealisticEV(carColors[6]);
    car5.position.set(24, 0, -8);
    car5.rotation.y = -Math.PI / 2;
    scene.add(car5);
    vehicleList.push({
      id: 'sess-105', model: 'Kia EV6', mesh: car5,
      chargingPortPos: new THREE.Vector3(24, 1.0, -7),
      currentPos: new THREE.Vector3(24, 0, -8),
      targetPos: new THREE.Vector3(24, 0, -8),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-b1',
      soc: 34.0, powerKw: 50.0, phase: 'CC_PHASE',
    });

    // Bay B2 — BYD Atto 3 (Green)
    const car2 = createRealisticEV(carColors[2]);
    car2.position.set(24, 0, 0);
    car2.rotation.y = -Math.PI / 2;
    scene.add(car2);
    vehicleList.push({
      id: 'sess-102', model: 'BYD Atto 3', mesh: car2,
      chargingPortPos: new THREE.Vector3(24, 1.0, 1),
      currentPos: new THREE.Vector3(24, 0, 0),
      targetPos: new THREE.Vector3(24, 0, 0),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-b2',
      soc: 92.0, powerKw: 18.0, phase: 'CV_PHASE',
    });

    // Bay B3 — Hyundai Ioniq 5 (Teal)
    const car6 = createRealisticEV(carColors[7]);
    car6.position.set(24, 0, 8);
    car6.rotation.y = -Math.PI / 2;
    scene.add(car6);
    vehicleList.push({
      id: 'sess-106', model: 'Hyundai Ioniq 5', mesh: car6,
      chargingPortPos: new THREE.Vector3(24, 1.0, 9),
      currentPos: new THREE.Vector3(24, 0, 8),
      targetPos: new THREE.Vector3(24, 0, 8),
      currentRotY: -Math.PI / 2, targetRotY: -Math.PI / 2,
      status: 'PARKED_CHARGING', assignedBayId: 'bay-b3',
      soc: 55.0, powerKw: 44.0, phase: 'CC_PHASE',
    });

    // ─── QUEUE VEHICLES: 5 cars waiting near canopy entrance ─────────
    const queueSpecs = [
      { color: 0x7c3aed, x: 32, z: 14,  model: 'EV-Q01', soc: 15.0, rot: Math.PI },       // Purple
      { color: 0xf59e0b, x: 38, z: 14,  model: 'EV-Q02', soc: 23.0, rot: Math.PI },       // Amber
      { color: 0xe11d48, x: 44, z: 14,  model: 'EV-Q03', soc: 8.0,  rot: Math.PI },       // Rose
      { color: 0x6366f1, x: 32, z: 20,  model: 'EV-Q04', soc: 31.0, rot: Math.PI },       // Indigo
      { color: 0x65a30d, x: 38, z: 20,  model: 'EV-Q05', soc: 19.0, rot: Math.PI },       // Lime
    ];
    queueSpecs.forEach((q, i) => {
      const qCar = createRealisticEV(q.color);
      qCar.position.set(q.x, 0, q.z);
      qCar.rotation.y = q.rot;
      scene.add(qCar);
      vehicleList.push({
        id: `queue-${i}`, model: q.model, mesh: qCar,
        chargingPortPos: new THREE.Vector3(q.x, 0.5, q.z),
        currentPos: new THREE.Vector3(q.x, 0, q.z),
        targetPos: new THREE.Vector3(q.x, 0, q.z),
        currentRotY: q.rot, targetRotY: q.rot,
        status: 'QUEUED', soc: q.soc, powerKw: 0, phase: 'WAITING',
      });
    });

    vehicleListRef.current = vehicleList;

    // ===== ENVIRONMENTAL DETAILS — TREES =====
    const treePositions = [
      { x: -38, z: 15, h: 5, r: 2.2 },
      { x: -36, z: -14, h: 6, r: 2.5 },
      { x: -42, z: 4, h: 4.5, r: 2.0 },
      { x: 38, z: 15, h: 5.5, r: 2.3 },
      { x: 36, z: -14, h: 6.5, r: 2.8 },
      { x: 42, z: -6, h: 4, r: 1.8 },
      { x: -10, z: -18, h: 5, r: 2.0 },
      { x: 10, z: -20, h: 6, r: 2.6 },
      { x: 30, z: -18, h: 5, r: 2.2 },
      { x: -30, z: 18, h: 5.5, r: 2.1 },
      { x: 0, z: 22, h: 4.5, r: 1.9 },
      { x: 40, z: 5, h: 5, r: 2.0 },
    ];
    treePositions.forEach((tp) => {
      const tree = createTree(tp.h, tp.r);
      tree.position.set(tp.x, 0, tp.z);
      scene.add(tree);
    });

    // ===== SMALL CONTROL KIOSK BUILDING =====
    const kioskGrp = new THREE.Group();
    kioskGrp.position.set(-14, 0, -12);

    const kioskBody = new THREE.Mesh(
      new THREE.BoxGeometry(4, 3.5, 3),
      new THREE.MeshStandardMaterial({ color: 0xd0d0d0, roughness: 0.5, metalness: 0.3 })
    );
    kioskBody.position.y = 1.75;
    kioskBody.castShadow = true;
    kioskGrp.add(kioskBody);

    // Kiosk roof
    const kioskRoof = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.2, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.4, metalness: 0.5 })
    );
    kioskRoof.position.y = 3.6;
    kioskRoof.castShadow = true;
    kioskGrp.add(kioskRoof);

    // Kiosk door
    const kioskDoor = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.4 })
    );
    kioskDoor.position.set(0, 1.3, 1.51);
    kioskGrp.add(kioskDoor);

    // Kiosk window
    const kioskWindow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.05, metalness: 0.8 })
    );
    kioskWindow.position.set(-1.2, 2.2, 1.51);
    kioskGrp.add(kioskWindow);

    scene.add(kioskGrp);

    // ===== GRASS PATCHES =====
    const grassMat = new THREE.MeshStandardMaterial({ color: 0x4a8c3f, roughness: 0.85 });
    const grassPositions = [
      { x: -40, z: 0, w: 12, d: 30 },
      { x: 45, z: 0, w: 8, d: 25 },
      { x: 0, z: 25, w: 80, d: 8 },
      { x: 0, z: -24, w: 80, d: 6 },
    ];
    grassPositions.forEach((gp) => {
      const grass = new THREE.Mesh(new THREE.PlaneGeometry(gp.w, gp.d), grassMat);
      grass.rotation.x = -Math.PI / 2;
      grass.position.set(gp.x, 0.02, gp.z);
      scene.add(grass);
    });

    // ===== POWER FLOW ANIMATED PARTICLES =====
    const pCount = 200;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      const t = i / pCount;
      pPositions[i * 3] = -22 + t * 46;
      pPositions[i * 3 + 1] = 1.0 + Math.sin(i * 0.3) * 0.15;
      pPositions[i * 3 + 2] = 0;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0x3b82f6,
      size: 0.45,
      transparent: true,
      opacity: 0.85,
    });
    particleMatRef.current = pMat;
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // ===== ANIMATION LOOP =====
    let animId: number;
    let elapsed = 0;

    const renderLoop = () => {
      const delta = 0.016; // ~60fps
      elapsed += delta;

      // Read dynamic state from refs
      const curView = cameraViewRef.current;
      const curScenario = scenarioRef.current;
      const curTransformer = transformerRef.current;
      const curSessions = sessionsRef.current;
      const dims = containerDimsRef.current;
      const curTemp = ambientTempRef.current ?? (curTransformer ? curTransformer.ambient_temp_c : 28);

      const dynamicIsHighTemp = curScenario === 'HIGH_TEMP' || curTemp >= 35;
      const dynamicIsGridSurge = curScenario === 'GRID_SURGE';
      const dynamicIsFaulted = curScenario === 'CHARGER_FAILURE';
      const dynamicIsPhantom = curScenario === 'DRIVER_DELAY';
      const dynamicIsCCCV = curScenario === 'CC_CV_CONGESTION';
      const dynamicIsPeak = curScenario === 'PEAK_DEMAND';

      // === Dynamic material updates ===
      if (thermalLightRef.current) {
        thermalLightRef.current.color.setHex(dynamicIsHighTemp ? 0xff8c00 : 0x4fc3f7);
        thermalLightRef.current.intensity = dynamicIsHighTemp ? Math.min(5.0, 1.5 + (curTemp - 30) * 0.15) : 0.6;
      }
      if (transTankMatRef.current) {
        transTankMatRef.current.color.setHex(dynamicIsHighTemp ? 0x8B6914 : 0x3a6b3a);
        transTankMatRef.current.emissive.setHex(dynamicIsHighTemp ? 0xff6600 : 0x000000);
        transTankMatRef.current.emissiveIntensity = dynamicIsHighTemp ? Math.min(0.8, 0.2 + (curTemp - 30) * 0.03) : 0;
      }
      if (transFinMatRef.current) {
        transFinMatRef.current.color.setHex(dynamicIsHighTemp ? 0x9a7a2a : 0x5a8a5a);
      }
      if (warnRingRef.current) {
        const ringMat = warnRingRef.current.material as THREE.MeshBasicMaterial;
        ringMat.opacity = dynamicIsHighTemp ? 0.5 + Math.sin(elapsed * 4) * 0.2 : 0.0;
      }
      if (cableMatRef.current) {
        cableMatRef.current.color.setHex(dynamicIsGridSurge ? 0xcc3333 : 0x444444);
      }
      if (particleMatRef.current) {
        particleMatRef.current.color.setHex(dynamicIsGridSurge ? 0xff4444 : 0x3b82f6);
        particleMatRef.current.size = dynamicIsGridSurge ? 0.7 : 0.45;
      }

      // === Animated charging cable pulse — all 6 bays, intensity by session power ===
      chargingCablePulseMeshes.current.forEach((glowMesh, idx) => {
        const mat = glowMesh.material as THREE.MeshBasicMaterial;
        const vList = vehicleListRef.current;
        const isChargingBayVehicle = idx < 6 && vList[idx]?.status === 'PARKED_CHARGING';
        const powerKw = vList[idx]?.powerKw ?? 0;
        const isCV = vList[idx]?.phase === 'CV_PHASE';
        const isFaultedBay = dynamicIsFaulted && idx === 2; // gun-a3 is bay index 2

        if (isFaultedBay) {
          // CHARGER FAILURE: bay 2 (gun-a3) flashes red aggressively
          mat.color.setHex(0xff2222);
          mat.opacity = 0.4 + Math.sin(elapsed * 12) * 0.35;
        } else if (isChargingBayVehicle && powerKw > 0) {
          if (isCV || dynamicIsCCCV) {
            // CC-CV / high SOC taper: slow amber pulse
            mat.color.setHex(0xf59e0b);
            mat.opacity = 0.08 + Math.sin(elapsed * 1.2 + idx * 0.8) * 0.06;
          } else if (dynamicIsGridSurge) {
            // GRID SURGE: rapid intense red/orange flicker
            mat.color.setHex(idx % 2 === 0 ? 0xff4444 : 0xff8800);
            mat.opacity = 0.25 + Math.sin(elapsed * 8 + idx * 2.1) * 0.2;
          } else {
            // Normal charging: smooth cyan pulse proportional to power
            mat.color.setHex(0x22d3ee);
            const normalised = Math.min(1, powerKw / 55);
            mat.opacity = (0.08 + Math.sin(elapsed * 3 + idx * 1.5) * 0.10) * (0.5 + normalised * 0.5);
          }
        } else {
          mat.opacity = 0.0;
        }
      });

      // === Dynamic bay floor highlight per scenario ===
      bayFillMatsRef.current.forEach((fillMat, idx) => {
        const isFaultedBay = dynamicIsFaulted && idx === 2;
        const isPeakBay = dynamicIsPeak && idx < 3; // Hub-A bays under peak load
        const isGridBay = dynamicIsGridSurge;
        if (isFaultedBay) {
          fillMat.color.setHex(0xff2222);
          fillMat.opacity = 0.25 + Math.sin(elapsed * 6) * 0.12;
        } else if (isPeakBay) {
          fillMat.color.setHex(0xf59e0b);
          fillMat.opacity = 0.22 + Math.sin(elapsed * 2 + idx) * 0.06;
        } else if (isGridBay) {
          fillMat.color.setHex(0xef4444);
          fillMat.opacity = 0.18 + Math.sin(elapsed * 3 + idx * 0.7) * 0.06;
        } else if (dynamicIsCCCV) {
          const isCV = vehicleListRef.current[idx]?.phase === 'CV_PHASE';
          fillMat.color.setHex(isCV ? 0xfbbf24 : 0x22c55e);
          fillMat.opacity = 0.18;
        } else {
          fillMat.color.setHex(0x22c55e);
          fillMat.opacity = 0.18;
        }
      });

      // === Dynamic LED dome colours per bay ===
      bayLedMatsRef.current.forEach((ledMat, idx) => {
        const isFaultedBay = dynamicIsFaulted && idx === 2;
        const vList = vehicleListRef.current;
        const isCharging = vList[idx]?.status === 'PARKED_CHARGING' && (vList[idx]?.powerKw ?? 0) > 0;
        if (isFaultedBay) {
          ledMat.color.setHex(0xff0000);
        } else if (dynamicIsGridSurge) {
          ledMat.color.setHex(0xff8800);
        } else if (dynamicIsCCCV && vList[idx]?.phase === 'CV_PHASE') {
          ledMat.color.setHex(0xfbbf24); // amber for taper
        } else if (isCharging) {
          ledMat.color.setHex(0x22c55e); // green
        } else {
          ledMat.color.setHex(0x334155); // off/dark
        }
      });

      // === Update vehicle data from backend sessions — match by bay/gun mapping ===
      const vList = vehicleListRef.current;
      // Bay-to-gun mapping: bay index → expected gun_id prefix
      const bayGunMap = ['gun-hub-a-1', 'gun-hub-a-2', 'gun-hub-a-3', 'gun-hub-b-1', 'gun-hub-b-2', 'gun-hub-b-3'];
      for (let i = 0; i < Math.min(6, vList.length); i++) {
        // Find the backend session assigned to this bay's gun
        const matchedSession = curSessions.find(s => s.gun_id === bayGunMap[i]);
        if (matchedSession) {
          vList[i].soc = matchedSession.current_soc;
          vList[i].powerKw = matchedSession.allocated_power_kw;
          vList[i].phase = matchedSession.phase;
          vList[i].model = matchedSession.vehicle_model;
          vList[i].id = matchedSession.id;
          vList[i].status = 'PARKED_CHARGING';
          // Handle phantom-assigned sessions from backend
          if (matchedSession.is_phantom_assigned) {
            vList[i].model = matchedSession.vehicle_model + ' (Phantom)';
          }
        } else {
          // No active session on this gun — show as idle
          vList[i].powerKw = 0;
          vList[i].phase = 'IDLE';
          vList[i].status = 'PARKED_CHARGING'; // car stays visually parked but idle
        }
      }

      // === Update queue vehicle visibility from hub data ===
      const curHubs = hubsRef.current;
      const totalQueueCount = curHubs.reduce((sum, h) => sum + (h.current_queue_count || 0), 0);
      const queueVehicles = vList.slice(6); // queue cars start at index 6
      queueVehicles.forEach((qv, qi) => {
        // Show/hide queue cars based on actual backend queue count
        qv.mesh.visible = qi < totalQueueCount;
      });

      // Camera preset lerping — only when triggered by preset button, stops on user interaction
      if (isTransitioningRef.current) {
        const camDest = cameraTargetPosRef.current;
        const lookDest = cameraLookAtRef.current;
        camera.position.lerp(camDest, 0.055);
        controls.target.lerp(lookDest, 0.055);
        // Stop transitioning once close enough
        if (camera.position.distanceTo(camDest) < 0.25) {
          isTransitioningRef.current = false;
        }
      }
      controls.update();

      // Animate power flow particles
      const pos = particles.geometry.attributes.position.array as Float32Array;
      const loadKw = curTransformer ? curTransformer.current_load_kw : 148;
      const speed = dynamicIsGridSurge ? 0.55 : Math.max(0.05, loadKw / 350);

      for (let i = 0; i < pCount; i++) {
        pos[i * 3] += speed;
        if (pos[i * 3] > 24) pos[i * 3] = -22;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Project positions to screen — FIX: use actual container dims instead of hardcoded 900/500
      const hw = dims.w / 2;
      const hh = dims.h / 2;

      const txWorldPos = new THREE.Vector3(-6, 7.5, 0);
      txWorldPos.project(camera);
      setTransformerScreenPos({
        x: (txWorldPos.x * hw) + hw,
        y: -(txWorldPos.y * hh) + hh,
        visible: txWorldPos.z < 1,
      });

      const evData = vList.map((v) => {
        const p = v.mesh.position.clone().add(new THREE.Vector3(0, 3.5, 0));
        p.project(camera);
        return {
          id: v.id, model: v.model,
          soc: v.soc, power: v.powerKw, phase: v.phase,
          status: v.status,
          x: (p.x * hw) + hw, y: -(p.y * hh) + hh,
          visible: p.z < 1,
        };
      });
      setEvScreenPositions(evData);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Handle resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 960;
      const h = container.clientHeight || 520;
      containerDimsRef.current = { w, h };
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      sceneInitRef.current = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []); // EMPTY DEPS — scene created once, never torn down on prop changes

  return (
    <div className="space-y-6 animate-fade-in font-mono">
      {/* DEMO TOUR & CAMERA PRESET CONTROLS HEADER */}
      <div className="glass-panel p-4 rounded-2xl border border-cyan-500/50 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/40 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={toggleDemoPlay}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-xs font-black tracking-wider uppercase transition duration-300 flex items-center gap-2 ${
              demoPlaying
                ? 'bg-amber-500 text-slate-950 shadow-glow-amber'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-glow'
            }`}
          >
            {demoPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                STOP DEMO
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                ▶ PLAY DEMO
              </>
            )}
          </button>

          <div className="min-w-0 flex-1">
            {demoPlaying ? (
              <>
                {/* Step indicator + title */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="flex-shrink-0 text-[9px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 px-2 py-0.5 rounded-full font-mono tracking-wider">
                    DEMO ACTIVE · STEP {demoStep + 1}/{DEMO_STEPS.length}
                  </span>
                  <span className="text-[10px] font-bold text-white truncate">{DEMO_STEPS[demoStep]?.title}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${((demoStep + 1) / DEMO_STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1 truncate">{DEMO_STEPS[demoStep]?.desc}</p>
              </>
            ) : (
              <>
                <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  REALISTIC 3D INDUSTRIAL EV DIGITAL TWIN
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  AUTO 70s TOUR — 7 SCENARIOS · Backend→Algorithm→WebSocket→3D. Click ▶ to begin.
                </p>
              </>
            )}
          </div>
        </div>

        {/* 3D CAMERA PRESET BUTTONS */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 font-bold px-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-cyan-400" /> 3D CAMERA:
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

      {/* HERO 3D SCENE & FLOATING DIGITAL TWIN HUD OVERLAY */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-slate-800 space-y-6">
        
        {/* HUD FLOATING TOP METRICS BAR */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 backdrop-blur-md relative z-20 font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">FEEDER LOAD</div>
            <div className="text-lg font-black text-cyan-400 mt-0.5">
              {transformer ? transformer.current_load_kw.toFixed(1) : '--'} kW
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">SAFE HEADROOM</div>
            <div className={`text-lg font-black mt-0.5 ${ambientTempSlider >= 35 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {Math.max(0, (200 * (ambientTempSlider <= 30 ? 1.0 : Math.max(0.55, 1.0 - (ambientTempSlider - 30) * 0.022))) - (transformer ? transformer.current_load_kw : 148)).toFixed(1)} kW
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">AMBIENT TEMP</div>
            <div className={`text-lg font-black mt-0.5 ${ambientTempSlider >= 35 ? 'text-amber-400' : 'text-slate-200'}`}>
              {ambientTempSlider}°C
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

        {/* 3D WEBGL THREE.JS CANVAS CONTAINER */}
        <div className="relative w-full h-[520px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
          
          {/* CELEBRATORY SPAWNED EV TOAST BANNER */}
          {spawnToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="flex items-center gap-2 bg-cyan-950/95 border border-cyan-400 text-cyan-200 text-xs font-mono font-bold px-4 py-2 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.6)] backdrop-blur-md animate-pulse">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {spawnToast}
              </div>
            </div>
          )}

          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* ZOOM & NAVIGATION HUD BUTTONS */}
          <div className="absolute top-3 right-3 z-40 flex flex-col gap-1.5">
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              className="w-9 h-9 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              className="w-9 h-9 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-cyan-500 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-9 h-px bg-slate-700 my-0.5" />
            <button
              onClick={handleResetCamera}
              title="Reset View"
              className="w-9 h-9 rounded-lg bg-slate-900/90 border border-slate-700 hover:border-amber-500 hover:bg-slate-800 text-slate-300 hover:text-amber-400 flex items-center justify-center transition-all duration-200 shadow-lg backdrop-blur-sm"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* NAVIGATION HINT BADGE */}
          <div className="absolute bottom-3 left-3 z-40 flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 backdrop-blur-sm pointer-events-none">
            <Move className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-400 font-mono">
              Drag to orbit · Scroll to zoom · Right-drag to pan
            </span>
          </div>

          {/* FLOATING DIGITAL TWIN OVERLAY FOR TRANSFORMER #04 — FIX: responsive bounds */}
          {transformerScreenPos.visible && transformerScreenPos.x > 0 && transformerScreenPos.x < containerDimsRef.current.w && (
            <div
              className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-full z-30 transition-all duration-75"
              style={{ left: `${transformerScreenPos.x}px`, top: `${transformerScreenPos.y - 12}px` }}
            >
              <div className="glass-panel p-2.5 rounded-xl border border-amber-500/60 bg-slate-950/90 text-[10px] font-mono space-y-1 shadow-glow-amber max-w-[170px]">
                <div className="flex items-center justify-between text-amber-400 font-bold border-b border-slate-800 pb-1">
                  <span>TRANSFORMER #04</span>
                  <span className="text-[9px] bg-amber-500/20 px-1 rounded">{transformer ? transformer.capacity_kw : 200} kW</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[9px] text-slate-300 pt-0.5">
                  <div>LOAD: <span className="text-cyan-300 font-bold">{transformer ? transformer.current_load_kw.toFixed(0) : '148'}kW</span></div>
                  <div>HEADROOM: <span className={`${ambientTempSlider >= 35 ? 'text-amber-400' : 'text-emerald-400'} font-bold`}>{Math.max(0, (200 * (ambientTempSlider <= 30 ? 1.0 : Math.max(0.55, 1.0 - (ambientTempSlider - 30) * 0.022))) - (transformer ? transformer.current_load_kw : 148)).toFixed(0)}kW</span></div>
                  <div>AMBIENT: <span className="text-amber-300 font-bold">{ambientTempSlider}°C</span></div>
                  <div>THERMAL: <span className="text-white font-bold">{Math.min(98, Math.round(55 + (ambientTempSlider / 50) * 35))}%</span></div>
                </div>
              </div>
            </div>
          )}

          {/* FLOATING DIGITAL TWIN OVERLAYS FOR ACTIVE EVs */}
          {evScreenPositions.map((ev) => {
            const cw = containerDimsRef.current.w;
            const ch = containerDimsRef.current.h;
            // Basic visibility check — must be on screen
            if (!ev.visible || ev.x <= 20 || ev.x >= cw - 20 || ev.y <= 20 || ev.y >= ch - 10) return null;

            const isQueued   = ev.status === 'QUEUED';
            const isCharging = ev.status === 'PARKED_CHARGING';
            const isCV       = ev.phase === 'CV_PHASE';

            // Clamp X so tag card never bleeds off canvas edges
            const TAG_W = isCharging ? 160 : 90;
            const clampedX = Math.min(Math.max(ev.x, TAG_W / 2 + 4), cw - TAG_W / 2 - 4);
            const clampedY = Math.min(ev.y - 10, ch - 10);

            if (isQueued) {
              // Queued cars: tiny compact pill — model + SOC only
              return (
                <div
                  key={ev.id}
                  className="absolute pointer-events-none z-30"
                  style={{ left: `${clampedX}px`, top: `${clampedY}px`, transform: 'translateX(-50%) translateY(-100%)' }}
                >
                  <div className="flex flex-col items-center">
                    <div
                      style={{ background: 'rgba(2,6,23,0.95)', border: '1px solid rgba(100,116,139,0.7)' }}
                      className="rounded-lg px-2 py-0.5 flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <span className="text-[8px] font-bold text-slate-300 font-mono">{ev.model}</span>
                      <span className="text-[8px] text-cyan-400 font-mono font-bold">{ev.soc.toFixed(0)}%</span>
                      <span
                        style={{ background: 'rgba(71,85,105,0.5)' }}
                        className="text-[7px] text-slate-400 font-mono px-1 rounded"
                      >WAIT</span>
                    </div>
                    <div className="w-1 h-1 rounded-full mt-0.5" style={{ background: '#64748b' }} />
                  </div>
                </div>
              );
            }

            // Charging bay cars: full detailed card
            return (
              <div
                key={ev.id}
                className="absolute pointer-events-none z-30"
                style={{ left: `${clampedX}px`, top: `${clampedY}px`, transform: 'translateX(-50%) translateY(-100%)' }}
              >
                <div className="flex flex-col items-center">
                  <div
                    style={{
                      background: 'rgba(2,6,23,0.97)',
                      border: `1px solid ${isCV ? 'rgba(245,158,11,0.7)' : 'rgba(34,211,238,0.6)'}`,
                      minWidth: '152px',
                      maxWidth: '168px',
                      boxShadow: isCV
                        ? '0 0 12px -3px rgba(245,158,11,0.4)'
                        : '0 0 12px -3px rgba(34,211,238,0.35)',
                    }}
                    className="rounded-xl text-[9px] font-mono"
                  >
                    {/* Model header */}
                    <div
                      style={{ borderBottom: '1px solid rgba(51,65,85,0.8)' }}
                      className="flex items-center gap-1.5 px-2.5 pt-2 pb-1"
                    >
                      <Car className="w-3 h-3 text-cyan-400 flex-shrink-0" />
                      <span className="font-bold text-white truncate leading-none text-[9px]">{ev.model}</span>
                    </div>
                    {/* SOC / PWR grid */}
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 px-2.5 pt-1.5 pb-1">
                      <span className="text-slate-400 text-[8px]">SOC</span>
                      <span className="text-cyan-300 font-bold text-right text-[9px]">{ev.soc.toFixed(1)}%</span>
                      <span className="text-slate-400 text-[8px]">PWR</span>
                      <span className="text-emerald-400 font-bold text-right text-[9px]">{ev.power.toFixed(1)} kW</span>
                    </div>
                    {/* Phase badge */}
                    <div className="px-2.5 pb-2">
                      <span
                        style={{
                          background: isCV ? 'rgba(245,158,11,0.2)' : 'rgba(34,211,238,0.12)',
                          color: isCV ? '#fcd34d' : '#67e8f9',
                          fontSize: '7px',
                          fontWeight: 700,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          letterSpacing: '0.05em',
                          display: 'inline-block',
                        }}
                      >
                        {ev.phase.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                  {/* Anchor dot */}
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-0.5"
                    style={{ background: isCV ? '#f59e0b' : '#22d3ee' }}
                  />
                </div>
              </div>
            );
          })}
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
              Slide ambient temperature to watch dynamic 3D transformer thermal headroom derate in real time.
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
              className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-glow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSpawning ? 'Spawning EV...' : 'SPAWN EV INTO SIMULATION QUEUE'}
            </button>
          </form>
        </div>

        {/* 36-GUN INTERACTIVE CHARGER MATRIX VISUALIZER */}
        <div className="glass-panel p-6 rounded-2xl space-y-4 font-mono">
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
                    // Find actual session on this gun from backend
                    const gunSession = sessions.find(s => s.gun_id === gunId);
                    const isCharging = !!gunSession && gunSession.allocated_power_kw > 0;
                    const isGunFaulted = (currentScenario === 'CHARGER_FAILURE' && gunId === 'gun-hub-a-4') || (selectedGunId === gunId);
                    const gunPower = gunSession ? gunSession.allocated_power_kw : 0;

                    return (
                      <div
                        key={gunIdx}
                        onClick={() => setSelectedGunId(gunId)}
                        className={`p-2.5 rounded-lg border text-center font-mono cursor-pointer transition transform hover:scale-105 ${
                          isGunFaulted
                            ? 'bg-red-950/40 border-red-500/80 text-red-300 shadow-glow-red'
                            : isCharging
                            ? 'bg-cyan-950/40 border-cyan-500/60 text-cyan-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="text-[10px] font-bold flex items-center justify-center gap-1">
                          G-{gunIdx}
                          {isGunFaulted && <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />}
                        </div>
                        <div className="text-[9px] font-bold mt-0.5">
                          {isGunFaulted ? 'FAULT' : isCharging ? 'CHARGING' : 'AVAILABLE'}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {isGunFaulted ? '0.0 kW' : `${gunPower.toFixed(1)} kW`}
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
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Configured Power:</span>
                  <span className="text-white font-bold">60.0 kW</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Heartbeat Latency:</span>
                  <span className={selectedGunId === 'gun-hub-a-4' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedGunId === 'gun-hub-a-4' ? '480.0 ms' : '42.0 ms'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Power Jitter:</span>
                  <span className={selectedGunId === 'gun-hub-a-4' ? 'text-red-400 font-bold' : 'text-slate-200'}>
                    {selectedGunId === 'gun-hub-a-4' ? '4.2 kW' : '0.2 kW'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reliability Score:</span>
                  <span className={selectedGunId === 'gun-hub-a-4' ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedGunId === 'gun-hub-a-4' ? '28.0%' : '98.0%'}
                  </span>
                </div>
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

export default ThreeDigitalTwinVisualizer;
