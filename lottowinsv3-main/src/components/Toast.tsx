import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface Toast {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, options?: { type?: Toast['type']; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, options?: { type?: Toast['type']; duration?: number }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type: options?.type, duration: options?.duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, options?.duration || 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 items-end">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-5 py-3 rounded-lg shadow-lg text-white animate-toast-in min-w-[220px] max-w-xs
              ${toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-gray-800'}`}
            style={{ animation: 'toast-in 0.3s cubic-bezier(.4,2,.6,1)'}}
          >
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toast-in {
          0% { opacity: 0; transform: translateY(-20px) scale(0.95); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-toast-in { animation: toast-in 0.3s cubic-bezier(.4,2,.6,1); }
      `}</style>
    </ToastContext.Provider>
  );
}; 