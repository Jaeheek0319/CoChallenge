import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  ChevronDown,
  Eye,
  Heart,
  Loader2,
  Search,
  User,
  Users,
} from 'lucide-react';
import { api } from '../lib/api';

type ChallengeState = 'open' | 'closed' | 'graded';
type PastChallengeState = Exclude<ChallengeState, 'open'>;

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

function formatPastDate(iso: string): string {
  const due = Date.parse(iso);
  if (!Number.isFinite(due)) return 'Date unavailable';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(due));
}

function matchesSearch(c: ApiChallenge, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    c.title.toLowerCase().includes(q) ||
    c.description.toLowerCase().includes(q) ||
    c.authorUsername.toLowerCase().includes(q) ||
    (c.company?.name ?? '').toLowerCase().includes(q) ||
    c.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

function isPastChallengeState(state: ChallengeState): state is PastChallengeState {
  return state !== 'open';
}

function StateBadge({ state }: { state: PastChallengeState }) {
  const map = {
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

export function PastChallenges() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'All' | 'Closed' | 'Graded'>('All');
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
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load past challenges');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const pastChallenges = challenges
    .map((challenge) => ({ challenge, state: getChallengeState(challenge) }))
    .filter((item): item is { challenge: ApiChallenge; state: PastChallengeState } =>
      isPastChallengeState(item.state),
    )
    .filter(({ challenge, state }) => stateFilter === 'All' || state === stateFilter.toLowerCase())
    .filter(({ challenge }) => matchesSearch(challenge, query))
    .sort((a, b) => Date.parse(b.challenge.dueDate) - Date.parse(a.challenge.dueDate));
  const verifiedPastChallenges = pastChallenges.filter(({ challenge }) => challenge.verified);
  const communityPastChallenges = pastChallenges.filter(({ challenge }) => !challenge.verified);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <Link
          to="/challenges"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to challenges
        </Link>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-slate-400 mb-3 font-bold text-sm tracking-widest uppercase">
              <CalendarDays className="w-4 h-4" />
              Archive
            </div>
            <h1 className="text-4xl font-bold mb-2">Past Challenges</h1>
            <p className="text-slate-400 font-medium">
              Review closed and graded challenges without opening new submissions.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-10 flex flex-col sm:flex-row gap-4">
        <div className="w-full relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search past challenges..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white placeholder-slate-500 transition-all text-lg"
          />
        </div>
        <div className="sm:w-44 relative shrink-0">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value as 'All' | 'Closed' | 'Graded')}
            className="w-full px-4 py-3.5 bg-slate-900/50 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-white appearance-none cursor-pointer text-lg"
          >
            <option value="All">All States</option>
            <option value="Closed">Closed</option>
            <option value="Graded">Graded</option>
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

      {loading ? (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading past challenges...
        </div>
      ) : pastChallenges.length === 0 ? (
        <div className="text-center p-12 glass-panel rounded-3xl border-dashed">
          <CalendarDays className="w-10 h-10 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2">No past challenges found</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Closed and graded challenges will show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-14">
          {verifiedPastChallenges.length > 0 && (
            <PastChallengeSection
              title="Verified Company Challenges"
              icon={<Building2 className="w-6 h-6 text-indigo-400" />}
              count={verifiedPastChallenges.length}
              items={verifiedPastChallenges}
              navigate={navigate}
            />
          )}
          {communityPastChallenges.length > 0 && (
            <PastChallengeSection
              title="Community Challenges"
              icon={<Users className="w-6 h-6 text-slate-400" />}
              count={communityPastChallenges.length}
              items={communityPastChallenges}
              navigate={navigate}
            />
          )}
        </div>
      )}
    </div>
  );
}

function PastChallengeSection({
  title,
  icon,
  count,
  items,
  navigate,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  items: { challenge: ApiChallenge; state: PastChallengeState }[];
  navigate: (to: string, options?: { state: unknown }) => void;
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <span className="text-sm font-medium text-slate-500 border border-slate-800 px-3 py-1 rounded-full bg-slate-900/50">
          {count}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map(({ challenge, state }, idx) => (
          <PastChallengeCard
            key={challenge.id}
            challenge={challenge}
            state={state}
            idx={idx}
            navigate={navigate}
          />
        ))}
      </div>
    </section>
  );
}

function PastChallengeCard({
  challenge,
  state,
  idx,
  navigate,
}: {
  challenge: ApiChallenge;
  state: PastChallengeState;
  idx: number;
  navigate: (to: string, options?: { state: unknown }) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04 }}
      className="glass-panel rounded-2xl p-6 border-b-2 border-b-slate-700 flex flex-col h-full"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          {challenge.verified && challenge.company ? (
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <span className="truncate">{challenge.company.name}</span>
              <BadgeCheck className="w-4 h-4 text-blue-400 shrink-0" />
            </div>
          ) : (
            <Link
              to={`/u/${challenge.authorUsername}`}
              className="min-w-0 flex items-center gap-2 group/author"
            >
              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center group-hover/author:bg-slate-700 transition-colors shrink-0">
                <User className="w-3 h-3 text-slate-400 group-hover/author:text-blue-400 transition-colors" />
              </div>
              <span className="text-xs font-medium text-slate-400 group-hover/author:text-blue-400 transition-colors truncate">
                @{challenge.authorUsername}
              </span>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
          <Heart className="w-3.5 h-3.5" />
          {challenge.likes}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <StateBadge state={state} />
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          <CalendarDays className="w-3.5 h-3.5" />
          {formatPastDate(challenge.dueDate)}
        </span>
      </div>

      <h2 className="text-xl font-bold mb-2">{challenge.title}</h2>
      <p className="text-sm text-slate-400 mb-6 leading-relaxed line-clamp-3 flex-grow">
        {challenge.description}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {challenge.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="px-2 py-1 bg-slate-900/50 rounded-lg text-[10px] font-medium text-slate-400 border border-slate-800">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
          <span>{challenge.language}</span>
          <span className="text-slate-700">/</span>
          <span>{challenge.difficulty}</span>
        </div>
        <button
          onClick={() => navigate(`/challenges/${challenge.id}/submit`)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          View <Eye className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
