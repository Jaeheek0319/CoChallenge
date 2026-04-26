import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  lesson: string;
}

export function LessonModal({ isOpen, onClose, title, lesson }: LessonModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-[0_0_50px_-12px_rgba(59,130,246,0.3)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <BookOpen className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">New Concept</span>
                  <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="prose prose-invert prose-blue max-w-none prose-headings:text-white prose-p:text-slate-300 prose-p:leading-relaxed prose-strong:text-blue-400 prose-code:text-blue-300 prose-code:bg-blue-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
                <ReactMarkdown>{lesson}</ReactMarkdown>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium italic">
                You can reopen this lesson at any time using the book icon.
              </p>
              <button
                onClick={onClose}
                className="group relative px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all active:scale-95 flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                I'm Ready to Build
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
