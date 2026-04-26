import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface NotificationProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

export function Notification({ message, isVisible, onClose, type = 'info' }: NotificationProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const styles = {
    success: 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_20px_-5px_rgba(34,197,94,0.2)]',
    error: 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_20px_-5px_rgba(239,68,68,0.2)]',
    info: 'bg-slate-800 border-slate-700 text-slate-200 shadow-2xl'
  };

  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
        >
          <div className={cn(
            "backdrop-blur-xl px-4 py-3 rounded-xl flex items-center justify-between gap-3 border transition-all",
            styles[type]
          )}>
            <div className="flex items-center gap-3">
              <Icon className={cn(
                "w-5 h-5",
                type === 'info' ? 'text-slate-400' : 'text-current'
              )} />
              <p className="text-sm font-medium">{message}</p>
            </div>
            <button 
              onClick={onClose}
              className={cn(
                "p-1 rounded-lg transition-colors",
                type === 'info' ? 'hover:bg-slate-700 text-slate-500 hover:text-white' : 'hover:bg-white/10 text-current'
              )}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

