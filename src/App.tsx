import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { Workspace } from './pages/Workspace';
import { Dashboard } from './pages/Dashboard';
import { Challenges } from './pages/Challenges';
import { Profile } from './pages/Profile';
import { School } from './pages/School';
import { Generation } from './pages/Generation';
import { Code2, Layout, Globe, LogOut, Sparkles, User } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ProjectProvider } from './contexts/ProjectContext';

export default function App() {
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <BrowserRouter>
      <ProjectProvider>
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
                      CoChallengers
                    </span>
                  </Link>
                  
                  <div className="hidden md:flex items-center gap-6">
                    <Link to="/generation" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      Generation
                    </Link>
                    <Link to="/challenges" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      Challenges
                    </Link>
                    <Link to="/school" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      School
                    </Link>
                    <Link to="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                      <Layout className="w-4 h-4" />
                      My Learning
                    </Link>
                  </div>
                </div>

<div className="flex items-center gap-4" ref={profileMenuRef}>
                  {user ? (
                    <div className="relative flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsProfileMenuOpen((open) => !open)}
                        className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        <User className="w-4 h-4 text-blue-400" />
                        <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
                      </button>
                      <button
                        type="button"
                        onClick={signOut}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        title="Sign Out"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>

                      {isProfileMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/30 z-20">
                          <Link
                            to="/profile"
                            onClick={() => setIsProfileMenuOpen(false)}
                            className="block px-4 py-3 text-sm text-slate-200 hover:bg-slate-800 transition-colors"
                          >
                            View Profile
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => {
                          setAuthMode('login');
                          setIsAuthModalOpen(true);
                        }}
                        className="text-sm font-medium bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-full transition-colors"
                      >
                        Sign In
                      </button>
                      <button 
                        onClick={() => {
                          setAuthMode('signup');
                          setIsAuthModalOpen(true);
                        }}
                        className="text-sm font-medium bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-full transition-all shadow-lg shadow-blue-900/40"
                      >
                        Join Free
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </nav>

          <AuthModal 
            isOpen={isAuthModalOpen} 
            onClose={() => setIsAuthModalOpen(false)}
            initialMode={authMode}
          />

          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/workspace/:projectId" element={<Workspace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/generation" element={<Generation />} />
              <Route path="/challenges" element={<Challenges />} />
              <Route path="/school" element={<School />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>
        </div>
      </ProjectProvider>
    </BrowserRouter>
  );
}
