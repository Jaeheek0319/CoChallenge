import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { usersApi } from '../lib/usersApi';
import type { PublicProjectSummary } from '../types';

export function UserProjectsList({ username }: { username: string }) {
  const [projects, setProjects] = useState<PublicProjectSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;
    let cancelled = false;
    setProjects(null);
    setError(null);
    usersApi
      .projects(username)
      .then((p) => {
        if (!cancelled) setProjects(p);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error) {
    return <p className="text-red-400 text-sm">Failed to load projects: {error}</p>;
  }
  if (projects === null) {
    return <p className="text-slate-400 text-sm">Loading projects…</p>;
  }
  if (projects.length === 0) {
    return <p className="text-slate-500 italic">No projects yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {projects.map((p) => (
        <Link
          key={p.id}
          to={`/workspace/${p.id}`}
          className="block rounded-2xl bg-slate-950/80 border border-slate-800 p-5 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
              <Code2 className="w-4 h-4 text-sky-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-white font-semibold truncate">{p.title || 'Untitled project'}</h4>
              <p className="text-slate-400 text-sm line-clamp-2">{p.description || '—'}</p>
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {p.language || '—'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {p.difficulty || '—'}
                </span>
                {p.totalSteps > 0 && (
                  <span className="text-slate-500">
                    Step {Math.min(p.currentStep + 1, p.totalSteps)} / {p.totalSteps}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
