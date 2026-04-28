import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

const TOAST_CONFIG: Record<ToastType, { icon: typeof CheckCircle; colors: string }> = {
  success: {
    icon: CheckCircle,
    colors: 'bg-green-500/10 border-green-500/30 text-green-400',
  },
  error: {
    icon: XCircle,
    colors: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    colors: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
  },
  info: {
    icon: Info,
    colors: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  },
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => {
          const config = TOAST_CONFIG[t.type];
          const Icon = config.icon;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-lg animate-slide-in ${config.colors}`}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span className="text-sm font-medium">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="ml-2 opacity-70 hover:opacity-100 transition-opacity flex-shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};
