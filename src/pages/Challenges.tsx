import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Globe, Heart, Users, ArrowRight, Code, BadgeCheck, Building2, ChevronRight, ChevronLeft, User, Search } from 'lucide-react';

const FEATURED_CHALLENGES = [
  {
    id: 'stripe-checkout',
    company: "Stripe",
    role: "Frontend Engineer",
    title: "One-Click Checkout UI",
    desc: "Build a high-conversion, accessible checkout form with micro-animations and real-time validation.",
    lang: "React",
    difficulty: "Advanced",
    verified: true,
    logoGradient: "from-indigo-500 to-purple-600",
    tags: ["Payments", "Animation"]
  },
  {
    id: 'vercel-dashboard',
    company: "Vercel",
    role: "Fullstack Developer",
    title: "Deployment Dashboard",
    desc: "Create a real-time analytics dashboard showing deployment statuses, build logs, and visitor metrics.",
    lang: "Next.js",
    difficulty: "Intermediate",
    verified: true,
    logoGradient: "from-slate-800 to-black",
    tags: ["Real-time", "Analytics"]
  },
  {
    id: 'airbnb-search',
    company: "Airbnb",
    role: "UI/UX Engineer",
    title: "Interactive Date Picker",
    desc: "Design and implement a responsive multi-month date range picker with accessibility in mind.",
    lang: "TypeScript",
    difficulty: "Intermediate",
    verified: true,
    logoGradient: "from-rose-500 to-red-600",
    tags: ["Accessibility", "UI Components"]
  },
  {
    id: 'linear-board',
    company: "Linear",
    role: "Frontend Engineer",
    title: "Kanban Drag & Drop",
    desc: "Build a highly performant, keyboard-accessible Kanban board with complex drag-and-drop interactions.",
    lang: "React",
    difficulty: "Advanced",
    verified: true,
    logoGradient: "from-violet-500 to-fuchsia-600",
    tags: ["Performance", "DND"]
  }
];

const COMMUNITY_CHALLENGES = [
  {
    id: 'snake',
    author: "alex_dev",
    title: "Classic Snake Game",
    desc: "Learn grids, arrays, and keyboard events by building a retro snake game.",
    lang: "JavaScript",
    difficulty: "Intermediate",
    likes: 1240,
    tags: ["Game Dev", "Logic"]
  },
  {
    id: 'calc',
    author: "ui_wizard",
    title: "Neumorphic Calculator",
    desc: "Master CSS variables, flexbox, and simple math logic in this UI challenge.",
    lang: "HTML/CSS",
    difficulty: "Beginner",
    likes: 856,
    tags: ["UI/UX", "Math"]
  },
  {
    id: 'weather',
    author: "cloud_strife",
    title: "Real-time Weather Dashboard",
    desc: "Connect to live weather APIs and create a beautiful data visualization.",
    lang: "JavaScript",
    difficulty: "Advanced",
    likes: 1540,
    tags: ["Async/Await", "Charts"]
  },
  {
    id: 'portfolio',
    author: "sarah_codes",
    title: "Developer Portfolio Template",
    desc: "Build a responsive, high-converting portfolio with animations.",
    lang: "HTML/CSS",
    difficulty: "Beginner",
    likes: 3100,
    tags: ["Responsive", "Design"]
  }
];

export function Challenges() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFeatured = FEATURED_CHALLENGES.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(query) || 
           c.company.toLowerCase().includes(query) ||
           c.tags.some(t => t.toLowerCase().includes(query));
  });

  const filteredCommunity = COMMUNITY_CHALLENGES.filter(c => {
    const query = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(query) || 
           c.author.toLowerCase().includes(query) ||
           c.tags.some(t => t.toLowerCase().includes(query));
  });

  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-blue-500 mb-3 font-bold text-sm tracking-widest uppercase">
            <Globe className="w-4 h-4" />
            Challenges
          </div>
          <h1 className="text-4xl font-bold mb-2">Build Real-World Projects</h1>
          <p className="text-slate-400 font-medium">
            Tackle challenges posted by top companies or explore our community-driven project ideas. 
            Pick one and our AI will guide you through building it.
          </p>
        </div>

        {/* Search Bar */}
        <div className="w-full md:w-72 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search challenges, tags, users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all"
          />
        </div>
      </div>

      {/* Featured/Verified Carousel Section */}
      <div className="mb-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-indigo-400" />
              Featured by Companies
            </h2>
            <span className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 hidden sm:flex">
              <BadgeCheck className="w-3.5 h-3.5" /> Verified
            </span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={scrollLeft}
              className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={scrollRight}
              className="p-2 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-colors text-slate-400 hover:text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div 
          ref={carouselRef}
          className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory -mx-6 px-6 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredFeatured.map((challenge, idx) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="min-w-[320px] md:min-w-[400px] snap-center flex-shrink-0 group glass-panel rounded-3xl overflow-hidden hover:border-indigo-500/50 transition-all border-b-4 border-b-transparent hover:border-b-indigo-500 relative flex flex-col"
            >
              {/* Premium Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="p-8 relative z-10 flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${challenge.logoGradient} flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-xl">{challenge.company[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{challenge.company}</span>
                        {challenge.verified && <BadgeCheck className="w-4 h-4 text-blue-400" />}
                      </div>
                      <span className="text-xs font-medium text-slate-400">{challenge.role}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-slate-700">
                    {challenge.difficulty}
                  </span>
                </div>
                
                <h3 className="text-2xl font-bold mb-3 group-hover:text-indigo-400 transition-colors">{challenge.title}</h3>
                <p className="text-sm text-slate-400 mb-8 leading-relaxed line-clamp-3 flex-grow">{challenge.desc}</p>
                
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex flex-wrap gap-2">
                    {challenge.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-slate-900/50 rounded-lg text-[10px] font-medium text-slate-400 border border-slate-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={() => navigate('/', { state: { presetPrompt: `${challenge.company} Challenge: ${challenge.title}` } })}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors shadow-lg shadow-indigo-900/20 group-hover:scale-105"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Community Grid Section */}
      <div>
        <div className="flex items-center gap-3 mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-400" />
            Community Challenges
          </h2>
          <span className="text-sm font-medium text-slate-500 border border-slate-800 px-3 py-1 rounded-full bg-slate-900/50">Unvetted</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCommunity.map((challenge, idx) => (
            <motion.div
              key={challenge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group glass-panel rounded-2xl p-6 hover:border-slate-600 transition-all border-b-2 hover:border-b-blue-500 flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center">
                    <User className="w-3 h-3 text-slate-400" />
                  </div>
                  <span className="text-xs font-medium text-slate-400">@{challenge.author}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Heart className="w-3.5 h-3.5 hover:fill-red-500 hover:text-red-500 cursor-pointer transition-colors" />
                  {challenge.likes}
                </div>
              </div>
              
              <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors">{challenge.title}</h3>
              <p className="text-sm text-slate-400 mb-6 flex-grow">{challenge.desc}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{challenge.lang}</span>
                <button 
                  onClick={() => navigate('/', { state: { presetPrompt: challenge.title } })}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-500 hover:text-blue-400 transition-colors"
                >
                  Start <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Call to Action */}
      <div className="mt-20 text-center p-12 glass-panel rounded-3xl border-dashed">
        <Code className="w-12 h-12 text-slate-800 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Have a challenge idea?</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create and share your own coding challenges with the community.</p>
        <button className="bg-white text-slate-950 hover:bg-slate-200 px-8 py-3 rounded-xl font-bold transition-all active:scale-95">
          Submit Challenge
        </button>
      </div>
    </div>
  );
}
