import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CircleStar, Heart, Users, ArrowRight, Code, BadgeCheck, Building2, ChevronRight, ChevronLeft, User, Search, ChevronDown, Loader2, Sparkles, CalendarDays, Eye } from 'lucide-react';
import { api } from '../lib/api';

type ChallengeState = 'open' | 'closed' | 'graded';

interface ApiChallenge {
  id: string;
  authorId: string;
  authorEmail: string;
  authorUsername: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  requirements: string;
  resources: string;
  starterCode: string;
  estimatedTime: string;
  company: { name: string; role: string } | null;
  verified: boolean;
  logoUrl: string | null;
  likes: number;
  dueDate: string;
  state: ChallengeState;
  createdAt: string;
}

const FALLBACK_LOGO_GRADIENT = 'from-slate-700 to-slate-900';

function getChallengeState(c: ApiChallenge): ChallengeState {
  if (c.state === 'graded') return 'graded';
  const due = Date.parse(c.dueDate);
  if (Number.isFinite(due) && Date.now() >= due) return 'closed';
  return c.state;
}

function toPreviewState(c: ApiChallenge) {
  return {
    challengeId: c.id,
    state: getChallengeState(c),
    dueDate: c.dueDate,
    title: c.title,
    description: c.description,
    difficulty: c.difficulty,
    primaryLanguage: c.language,
    tags: c.tags,
    requirements: c.requirements,
    resources: c.resources,
    starterCode: c.starterCode,
    estimatedTime: c.estimatedTime,
    isCompanyChallenge: Boolean(c.company),
    companyName: c.company?.name,
  };
}

function formatDueDate(iso: string): string {
  const due = Date.parse(iso);
  if (!Number.isFinite(due)) return 'Due date TBD';
  return `Due ${new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(due))}`;
}

