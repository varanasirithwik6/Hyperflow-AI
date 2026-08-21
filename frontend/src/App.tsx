import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DriverDashboard } from './components/DriverDashboard';
import { ActiveSessionView } from './components/ActiveSessionView';
import { OperatorDashboard } from './components/OperatorDashboard';
import { SimulationView } from './components/SimulationView';
import { SimulationController } from './components/SimulationController';
import { IntroVideoSplash } from './components/IntroVideoSplash';
import { useWebSockets } from './hooks/useWebSockets';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'driver' | 'session' | 'operator' | 'simulation'>('simulation');
  const [currentScenario, setCurrentScenario] = useState<string>('NORMAL');

  // Light / dark theme — persisted in localStorage
  const [isLightTheme, setIsLightTheme] = useState<boolean>(() => {
    return localStorage.getItem('hyperflow-theme') === 'light';
  });

  // Intro Animation Video Splash — auto-plays on startup unless disabled by user
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return localStorage.getItem('hyperflow-hide-intro-splash') !== 'true';
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isLightTheme) {
      html.classList.add('light');
      localStorage.setItem('hyperflow-theme', 'light');
    } else {
      html.classList.remove('light');
      localStorage.setItem('hyperflow-theme', 'dark');
    }
  }, [isLightTheme]);

  const { telemetry, events, isConnected } = useWebSockets();

  const hubs = telemetry?.hubs || [];
  const sessions = telemetry?.sessions || [];
  const transformer = telemetry?.transformer || null;
  const metrics = telemetry?.metrics || null;
  const reservations = telemetry?.reservations || [];
  const decisionFeed = events?.decision_feed || [];
  const ocppFeed = events?.ocpp_messages || [];

  return (
    <div className="min-h-screen flex flex-col justify-between bg-[#090d16] text-slate-100 transition-colors duration-300">
      <div>
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isConnected={isConnected}
          currentScenario={currentScenario}
          isLightTheme={isLightTheme}
          onToggleTheme={() => setIsLightTheme((v) => !v)}
          onOpenIntro={() => setShowIntro(true)}
        />

        <main className="pb-12">
          {activeTab === 'driver' && (
            <DriverDashboard
              hubs={hubs}
              onStartSession={() => setActiveTab('session')}
              reservations={reservations}
            />
          )}

          {activeTab === 'session' && (
            <ActiveSessionView />
          )}

          {activeTab === 'operator' && (
            <OperatorDashboard
              hubs={hubs}
              sessions={sessions}
              transformer={transformer}
              metrics={metrics}
              decisionFeed={decisionFeed}
              ocppFeed={ocppFeed}
              currentScenario={currentScenario}
              reservations={reservations}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationView
              hubs={hubs}
              sessions={sessions}
              transformer={transformer}
              metrics={metrics}
              decisionFeed={decisionFeed}
              ocppFeed={ocppFeed}
              currentScenario={currentScenario}
              onScenarioChange={setCurrentScenario}
            />
          )}
        </main>
      </div>

      <SimulationController
        currentScenario={currentScenario}
        onScenarioChange={setCurrentScenario}
        metrics={metrics}
      />

      {/* Intro Animation Video Modal / Splash */}
      <IntroVideoSplash
        isOpen={showIntro}
        onClose={() => setShowIntro(false)}
      />
    </div>
  );
};

export default App;
