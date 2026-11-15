import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

type ToastContextType = {
  toasts: Toast[];
  show: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

const styles: Record<ToastType, { icon: typeof Info; accent: string }> = {
  success: { icon: CheckCircle2, accent: 'text-success-500 bg-success-50' },
  error: { icon: AlertCircle, accent: 'text-error-600 bg-error-50' },
  info: { icon: Info, accent: 'text-accent-700 bg-accent-50' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = ++toastId;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toasts, show, dismiss }}>
      {children}
      <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:bottom-6 sm:right-6 z-[100] flex flex-col gap-2 sm:w-96" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, accent } = styles[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className="animate-toast-in relative overflow-hidden rounded-2xl bg-charcoal-800/95 backdrop-blur-md text-cream-50 shadow-elevated pl-3 pr-2 py-3 flex items-center gap-3 text-sm border border-cream-50/10"
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${accent}`}>
                <Icon size={16} />
              </span>
              <span className="flex-1 leading-snug">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-cream-50/60 hover:text-cream-50 hover:bg-cream-50/10"
                aria-label="Dismiss"
              >
                <X size={14} />
              </button>
              <span className="absolute bottom-0 left-0 h-0.5 bg-accent-400/70 animate-[toastBar_4s_linear_forwards]" />
            </div>
          );
        })}
      </div>
      <style>{'@keyframes toastBar{from{width:100%}to{width:0}}'}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
