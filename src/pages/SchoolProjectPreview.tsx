import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Trophy, Code, Loader2 } from 'lucide-react';
import { schoolApi } from '../lib/schoolApi';
import { useAuth } from '../contexts/AuthContext';
import { useProjectContext } from '../contexts/ProjectContext';
import type { SchoolProject } from '../types';

export function SchoolProjectPreview() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addProject } = useProjectContext();

  const [project, setProject] = useState<SchoolProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [forking, setForking] = useState(false);
  const [forkError, setForkError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadError(null);
    setNotFound(false);
    schoolApi
      .get(id)
      .then((p) => {
        if (!cancelled) setProject(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (String(err).includes('not found')) setNotFound(true);
        else setLoadError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleStart = async () => {
    if (!user) {
      // Bounce them through sign-in by going to home; auth modal lives there.
      // Keep the preview path so users can come back after signing in.
      navigate('/?signIn=1', { state: { returnTo: `/school/${id}` } });
      return;
    }
    setForking(true);
    setForkError(null);
    try {
      const forked = await schoolApi.fork(id);
      addProject(forked);
      navigate(`/workspace/${forked.id}`);
    } catch (err) {
      setForkError(err instanceof Error ? err.message : String(err));
      setForking(false);
    }
  };

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-3">Project not found</h1>
        <p className="text-slate-400">No school project exists at this id.</p>
        <Link to="/school" className="inline-flex items-center gap-2 mt-6 text-sky-400 hover:text-sky-300">
          <ArrowLeft className="w-4 h-4" />
          Back to School
        </Link>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <p className="text-red-400">Failed to load project: {loadError}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading project…
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        to="/school"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to School
      </Link>

      <div className="rounded-3xl bg-slate-900/80 border border-slate-800 overflow-hidden">
        <div className="relative h-44 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <Code className="w-20 h-20 text-slate-700" />
          {project.sourceWinnerUsername && (
            <div className="absolute top-4 right-4">
              <span className="px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-[10px] font-bold text-amber-300 uppercase tracking-widest flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                Winning solution
              </span>
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-xs font-bold uppercase tracking-widest">
              {project.difficulty}
            </span>
            <span className="px-2 py-1 bg-slate-800 text-blue-400 rounded text-xs font-bold uppercase tracking-widest">
              {project.language}
            </span>
            <span className="text-xs text-slate-500">
              {project.steps.length} step{project.steps.length === 1 ? '' : 's'}
            </span>
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">{project.title}</h1>
          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>

          {project.sourceWinnerUsername && (
            <p className="text-sm text-slate-400 mt-4">
              Built by{' '}
              <Link
                to={`/u/${project.sourceWinnerUsername}`}
                className="text-amber-300 hover:text-amber-200 font-semibold"
              >
                @{project.sourceWinnerUsername}
              </Link>
            </p>
          )}

          {project.learningGoals.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-2">What you'll learn</h3>
              <ul className="space-y-1">
                {project.learningGoals.map((g) => (
                  <li key={g} className="text-slate-300 text-sm">• {g}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={handleStart}
              disabled={forking}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold px-6 py-3 rounded-xl transition-colors"
            >
              {forking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Forking…
                </>
              ) : user ? (
                <>
                  Start this project
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>Sign in to start</>
              )}
            </button>
            {forkError && (
              <span className="text-red-400 text-sm">Fork failed: {forkError}</span>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Starting copies this project into your private projects so your progress saves.
          </p>
        </div>
      </div>
    </div>
  );
}
