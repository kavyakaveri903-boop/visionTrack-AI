import React from 'react';
import { Eye, Sun, Moon, ShieldCheck, History, Activity, Home } from 'lucide-react';

interface NavbarProps {
  currentView: 'home' | 'live' | 'history';
  onNavigate: (view: 'home' | 'live' | 'history') => void;
  historyCount: number;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isModelRunning: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  historyCount,
  theme,
  onToggleTheme,
  isModelRunning,
}) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-200 bg-[#07111F]/90 dark:bg-[#07111F]/90 dark:border-white/10 light:bg-white/90 light:border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-blue-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300">
            <div className="w-full h-full rounded-[11px] bg-[#07111F] flex items-center justify-center">
              <Eye className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
            </div>
            {isModelRunning && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-200 to-blue-400">
                VISIONTRACK <span className="text-cyan-400">AI</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 border border-cyan-500/30">
                Task 4
              </span>
            </div>
            <p className="text-[11px] font-mono tracking-tight text-slate-400 -mt-0.5 hidden sm:block">
              See. Understand. Track.
            </p>
          </div>
        </div>

        {/* 3 Main View Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onNavigate('home')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentView === 'home'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-4 h-4" />
            <span className="hidden md:inline">Home</span>
          </button>

          <button
            onClick={() => onNavigate('live')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentView === 'live'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Live Vision</span>
            {isModelRunning && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => onNavigate('history')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              currentView === 'history'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Detection History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-xs font-semibold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {historyCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right side: Privacy Indicator & Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>On-Device AI</span>
          </div>

          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-lg border transition-colors bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 focus:outline-none"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-blue-400" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
