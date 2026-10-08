import React from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-cyan-500/40 bg-[#07111F]/95 text-white';
        let icon = <Info className="w-4 h-4 text-cyan-400 shrink-0" />;

        if (toast.type === 'success') {
          borderClass = 'border-emerald-500/50 bg-[#07111F]/95 text-white shadow-emerald-950/40';
          icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/50 bg-[#07111F]/95 text-amber-100 shadow-amber-950/40';
          icon = <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
        } else if (toast.type === 'error') {
          borderClass = 'border-rose-500/50 bg-[#07111F]/95 text-rose-100 shadow-rose-950/40';
          icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md text-xs font-medium animate-in slide-in-from-bottom-2 fade-in duration-200 ${borderClass}`}
          >
            <div className="flex items-center gap-2.5">
              {icon}
              <p className="leading-snug">{toast.message}</p>
            </div>
            <button
              onClick={() => onDismiss(toast.id)}
              className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
