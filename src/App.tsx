import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { LiveVisionView } from './components/LiveVisionView';
import { DetectionHistoryView } from './components/DetectionHistoryView';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DetectionSnapshot } from './types/vision';
import {
  getSnapshots,
  saveSnapshot,
  deleteSnapshot,
  clearSnapshots,
} from './services/historyStorage';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('visiontrack_theme');
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'dark';
  });

  // Active view state: Exactly 3 main views: 'home' | 'live' | 'history'
  const [currentView, setCurrentView] = useState<'home' | 'live' | 'history'>('home');

  // Detection history state
  const [snapshots, setSnapshots] = useState<DetectionSnapshot[]>(() => getSnapshots());

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('visiontrack_theme', theme);
    } catch (err) {
      console.error(err);
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'warning' | 'error' = 'info'
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, message, type };
    setToasts((prev) => [...prev, newToast]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCaptureSnapshot = (snapshot: DetectionSnapshot) => {
    saveSnapshot(snapshot);
    setSnapshots(getSnapshots());
  };

  const handleDeleteSnapshot = (id: string) => {
    deleteSnapshot(id);
    setSnapshots(getSnapshots());
    showToast('Snapshot removed from history.', 'info');
  };

  const handleClearAllSnapshots = () => {
    if (window.confirm('Are you sure you want to clear all saved detection snapshots?')) {
      clearSnapshots();
      setSnapshots([]);
      showToast('All detection history cleared.', 'info');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07111F] text-slate-100 transition-colors duration-200">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        historyCount={snapshots.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isModelRunning={currentView === 'live'}
      />

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentView === 'home' && (
          <HomeView onStartVision={() => setCurrentView('live')} />
        )}

        {currentView === 'live' && (
          <LiveVisionView
            onCaptureSnapshot={handleCaptureSnapshot}
            showToast={showToast}
          />
        )}

        {currentView === 'history' && (
          <DetectionHistoryView
            snapshots={snapshots}
            onDeleteSnapshot={handleDeleteSnapshot}
            onClearAll={handleClearAllSnapshots}
            onGoToLive={() => setCurrentView('live')}
          />
        )}
      </main>

      {/* Floating Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
