import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Calendar, Lock, Loader2, Trophy, FileEdit, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface ApiChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  verified: boolean;
  company: { name: string; role: string } | null;
  dueDate: string;
  state: 'open' | 'closed' | 'graded';
}

interface MySubmission {
  id: string;
  challengeId: string;
  userId: string;
  zipPath: string | null;
  zipFileName: string | null;
  githubUrl: string;
  deployedUrl: string;
  notes: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  challenge: ApiChallenge | null;
  placement: 1 | 2 | 3 | null;
}

function relativeTime(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return '';
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  if (days > 0) return ms >= 0 ? `in ${days}d` : `${days}d ago`;
  if (hours > 0) return ms >= 0 ? `in ${hours}h` : `${hours}h ago`;
  const mins = Math.floor(abs / 60_000);
  return ms >= 0 ? `in ${mins}m` : `${mins}m ago`;
}

const PLACEMENT_LABEL: Record<1 | 2 | 3, string> = {
  1: '🥇 1st place',
  2: '🥈 2nd place',
  3: '🥉 3rd place',
};

const PLACEMENT_ELO: Record<1 | 2 | 3, number> = {
  1: 200,
  2: 100,
  3: 50,
};

export function ChallengeDojo() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<MySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<MySubmission[]>('/api/submissions/mine')
      .then((data) => {
        if (!cancelled) setSubmissions(data);
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
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading your dojo…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
        <Sparkles className="w-10 h-10 text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">No challenge attempts yet</h3>
        <p className="text-slate-500 mb-6 max-w-sm mx-auto">
          Browse open challenges and submit your first project to start building your elo.
        </p>
        <button
          onClick={() => navigate('/challenges')}
          className="bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold transition-colors active:scale-95"
        >
          Browse challenges
        </button>
      </div>
    );
  }

  const drafts = submissions.filter((s) => !s.locked);
  const submitted = submissions.filter((s) => s.locked);

  return (
    <div className="space-y-8">
      {drafts.length > 0 && (
        <Section title="Drafts" subtitle="Pick up where you left off — these aren't locked yet.">
          {drafts.map((s) => (
            <SubmissionRow key={s.id} s={s} navigate={navigate} />
          ))}
        </Section>
      )}
      {submitted.length > 0 && (
        <Section title="Submitted" subtitle="Locked submissions waiting for results, or already graded.">
          {submitted.map((s) => (
            <SubmissionRow key={s.id} s={s} navigate={navigate} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-slate-500 mb-4">{subtitle}</p>}
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SubmissionRow({
  s,
  navigate,
}: {
  s: MySubmission;
  navigate: (to: string) => void;
}) {
  const ch = s.challenge;
  if (!ch) {
    return (
      <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4 text-sm text-slate-500">
        Challenge no longer exists.
      </div>
    );
  }

  const dueLabel =
    ch.state === 'open' ? `Closes ${relativeTime(ch.dueDate)}` : `Closed ${relativeTime(ch.dueDate)}`;

  return (
    <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-5 hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="text-base font-bold text-white truncate">{ch.title}</h4>
            {ch.verified && <BadgeCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />}
            <StatusBadge submission={s} challenge={ch} />
          </div>
          {ch.company && <p className="text-xs text-slate-400">{ch.company.name}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {dueLabel}
        </span>
        <span>{ch.language}</span>
        <span>{ch.difficulty}</span>
      </div>

      {s.placement && ch.verified && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-200">
          <Trophy className="w-3.5 h-3.5" />
          {PLACEMENT_LABEL[s.placement]} · +{PLACEMENT_ELO[s.placement]} elo
        </div>
      )}
      {s.placement && !ch.verified && (
        <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
          <Trophy className="w-3.5 h-3.5" />
          {PLACEMENT_LABEL[s.placement]} (unverified · no elo)
        </div>
      )}

      <div className="flex items-center gap-2">
        {!s.locked && ch.state === 'open' && (
          <button
            onClick={() => navigate(`/challenges/${ch.id}/submit`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Continue draft
          </button>
        )}
        {!s.locked && ch.state !== 'open' && (
          <span className="text-xs text-slate-500 italic">Closed without final submit</span>
        )}
        {s.locked && (
          <button
            onClick={() => navigate(`/challenges/${ch.id}/submit`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            View submission
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({
  submission,
  challenge,
}: {
  submission: MySubmission;
  challenge: ApiChallenge;
}) {
  if (!submission.locked) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-slate-800 text-slate-300 border-slate-700 inline-flex items-center gap-1">
        <FileEdit className="w-3 h-3" /> Draft
      </span>
    );
  }
  if (challenge.state === 'graded') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/10 text-violet-300 border-violet-500/20">
        Graded
      </span>
    );
  }
  if (challenge.state === 'closed') {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-300 border-amber-500/20">
        Awaiting grade
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-300 border-emerald-500/20 inline-flex items-center gap-1">
      <Lock className="w-3 h-3" /> Submitted
    </span>
  );
}
