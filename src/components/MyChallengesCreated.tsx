import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Calendar, Trophy, Users, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface MyCreatedChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  company: { name: string; role: string } | null;
  verified: boolean;
  dueDate: string;
  state: 'open' | 'closed' | 'graded';
  podium: {
    firstUserId: string | null;
    secondUserId: string | null;
    thirdUserId: string | null;
  } | null;
  submissionCount: number;
  draftCount: number;
}

function relativeDue(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return '';
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  if (ms >= 0) {
    return days > 0 ? `Closes in ${days}d` : `Closes in ${hours}h`;
  }
  return days > 0 ? `Closed ${days}d ago` : `Closed ${hours}h ago`;
}

export function MyChallengesCreated() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<MyCreatedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<MyCreatedChallenge[]>('/api/challenges/mine/created')
      .then((data) => {
        if (!cancelled) setChallenges(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400">{error}</p>;
  }

  if (challenges.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl">
        <p className="text-slate-400 mb-3">You haven't posted a challenge yet.</p>
        <button
          onClick={() => navigate('/create-challenge')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-sm transition-colors"
        >
          Post your first challenge
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((c) => (
        <ChallengeRow key={c.id} c={c} onGrade={() => navigate(`/challenges/${c.id}/grade`)} />
      ))}
    </div>
  );
}

function ChallengeRow({ c, onGrade }: { c: MyCreatedChallenge; onGrade: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="text-lg font-bold text-white truncate">{c.title}</h3>
            {c.verified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <StateBadge state={c.state} />
          </div>
          {c.company && (
            <p className="text-xs text-slate-400 mb-1">{c.company.name}</p>
          )}
          <p className="text-sm text-slate-400 line-clamp-2">{c.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {relativeDue(c.dueDate)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {c.submissionCount} submission{c.submissionCount === 1 ? '' : 's'}
        </span>
        {c.draftCount > 0 && (
          <span className="text-slate-600">+ {c.draftCount} draft{c.draftCount === 1 ? '' : 's'}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/challenges/${c.id}/submit`)}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
        >
          View
        </button>
        {c.state === 'closed' && c.submissionCount > 0 && (
          <button
            onClick={onGrade}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-xs font-bold text-white transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            Grade now
          </button>
        )}
        {c.state === 'closed' && c.submissionCount === 0 && (
          <span className="text-xs text-slate-500 italic">No submissions</span>
        )}
        {c.state === 'graded' && (
          <button
            onClick={onGrade}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Trophy className="w-3.5 h-3.5" />
            View grading
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function StateBadge({ state }: { state: 'open' | 'closed' | 'graded' }) {
  const map = {
    open: { label: 'Open', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    closed: { label: 'Awaiting grade', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    graded: { label: 'Graded', cls: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  };
  const s = map[state];
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
}
