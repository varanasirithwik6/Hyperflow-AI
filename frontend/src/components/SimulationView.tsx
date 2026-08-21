import React, { useState } from 'react';
import {
  Activity, Cpu, Zap, Radio, Server, ShieldCheck, ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, Layers, Gauge, BatteryCharging, Flame, PlusCircle, Wrench, X, Sparkles, Sliders
} from 'lucide-react';
import { Hub, EVSession, TransformerStatus, LiveMetrics, AIDecisionEvent, OCPPMessage, EVSEGun } from '../types';
import { updateAmbientTemp, spawnEVInQueue, controlEVSEGun } from '../services/api';
import { ThreeDigitalTwinVisualizer } from './ThreeDigitalTwinVisualizer';

interface SimulationViewProps {
  hubs: Hub[];
  sessions: EVSession[];
  transformer: TransformerStatus | null;
  metrics: LiveMetrics | null;
  decisionFeed: AIDecisionEvent[];
  ocppFeed: OCPPMessage[];
  currentScenario: string;
  onScenarioChange?: (scenario: string) => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({
  hubs,
  sessions,
  transformer,
  metrics,
  decisionFeed,
  ocppFeed,
  currentScenario,
  onScenarioChange = () => {},
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* HERO REAL 3D WEBGL VIRTUAL SIMULATION VISUALIZER */}
      <ThreeDigitalTwinVisualizer
        hubs={hubs}
        sessions={sessions}
        transformer={transformer}
        metrics={metrics}
        decisionFeed={decisionFeed}
        ocppFeed={ocppFeed}
        currentScenario={currentScenario}
        onScenarioChange={onScenarioChange}
      />
    </div>
  );
};
