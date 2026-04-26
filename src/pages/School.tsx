import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe, Heart, Users, Star, ArrowRight, Code, Search, ChevronDown } from 'lucide-react';

const PRESET_PROJECTS = [
  {
    id: 'snake',
    title: "Classic Snake Game",
    desc: "Learn grids, arrays, and keyboard events by building a retro snake game.",
    lang: "JavaScript",
    difficulty: "Intermediate",
    likes: 1240,
    tags: ["Game Dev", "Logic"]
  },
  {
    id: 'calc',
    title: "Neumorphic Calculator",
    desc: "Master CSS variables, flexbox, and simple math logic in this UI challenge.",
    lang: "HTML/CSS",
    difficulty: "Beginner",
    likes: 856,
    tags: ["UI/UX", "Math"]
  },
  {
    id: 'quiz',
    title: "Dynamic Quiz App",
    desc: "Fetch JSON data and manage complex app states with this interactive quiz.",
    lang: "React",
    difficulty: "Intermediate",
    likes: 2100,
    tags: ["APIs", "React Hooks"]
  },
  {
    id: 'weather',
    title: "Real-time Weather Dashboard",
    desc: "Connect to live weather APIs and create a beautiful data visualization.",
    lang: "JavaScript",
    difficulty: "Advanced",
    likes: 1540,
    tags: ["Async/Await", "Charts"]
  },
  {
    id: 'todo',
    title: "Smart Task Manager",
    desc: "The classic project, but with drag-and-drop and categories.",
    lang: "HTML/CSS/JS",
    difficulty: "Beginner",
    likes: 920,
    tags: ["CRUD", "Modern CSS"]
  },
  {
    id: 'portfolio',
    title: "Developer Portfolio Template",
    desc: "Build a responsive, high-converting portfolio with animations.",
    lang: "HTML/CSS",
    difficulty: "Beginner",
    likes: 3100,
    tags: ["Responsive", "Design"]
  }
];

export function School() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');

  const filteredProjects = PRESET_PROJECTS.filter(p => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;

    const matchesTitle = p.title.toLowerCase().includes(query);
    const matchesTag = p.tags.some(t => t.toLowerCase().includes(query));
    const matchesLang = p.lang.toLowerCase().includes(query);

    switch (searchFilter) {
      case 'Title': return matchesTitle;
      case 'Tag': return matchesTag;
      case 'Language': return matchesLang;
      default: return matchesTitle || matchesTag || matchesLang;
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-blue-500 mb-3 font-bold text-sm tracking-widest uppercase">
            <Globe className="w-4 h-4" />
            Curated Community
          </div>
          <h1 className="text-4xl font-bold mb-2">School</h1>
          <p className="text-slate-400 font-medium">Explore hand-picked project ideas to kickstart your coding journey. Pick one and our AI will build a personalized lesson for it.</p>
        </div>
        
        <div className="flex items-center gap-4 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <button className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold">Featured</button>
          <button className="px-4 py-2 hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-400 transition-colors">Trending</button>
          <button className="px-4 py-2 hover:bg-slate-800 rounded-lg text-sm font-bold text-slate-400 transition-colors">Newest</button>
        </div>
      </div>

      {/* Search Bar & Filters */}
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
            <option value="Tag">Tag</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredProjects.map((project, idx) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="group glass-panel rounded-2xl overflow-hidden hover:border-slate-600 transition-all border-b-2 hover:border-b-blue-500"
          >
            <div className="relative h-40 bg-slate-900 flex items-center justify-center border-b border-slate-800 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent opacity-60" />
              <Code className="w-16 h-16 text-slate-800 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute top-4 left-4">
                <span className="px-2 py-1 bg-slate-950/80 border border-slate-800 rounded text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                  {project.difficulty}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">{project.lang}</span>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
                  {project.likes}
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{project.title}</h3>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">{project.desc}</p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {project.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] font-medium text-slate-500">
                    #{tag}
                  </span>
                ))}
              </div>

              <button 
                onClick={() => navigate('/', { state: { presetPrompt: project.title } })}
                className="w-full group/btn flex items-center justify-center gap-2 bg-slate-800 hover:bg-blue-600 transition-all py-3 rounded-xl font-bold text-sm"
              >
                Start This Project
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-20 text-center p-12 glass-panel rounded-3xl border-dashed">
        <Users className="w-12 h-12 text-slate-800 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Want to see more?</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Our community is constantly building. Join today to unlock restricted projects and save your progress.</p>
        <button className="bg-white text-slate-950 hover:bg-slate-200 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
          Join the Beta
        </button>
      </div>
    </div>
  );
}
