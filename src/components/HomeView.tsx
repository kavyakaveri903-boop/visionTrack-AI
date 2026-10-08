import React from 'react';
import {
  Eye,
  Crosshair,
  Cpu,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Camera,
  Layers,
  Fingerprint,
  Radio,
  FileCheck2,
} from 'lucide-react';

interface HomeViewProps {
  onStartVision: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onStartVision }) => {
  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12">
        {/* Ambient background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-cyan-500/15 to-purple-600/20 blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-5xl mx-auto text-center px-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 mb-6 shadow-sm shadow-cyan-500/10">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>CodeAlpha AI Internship • Task 4: Object Detection & Tracking</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white mb-4">
            VISIONTRACK <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">AI</span>
          </h1>

          <p className="text-xl sm:text-2xl font-mono text-cyan-300 tracking-wide mb-6">
            “See. Understand. Track.”
          </p>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-300 leading-relaxed mb-10">
            Real-time computer vision that detects, understands and tracks objects across your scene.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onStartVision}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-lg shadow-blue-500/30 hover:shadow-cyan-500/40 transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Camera className="w-5 h-5 text-white" />
              <span>Start Vision</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={scrollToFeatures}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-base font-medium text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-500/30 transition-all duration-200 cursor-pointer"
            >
              <span>Explore Features</span>
            </button>
          </div>

          {/* Simulated Camera Frame Design (Illustration only) */}
          <div className="mt-14 relative max-w-3xl mx-auto rounded-2xl p-1 bg-gradient-to-b from-cyan-500/30 via-blue-500/10 to-transparent shadow-2xl shadow-cyan-950/40">
            <div className="relative rounded-[15px] bg-[#0A1628] border border-cyan-500/30 p-6 sm:p-10 overflow-hidden text-left">
              {/* Grid overlay */}
              <div
                className="absolute inset-0 opacity-15 pointer-events-none"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #00f0ff 1px, transparent 1px), linear-gradient(to bottom, #00f0ff 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />

              {/* HUD Header */}
              <div className="flex items-center justify-between text-xs font-mono text-cyan-400/80 mb-8 border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-bold tracking-wider">REC • CAM_FEED_01</span>
                </div>
                <div className="flex items-center gap-4">
                  <span>RESOL: 1920x1080</span>
                  <span className="text-emerald-400">FPS: 30</span>
                  <span>TF.JS: COCO-SSD</span>
                </div>
              </div>

              {/* Simulated Detection Targets */}
              <div className="relative h-48 sm:h-64 rounded-lg border border-dashed border-cyan-500/20 bg-slate-900/60 p-4 flex flex-col justify-between">
                {/* Target Box 1 */}
                <div className="absolute top-6 left-12 w-36 h-36 border-2 border-cyan-400 rounded-sm bg-cyan-500/5">
                  <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-[#07111F] text-[10px] font-mono text-cyan-300 border border-cyan-400 flex items-center gap-1 shadow">
                    <span>Person</span>
                    <span className="text-white font-bold">• ID: 01</span>
                    <span className="text-emerald-400">• 96%</span>
                  </div>
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-cyan-400" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-400" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-cyan-400" />
                </div>

                {/* Target Box 2 */}
                <div className="absolute bottom-6 right-16 w-44 h-28 border-2 border-purple-400 rounded-sm bg-purple-500/5">
                  <div className="absolute -top-6 left-0 px-2 py-0.5 rounded bg-[#07111F] text-[10px] font-mono text-purple-300 border border-purple-400 flex items-center gap-1 shadow">
                    <span>Car</span>
                    <span className="text-white font-bold">• ID: 02</span>
                    <span className="text-emerald-400">• 93%</span>
                  </div>
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-purple-400" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-purple-400" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-purple-400" />
                </div>

                {/* Reticle in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                  <Crosshair className="w-12 h-12 text-cyan-400/40 animate-spin" style={{ animationDuration: '24s' }} />
                </div>

                {/* Live telemetry footer */}
                <div className="mt-auto flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-cyan-500/20">
                  <span className="text-cyan-300">SCENE: 1 Person, 1 Car</span>
                  <span className="text-slate-400">SMART_ZONE: ARMED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features-section" className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Core Computer Vision Capabilities
          </h2>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Engineered to process video streams frame-by-frame with high-accuracy spatial tracking and situational context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="rounded-2xl p-6 bg-[#0D1B2A]/80 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 shadow-xl backdrop-blur-sm group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Real-Time Detection
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Detect objects from camera/video. Leverages high-speed neural networks to localize and label 80 common object classes in real time.
            </p>
          </div>

          {/* Card 2 */}
          <div className="rounded-2xl p-6 bg-[#0D1B2A]/80 border border-white/10 hover:border-purple-500/40 transition-all duration-300 shadow-xl backdrop-blur-sm group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition-colors">
              Smart Tracking
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Maintain unique tracking IDs across frames. Employs IoU association and velocity estimation to preserve target identity across motion.
            </p>
          </div>

          {/* Card 3 */}
          <div className="rounded-2xl p-6 bg-[#0D1B2A]/80 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 shadow-xl backdrop-blur-sm group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
              Scene Intelligence
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Understand what is currently visible. Generates continuous situational summaries, counting people, vehicles, and items in the frame.
            </p>
          </div>

          {/* Card 4 */}
          <div className="rounded-2xl p-6 bg-[#0D1B2A]/80 border border-white/10 hover:border-amber-500/40 transition-all duration-300 shadow-xl backdrop-blur-sm group hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
              Smart Zone Alerts
            </h3>
            <p className="text-slate-300 text-sm leading-relaxed">
              Detect when objects enter a selected monitoring area. Real-time perimeter monitoring triggers alerts when targets enter or leave zones.
            </p>
          </div>
        </div>
      </section>

      {/* HOW VISIONTRACK THINKS Section */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-b from-[#0D1B2A] to-[#07111F] border border-cyan-500/20 shadow-2xl relative overflow-hidden">
          <div className="text-center mb-10">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400">
              ARCHITECTURE & PIPELINE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-2">
              HOW VISIONTRACK THINKS
            </h2>
            <p className="text-slate-400 text-sm max-w-lg mx-auto mt-2">
              From raw camera pixels to actionable perimeter intelligence in milliseconds.
            </p>
          </div>

          {/* 5-Step Pipeline */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-cyan-400 flex items-center justify-center font-mono font-bold mb-3">
                01
              </div>
              <h4 className="font-bold text-white text-sm">INPUT</h4>
              <p className="text-xs text-slate-400 mt-1">Live camera stream or uploaded video frames</p>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold mb-3">
                02
              </div>
              <h4 className="font-bold text-white text-sm">DETECTION</h4>
              <p className="text-xs text-slate-400 mt-1">Neural network localizes candidate bounding boxes</p>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold mb-3">
                03
              </div>
              <h4 className="font-bold text-white text-sm">CLASSIFICATION</h4>
              <p className="text-xs text-slate-400 mt-1">Class assignment & confidence score evaluation</p>
            </div>

            {/* Step 4 */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono font-bold mb-3">
                04
              </div>
              <h4 className="font-bold text-white text-sm">TRACKING</h4>
              <p className="text-xs text-slate-400 mt-1">IoU & centroid association assign persistent IDs</p>
            </div>

            {/* Step 5 */}
            <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold mb-3">
                05
              </div>
              <h4 className="font-bold text-white text-sm">SCENE UNDERSTANDING</h4>
              <p className="text-xs text-slate-400 mt-1">Zone collision alerts and live scene summaries</p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY IT'S DIFFERENT Section */}
      <section className="max-w-4xl mx-auto px-4 text-center">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#0D1B2A] border border-blue-500/30 shadow-xl">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/20 text-cyan-400 mb-4">
            <Radio className="w-6 h-6" />
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
            WHY IT'S DIFFERENT
          </h3>
          <p className="text-base sm:text-xl text-slate-200 leading-relaxed max-w-2xl mx-auto">
            “VisionTrack AI doesn't just detect objects. It follows them across frames, understands the current scene and provides useful real-time intelligence.”
          </p>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap justify-center gap-6 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              100% In-Browser Execution
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Persistent IDs (No Random Flipping)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Zero Server Latency / Fully Private
            </span>
          </div>

          <div className="mt-8">
            <button
              onClick={onStartVision}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md cursor-pointer transition-all"
            >
              <span>Launch Live Vision System</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* CodeAlpha Internship Footer Attribution */}
      <footer className="text-center pt-8 border-t border-white/5 text-xs text-slate-400">
        <p className="font-mono">
          CodeAlpha Artificial Intelligence Internship – Task 4: Object Detection and Tracking
        </p>
      </footer>
    </div>
  );
};
