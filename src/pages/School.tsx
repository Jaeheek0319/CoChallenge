import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  GraduationCap,
  Heart,
  Users,
  ArrowRight,
  Code,
  Search,
  ChevronDown,
  Trophy,
} from 'lucide-react';
import { schoolApi } from '../lib/schoolApi';
import type { SchoolProjectSummary } from '../types';

export function School() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SchoolProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;
    schoolApi
      .list()
      .then((data) => {
        if (!cancelled) setProjects(data);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    const q = searchQuery.toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => {
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesLang = p.language.toLowerCase().includes(q);
      const matchesGoals = p.learningGoals.some((g) => g.toLowerCase().includes(q));
      switch (searchFilter) {
        case 'Title':
          return matchesTitle;
        case 'Language':
          return matchesLang;
        case 'Tag':
          return matchesGoals;
        default:
          return matchesTitle || matchesLang || matchesGoals;
      }
    });
  }, [projects, searchQuery, searchFilter]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-blue-500 mb-3 font-bold text-sm tracking-widest uppercase">
            <GraduationCap className="w-4 h-4" />
            Curated Community
          </div>
          <h1 className="text-4xl font-bold mb-2">Learn from winning solutions</h1>
          <p className="text-slate-400 font-medium">
            Hand-picked projects built from challenge winners. Pick one and our AI walks you through the same build.
          </p>
        </div>
      </div>

      <div className="mb-12 flex flex-col sm:flex-row gap-4">
        <div className="w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all text-lg"
          />
        </div>
        <div className="sm:w-48 relative shrink-0">
          <select
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white appearance-none cursor-pointer text-lg"
          >
            <option value="All">All Categories</option>
            <option value="Title">Title</option>
            <option value="Language">Language</option>
            <option value="Tag">Goal</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      {error && !projects && (
        <p className="text-red-400 text-sm mb-6">Failed to load: {error}</p>
      )}

      {!projects && !error && (
        <p className="text-slate-400">Loading projects…</p>
      )}

      {projects && projects.length === 0 && (
        <div className="text-center p-16 glass-panel rounded-3xl border-dashed">
          <GraduationCap className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">No school projects yet</h2>
          <p className="text-slate-400 max-w-md mx-auto">
            Once challenges get graded with a 1st-place winner, those winning solutions will appear here as guided projects.
          </p>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProjects.map((project, idx) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="group glass-panel rounded-2xl overflow-hidden hover:border-slate-600 transition-all border-b-2 hover:border-b-blue-500 hover:scale-105 hover:bg-slate-800/50 hover:z-10"
            >
              <div className="relative h-40 bg-slate-900 flex items-center justify-center border-b border-slate-800 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
                <Code className="w-16 h-16 text-slate-800 group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <span className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                    {project.difficulty}
                  </span>
                </div>
                {project.sourceWinnerUsername && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      Winner
                    </span>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{project.language}</span>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                    {project.likes}
                  </div>
                </div>

                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{project.title}</h3>
                <p className="text-sm text-slate-400 mb-4 leading-relaxed line-clamp-2">{project.description}</p>

                {project.sourceWinnerUsername && (
                  <p className="text-xs text-slate-500 mb-4">
                    Built by{' '}
                    <Link
                      to={`/u/${project.sourceWinnerUsername}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-amber-300 hover:text-amber-200 font-semibold"
                    >
                      @{project.sourceWinnerUsername}
                    </Link>
                  </p>
                )}

                {project.learningGoals.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.learningGoals.slice(0, 3).map((goal) => (
                      <span key={goal} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-medium text-slate-500">
                        #{goal}
                      </span>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => navigate(`/school/${project.id}`)}
                  className="w-full group/btn flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 transition-all py-3 rounded-xl font-bold text-sm"
                >
                  Start This Project
                  <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-20 text-center p-12 glass-panel rounded-3xl border-dashed">
        <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Want to see more?</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Win a 1st place in any challenge with the "convert to school" toggle on, and your solution becomes a guided project right here.</p>
        <button
          onClick={() => navigate('/challenges')}
          className="bg-white text-slate-950 hover:bg-slate-200 px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
        >
          Browse Challenges
        </button>
      </div>
    </div>
  );
}
