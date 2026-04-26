import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, CheckCircle, Github, ArrowRight, X } from 'lucide-react';

interface CongratulationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  projectTitle: string;
}

export function CongratulationsModal({ isOpen, onClose, onExport, projectTitle }: CongratulationsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.8, opacity: 0, rotate: -5 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0, rotate: 5 }}
            className="relative w-full max-w-lg bg-slate-900 border-2 border-yellow-500/30 rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_-20px_rgba(234,179,8,0.3)]"
          >
            {/* Top Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-10 flex flex-col items-center text-center">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-24 h-24 bg-yellow-500/10 rounded-full flex items-center justify-center border-4 border-yellow-500/20 mb-6 shadow-[0_0_30px_rgba(234,179,8,0.2)]"
              >
                <Trophy className="w-12 h-12 text-yellow-500" />
              </motion.div>
              
              <motion.h2 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl font-black text-white mb-2 tracking-tight"
              >
                Project Complete!
              </motion.h2>
              
              <motion.p 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 mb-8 max-w-[320px]"
              >
                Amazing job! You've successfully built <span className="text-white font-bold">{projectTitle}</span>. Your coding skills are reaching new heights!
              </motion.p>
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-4 w-full"
              >
                <button
                  onClick={onExport}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all active:scale-95 border border-slate-700 group"
                >
                  <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Save to Git
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-900/40"
                >
                  Done
                  <CheckCircle className="w-5 h-5" />
                </button>
              </motion.div>
              
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                className="mt-8 text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 group"
              >
                View project again
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
