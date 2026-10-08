import React, { useState } from 'react';
import {
  History,
  Trash2,
  Eye,
  Calendar,
  Clock,
  Camera,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DetectionSnapshot } from '../types/vision';
import { SnapshotModal } from './SnapshotModal';

interface DetectionHistoryViewProps {
  snapshots: DetectionSnapshot[];
  onDeleteSnapshot: (id: string) => void;
  onClearAll: () => void;
  onGoToLive: () => void;
}

export const DetectionHistoryView: React.FC<DetectionHistoryViewProps> = ({
  snapshots,
  onDeleteSnapshot,
  onClearAll,
  onGoToLive,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<DetectionSnapshot | null>(null);

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-cyan-400">
              <History className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              Detection History
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Persisted logs of captured frames, bounding boxes, and object tracking states.
          </p>
        </div>

        {snapshots.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-400 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30">
              {snapshots.length} {snapshots.length === 1 ? 'Snapshot' : 'Snapshots'} Stored
            </span>
            <button
              onClick={onClearAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>

      {/* Snapshots Grid or Empty State */}
      {snapshots.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#0D1B2A]/50 border border-white/5 p-8 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto mb-4">
            <Camera className="w-8 h-8 opacity-80" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Snapshots Captured Yet</h3>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            When you're running Live Vision, click the <span className="text-cyan-300 font-semibold">“Capture Detection”</span> button to freeze and save the current scene along with its bounding boxes and tracking IDs.
          </p>
          <button
            onClick={onGoToLive}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <Camera className="w-4 h-4" />
            <span>Go to Live Vision</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snapshots.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl bg-[#0D1B2A] border border-white/10 hover:border-cyan-500/40 overflow-hidden shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1"
            >
              {/* Snapshot Preview Image */}
              <div
                onClick={() => setSelectedSnapshot(item)}
                className="relative aspect-video bg-black overflow-hidden cursor-pointer"
              >
                <img
                  src={item.imageSrc}
                  alt={`Detection ${item.id}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                {/* Overlaid Pill Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#07111F]/90 backdrop-blur-sm border border-cyan-500/30 text-[11px] font-mono text-cyan-300 font-bold">
                  {item.totalObjects} {item.totalObjects === 1 ? 'Object' : 'Objects'} Detected
                </div>

                <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[11px] font-mono text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-cyan-400" />
                    <span>{item.dateFormatted}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-cyan-400" />
                    <span>{item.timeFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  {/* Classes tags */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {item.classesDetected.slice(0, 4).map((cls, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-cyan-300 border border-blue-500/20 capitalize"
                      >
                        {cls}
                      </span>
                    ))}
                    {item.classesDetected.length > 4 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-slate-400">
                        +{item.classesDetected.length - 4} more
                      </span>
                    )}
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-300 line-clamp-2 italic font-sans mb-4">
                    “{item.sceneSummary}”
                  </p>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => setSelectedSnapshot(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-300 hover:text-white hover:bg-cyan-500/15 border border-cyan-500/30 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </button>

                  <button
                    onClick={() => onDeleteSnapshot(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete Snapshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Snapshot Detail Modal */}
      <SnapshotModal
        snapshot={selectedSnapshot}
        onClose={() => setSelectedSnapshot(null)}
        onDelete={onDeleteSnapshot}
      />
    </div>
  );
};
