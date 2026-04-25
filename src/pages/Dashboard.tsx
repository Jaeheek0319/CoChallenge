import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useProjects } from '../hooks/useProjects';
import { Clock, CheckCircle, Code2, Trash2, ArrowRight, Plus } from 'lucide-react';

export function Dashboard() {
  const { projects, loading } = useProjects();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Learning Journey</h1>
          <p className="text-slate-400 font-medium">Continue where you left off or start something new.</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel p-4 rounded-2xl flex flex-col min-w-32">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Projects</span>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">{projects.length}</span>
          </div>
          <div className="glass-panel p-4 rounded-2xl flex flex-col min-w-32">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Completed</span>
            <span className="text-2xl font-bold text-green-500">{projects.filter(p => p.currentStep === p.steps.length - 1).length}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-32 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
          <h3 className="text-xl font-bold mb-2 text-slate-300">Loading your journey...</h3>
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-32 border-2 border-dashed border-slate-800 rounded-3xl">
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6">
            <Code2 className="w-10 h-10 text-slate-700" />
          </div>
          <h3 className="text-xl font-bold mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-8 max-w-sm mx-auto">Start by describing a project on the homepage and the AI will generate your first lesson.</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            Start Learning
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-3xl overflow-hidden hover:bg-slate-800 transition-all cursor-pointer group"
            style={{
              border: '4px dashed #52525b',
              borderRadius: '24px'
            }}
            onClick={() => navigate('/')}
          >
            <div className="p-6 h-full flex flex-col items-center justify-center min-h-[280px]">
              <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-600 transition-colors">
                <Plus className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-center text-slate-200 group-hover:text-white transition-colors">Make a New Project</h3>
            </div>
          </motion.div>
          {projects.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map((project, idx) => {
            const progress = Math.round(((project.currentStep + 1) / project.steps.length) * 100);
            
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-panel rounded-2xl overflow-hidden hover:border-slate-700 transition-all group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                      {project.language === 'html-css-js' ? 'Web' : project.language}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2 mb-6 h-10">{project.description}</p>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate(`/workspace/${project.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-blue-600 transition-all rounded-xl font-bold text-sm active:scale-[0.98]"
                  >
                    Continue Building
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
