import React from 'react';
import { X, Download, Trash2, Calendar, Clock, Layers, ShieldCheck } from 'lucide-react';
import { DetectionSnapshot } from '../types/vision';

interface SnapshotModalProps {
  snapshot: DetectionSnapshot | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  snapshot,
  onClose,
  onDelete,
}) => {
  if (!snapshot) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = snapshot.imageSrc;
    link.download = `visiontrack-snapshot-${snapshot.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0D1B2A] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#07111F]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Detection Snapshot Details</h3>
              <p className="text-xs text-slate-400 font-mono">
                ID: {snapshot.id} • {snapshot.dateFormatted} at {snapshot.timeFormatted}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Snapshot Image */}
          <div className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-black shadow-lg">
            <img
              src={snapshot.imageSrc}
              alt="Detection Snapshot"
              className="w-full h-auto object-contain max-h-[480px] mx-auto"
            />
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Total Objects</span>
              <p className="text-2xl font-bold text-cyan-300 mt-1">{snapshot.totalObjects}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-mono text-slate-400 uppercase">People</span>
              <p className="text-2xl font-bold text-purple-300 mt-1">{snapshot.peopleCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Vehicles</span>
              <p className="text-2xl font-bold text-blue-300 mt-1">{snapshot.vehicleCount}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[11px] font-mono text-slate-400 uppercase">Classes</span>
              <p className="text-2xl font-bold text-emerald-300 mt-1">{snapshot.classesDetected.length}</p>
            </div>
          </div>

          {/* Scene Summary */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase">Scene Summary</span>
            <p className="text-sm text-slate-200 mt-1 font-medium">{snapshot.sceneSummary}</p>
          </div>

          {/* Tracked Objects Breakdown */}
          {snapshot.trackedObjects && snapshot.trackedObjects.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase text-slate-400 mb-2">Tracked Targets in Frame</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {snapshot.trackedObjects.map((obj, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white capitalize">{obj.class}</span>
                      <span className="block text-[11px] font-mono text-cyan-400">ID: {obj.displayId}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 font-mono text-[10px]">
                      {Math.round(obj.score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-[#07111F]">
          <button
            onClick={() => {
              onDelete(snapshot.id);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Snapshot</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Image</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
