import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { Dashboard } from './pages/Dashboard';
import { Gallery } from './pages/Gallery';
import { Code2, BookOpen, Layout, Globe } from 'lucide-react';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-50 font-sans">
        <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-8">
                <Link to="/" className="flex items-center gap-2 group">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
                    <Code2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                    ProjectCode
                  </span>
                </Link>
                
                <div className="hidden md:flex items-center gap-6">
                  <Link to="/gallery" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                    <Globe className="w-4 h-4" />
                    Gallery
                  </Link>
                  <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                    <Layout className="w-4 h-4" />
                    My Learning
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="text-sm font-medium bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full transition-colors">
                  Sign In
                </button>
                <button className="text-sm font-medium bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full transition-all shadow-lg shadow-blue-900/40">
                  Join Free
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/workspace/:projectId" element={<Workspace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/gallery" element={<Gallery />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
