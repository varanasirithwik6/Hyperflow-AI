import React from 'react';
import { Zap, ShieldCheck, Activity, Cpu, Car, BarChart3, Radio, Sun, Moon, Film } from 'lucide-react';

interface HeaderProps {
  activeTab: 'driver' | 'session' | 'operator' | 'simulation';
  setActiveTab: (tab: 'driver' | 'session' | 'operator' | 'simulation') => void;
  isConnected: boolean;
  currentScenario: string;
  isLightTheme: boolean;
  onToggleTheme: () => void;
  onOpenIntro?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isConnected,
  currentScenario,
  isLightTheme,
  onToggleTheme,
  onOpenIntro,
}) => {
  const tabs = [
    {
      id: 'driver' as const,
      label: 'Find Best Charge',
      icon: Car,
      activeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-[0_0_14px_-2px_rgba(52,211,153,0.45)]',
      iconColor: 'text-emerald-400',
      dotColor: 'bg-emerald-400',
    },
    {
      id: 'session' as const,
      label: 'Active Session',
      icon: Zap,
      activeColor: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_14px_-2px_rgba(34,211,238,0.45)]',
      iconColor: 'text-cyan-400',
      dotColor: 'bg-cyan-400',
    },
    {
      id: 'operator' as const,
      label: 'CPO Control Center',
      icon: BarChart3,
      activeColor: 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-[0_0_14px_-2px_rgba(96,165,250,0.45)]',
      iconColor: 'text-blue-400',
      dotColor: 'bg-blue-400',
    },
    {
      id: 'simulation' as const,
      label: 'Live Simulation',
      icon: Radio,
      activeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-[0_0_14px_-2px_rgba(167,139,250,0.45)]',
      iconColor: 'text-purple-400',
      dotColor: 'bg-purple-400',
      pulse: true,
    },
  ];

  return (
    <header className="border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-50 px-4 lg:px-8 py-3 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="h-11 flex items-center justify-center rounded-xl bg-slate-950/80 border border-cyan-500/30 p-1 shadow-glow shadow-cyan-500/20 transform hover:scale-105 transition-transform">
            <img src="/hyperflow-logo.png" alt="HyperFlow AI Official Logo" className="h-9 w-auto object-contain rounded-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-extrabold text-xl tracking-tight bg-clip-text text-transparent ${isLightTheme ? 'bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-600' : 'bg-gradient-to-r from-white via-slate-100 to-cyan-400'}`}>
                HYPERFLOW AI
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${isLightTheme ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-950/80 text-cyan-400 border border-cyan-800/50'}`}>
                DIGITAL TWIN ACTIVE
              </span>
            </div>
            <p className={`text-[11px] font-mono font-bold tracking-wider ${isLightTheme ? 'text-cyan-700' : 'text-cyan-400/90'}`}>
              CHARGE SMARTER • WAIT LESS
            </p>
          </div>
        </div>

        {/* View Switcher Tabs — clear active visual per tab */}
        <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? tab.activeColor
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                {/* Active indicator dot */}
                {isActive && (
                  <span className={`absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${tab.dotColor}`} />
                )}
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    isActive ? tab.iconColor : 'text-slate-500'
                  } ${tab.pulse && !isActive ? 'animate-pulse' : ''}`}
                />
                <span className={isActive ? 'font-bold' : ''}>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Badges + Theme Toggle + Watch Intro */}
        <div className="flex items-center gap-2.5">
          {/* Watch Animation Video Button */}
          {onOpenIntro && (
            <button
              onClick={onOpenIntro}
              title="Watch Intro Animation Video"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 text-xs font-bold transition shadow-sm"
            >
              <Film className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">ANIMATION</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300 font-mono text-[11px]">
              SCENARIO: <strong className="text-cyan-300">{currentScenario}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <span className={isConnected ? 'status-dot-active' : 'status-dot-amber'} />
            <span className="text-slate-300 font-mono text-[11px]">
              {isConnected ? 'TELEMETRY LIVE (1Hz)' : 'SIMULATION'}
            </span>
          </div>

          {/* Light / Dark theme toggle */}
          <button
            onClick={onToggleTheme}
            title={isLightTheme ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-all duration-200 ${
              isLightTheme
                ? 'bg-amber-400/20 border-amber-400/50 text-amber-400 hover:bg-amber-400/30'
                : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'
            }`}
          >
            {isLightTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
