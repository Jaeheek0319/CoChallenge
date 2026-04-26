import { useEffect, useState } from 'react';
import { Trophy, BadgeCheck } from 'lucide-react';
import { usersApi } from '../lib/usersApi';
import type { PublicChallengeSummary } from '../types';

export function UserChallengesList({ username }: { username: string }) {
  const [challenges, setChallenges] = useState<PublicChallengeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setChallenges(null);
    setError(null);
    usersApi
      .challenges(username)
      .then((c) => {
        if (!cancelled) setChallenges(c);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error) {
    return <p className="text-red-400 text-sm">Failed to load challenges: {error}</p>;
  }
  if (challenges === null) {
    return <p className="text-slate-400 text-sm">Loading challenges…</p>;
  }
  if (challenges.length === 0) {
    return <p className="text-slate-500 italic">No challenges authored yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {challenges.map((c) => (
        <div
          key={c.id}
          className="rounded-2xl bg-slate-950/80 border border-slate-800 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {c.logoUrl ? (
                <img src={c.logoUrl} alt={c.company?.name ?? ''} className="w-full h-full object-contain p-1.5" />
              ) : (
                <Trophy className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-white font-semibold truncate">{c.title}</h4>
                {c.verified && <BadgeCheck className="w-4 h-4 text-sky-400 flex-shrink-0" />}
              </div>
              {c.company && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {c.company.name}
                  {c.company.role ? ` · ${c.company.role}` : ''}
                </p>
              )}
              <p className="text-slate-400 text-sm line-clamp-2 mt-1">{c.description}</p>
              <div className="mt-3 flex items-center gap-2 text-xs flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {c.language}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {c.difficulty}
                </span>
                {c.tags.slice(0, 3).map((t) => (
                  <span key={t} className="px-2 py-0.5 rounded-full bg-slate-900 text-slate-400">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