function StateBadge({ state }: { state: ChallengeState }) {
  const map = {
    open: {
      label: 'Open',
      className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
    },
    closed: {
      label: 'Closed',
      className: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
    },
    graded: {
      label: 'Graded',
      className: 'bg-violet-500/10 border-violet-500/20 text-violet-300',
    },
  };
  const badge = map[state];
  return (
    <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${badge.className}`}>
      {badge.label}
    </span>
  );
}

function matchesSearch(c: ApiChallenge, query: string, filter: string, userField: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const matchesTitle = c.title.toLowerCase().includes(q);
  const matchesUser = userField.toLowerCase().includes(q);
  const matchesTag = c.tags.some((t) => t.toLowerCase().includes(q));
  switch (filter) {
    case 'Title': return matchesTitle;
    case 'User': return matchesUser;
    case 'Tag': return matchesTag;
    default: return matchesTitle || matchesUser || matchesTag;
  }
}

export function Challenges() {
  const navigate = useNavigate();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('All');
  const [challenges, setChallenges] = useState<ApiChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<ApiChallenge[]>('/api/challenges')
      .then((data) => {
        if (!cancelled) setChallenges(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load challenges');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = challenges
    .filter((c) => c.verified)
    .filter((c) => getChallengeState(c) !== 'graded')
    .filter((c) => matchesSearch(c, searchQuery, searchFilter, c.company?.name ?? ''));

  const community = challenges
    .filter((c) => !c.verified)
    .filter((c) => getChallengeState(c) !== 'graded')
    .filter((c) => matchesSearch(c, searchQuery, searchFilter, c.authorUsername));

  const scrollLeft = () => {
    carouselRef.current?.scrollBy({ left: -350, behavior: 'smooth' });
  };

  const scrollRight = () => {
    carouselRef.current?.scrollBy({ left: 350, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-blue-500 mb-3 font-bold text-sm tracking-widest uppercase">
            <CircleStar className="w-4 h-4" />
            Challenges
          </div>
          <h1 className="text-4xl font-bold mb-2">Build Real-World Projects</h1>
          <p className="text-slate-400 font-medium">
            Tackle challenges posted by top companies or explore our community-driven project ideas.
            Pick one and our AI will guide you through building it.
          </p>
        </div>
        <Link
          to="/challenges/past"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 text-sm font-bold text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Past challenges
        </Link>
      </div>

      {/* Search Bar & Filters */}
      <div className="mb-12 flex flex-col sm:flex-row gap-4">
        <div className="w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search challenges..."
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
            <option value="User">User</option>
            <option value="Tag">Tag</option>
          </select>
          <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
            <ChevronDown className="w-5 h-5 text-slate-500" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading challenges…
        </div>
      )}

      {!loading && (
        <>
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
              {featured.length > 0 && (
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
              )}
            </div>

            {featured.length === 0 ? (
              <div className="text-center p-12 glass-panel rounded-3xl border-dashed">
                <Sparkles className="w-10 h-10 text-indigo-500/40 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Be the first verified company</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Submit a challenge from your company email to get featured here.
                </p>
              </div>
            ) : (
            <div
                ref={carouselRef}
                className="grid grid-flow-col auto-cols-[320px] md:auto-cols-[400px] items-stretch gap-6 overflow-x-auto pt-6 pb-8 snap-x snap-mandatory -mx-6 px-6 [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {featured.map((challenge, idx) => {
                  const companyName = challenge.company?.name ?? 'Company';
                  const companyRole = challenge.company?.role ?? '';
                  const state = getChallengeState(challenge);
                  const isOpen = state === 'open';
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`min-w-[320px] md:min-w-[400px] h-full snap-center flex-shrink-0 group glass-panel rounded-3xl overflow-hidden transition-all border-b-4 relative flex flex-col hover:z-10 ${
                        isOpen
                          ? 'hover:border-indigo-500/50 border-b-transparent hover:border-b-indigo-500 hover:scale-105 hover:bg-slate-800/50'
                          : 'border-slate-800/80 border-b-slate-700 opacity-80'
                      }`}
                    >
                      {isOpen && (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      )}

                      <div className="p-8 relative z-10 flex flex-col h-full">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <CompanyLogo
                              name={companyName}
                              logoUrl={challenge.logoUrl}
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{companyName}</span>
                                <BadgeCheck className="w-4 h-4 text-blue-400" />
                              </div>
                              {companyRole && (
                                <span className="text-xs font-medium text-slate-400">{companyRole}</span>
                              )}
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-slate-800/80 rounded-full text-[10px] font-bold text-slate-300 uppercase tracking-widest border border-slate-700">
                            {challenge.difficulty}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-4">
                          <StateBadge state={state} />
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                            <CalendarDays className="w-3.5 h-3.5" />
                            {formatDueDate(challenge.dueDate)}
                          </span>
                        </div>

                        <h3 className="text-2xl font-bold mb-3 group-hover:text-indigo-400 transition-colors line-clamp-2">{challenge.title}</h3>
                        <p className="text-sm text-slate-400 mb-8 leading-relaxed line-clamp-3 flex-grow">{challenge.description}</p>

                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex flex-wrap gap-2">
                            {challenge.tags.map((tag) => (
                              <span key={tag} className="px-2 py-1 bg-slate-900/50 rounded-lg text-[10px] font-medium text-slate-400 border border-slate-800">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => navigate(`/challenges/${challenge.id}/submit`)}
                            className={`p-3 text-white rounded-xl transition-colors shadow-lg group-hover:scale-105 ${
                              isOpen
                                ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                                : 'bg-slate-800 hover:bg-slate-700 shadow-slate-950/20'
                            }`}
                            aria-label={isOpen ? 'Start challenge' : 'View challenge'}
                          >
                            {isOpen ? <ArrowRight className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
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

            {community.length === 0 ? (
              <div className="text-center p-12 glass-panel rounded-3xl border-dashed">
                <Users className="w-10 h-10 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">No community challenges yet</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                  Submit one and kick off the community board.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {community.map((challenge, idx) => {
                  const state = getChallengeState(challenge);
                  const isOpen = state === 'open';
                  return (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`group glass-panel rounded-2xl p-6 transition-all border-b-2 flex flex-col h-full ${
                        isOpen
                          ? 'hover:border-slate-600 hover:border-b-blue-500 hover:scale-105 hover:bg-slate-800/50 hover:z-10'
                          : 'border-slate-800/80 border-b-slate-700 opacity-80'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4 gap-3">
                        <Link 
                          to={`/u/${challenge.authorUsername}`}
                          className="min-w-0 flex items-center gap-2 group/author"
                        >
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center group-hover/author:bg-slate-700 transition-colors shrink-0">
                            <User className="w-3 h-3 text-slate-400 group-hover/author:text-blue-400 transition-colors" />
                          </div>
                          <span className="text-xs font-medium text-slate-400 group-hover/author:text-blue-400 transition-colors truncate">@{challenge.authorUsername}</span>
                        </Link>
                        <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                          <Heart className="w-3.5 h-3.5 hover:fill-red-500 hover:text-red-500 cursor-pointer transition-colors" />
                          {challenge.likes}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <StateBadge state={state} />
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDueDate(challenge.dueDate)}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">{challenge.title}</h3>
                      <p className="text-sm text-slate-400 mb-6 flex-grow line-clamp-3">{challenge.description}</p>

                      <div className="flex items-center justify-between mt-auto">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{challenge.language}</span>
                        <button
                          onClick={() => navigate(`/challenges/${challenge.id}/submit`)}
                          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                            isOpen ? 'text-blue-500 hover:text-blue-400' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {isOpen ? (
                            <>
                              Start <ArrowRight className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              View <Eye className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Call to Action */}
      <div className="mt-20 text-center p-12 glass-panel rounded-3xl border-dashed">
        <Code className="w-12 h-12 text-slate-800 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Have a challenge idea?</h2>
        <p className="text-slate-500 mb-8 max-w-sm mx-auto">Create and share your own coding challenges with the community.</p>
        <button
          onClick={() => navigate('/create-challenge')}
          className="bg-white text-slate-950 hover:bg-slate-200 px-8 py-3 rounded-xl font-bold transition-all active:scale-95"
        >
          Submit Challenge
        </button>
      </div>
    </div>
  );
}

function CompanyLogo({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  const showImage = logoUrl && !failed;
  const bgClass = showImage
    ? 'bg-slate-200'
    : `bg-gradient-to-br ${FALLBACK_LOGO_GRADIENT}`;
  return (
    <div className={`w-12 h-12 rounded-2xl ${bgClass} flex items-center justify-center shadow-lg overflow-hidden`}>
      {showImage ? (
        <img
          src={logoUrl}
          alt={`${name} logo`}
          onError={() => setFailed(true)}
          className="w-full h-full object-contain p-2"
        />
      ) : (
        <span className="text-white font-bold text-xl">{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}
