import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Upload, FileArchive, Loader2, Check, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface ApiChallenge {
  id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  tags: string[];
  requirements: string;
  estimatedTime: string;
  company: { name: string; role: string } | null;
  verified: boolean;
  logoUrl: string | null;
  dueDate: string;
  state: 'open' | 'closed' | 'graded';
}

interface ApiSubmission {
  id: string;
  challengeId: string;
  userId: string;
  zipPath: string | null;
  zipFileName: string | null;
  githubUrl: string;
  deployedUrl: string;
  notes: string;
  locked: boolean;
  convertOnWin: boolean;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
}

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB (Supabase free-tier per-file cap)

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(iso: string): string {
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return iso;
  const abs = Math.abs(ms);
  const days = Math.floor(abs / 86_400_000);
  const hours = Math.floor((abs % 86_400_000) / 3_600_000);
  const sign = ms >= 0 ? 'in ' : '';
  const suffix = ms >= 0 ? '' : ' ago';
  if (days > 0) return `${sign}${days}d ${hours}h${suffix}`;
  if (hours > 0) return `${sign}${hours}h${suffix}`;
  const mins = Math.floor(abs / 60_000);
  return `${sign}${mins}m${suffix}`;
}

export function SubmitChallenge() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [challenge, setChallenge] = useState<ApiChallenge | null>(null);
  const [submission, setSubmission] = useState<ApiSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [githubUrl, setGithubUrl] = useState('');
  const [deployedUrl, setDeployedUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [convertOnWin, setConvertOnWin] = useState(true);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploading, setZipUploading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);

  const [savingDraft, setSavingDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!challengeId || authLoading) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      api.get<ApiChallenge>(`/api/challenges/${challengeId}`),
      user
        ? api
            .get<ApiSubmission>(`/api/submissions/${challengeId}/me`)
            .catch((err) => {
              // 404 is "no submission yet" — that's fine
              if (err instanceof Error && err.message.includes('404')) return null;
              throw err;
            })
        : Promise.resolve(null),
    ])
      .then(([ch, sub]) => {
        if (cancelled) return;
        setChallenge(ch);
        if (sub) {
          setSubmission(sub);
          setGithubUrl(sub.githubUrl);
          setDeployedUrl(sub.deployedUrl);
          setNotes(sub.notes);
          if (typeof sub.convertOnWin === 'boolean') setConvertOnWin(sub.convertOnWin);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [challengeId, user, authLoading]);

  const locked = submission?.locked === true;
  const challengeOpen = challenge?.state === 'open';
  const canEdit = challengeOpen && !locked;
  const dueDateLabel = useMemo(
    () => (challenge ? formatRelative(challenge.dueDate) : ''),
    [challenge?.dueDate],
  );

  const validateUrls = (): string | null => {
    const ok = (u: string) => u === '' || /^https?:\/\//i.test(u);
    if (!ok(githubUrl)) return 'GitHub URL must start with http(s)://';
    if (!ok(deployedUrl)) return 'Deployed URL must start with http(s)://';
    return null;
  };

  const handleSelectZip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setZipError(null);
    if (!file) {
      setZipFile(null);
      return;
    }
    if (!/\.zip$/i.test(file.name)) {
      setZipError('Please upload a .zip file');
      return;
    }
    if (file.size > MAX_ZIP_BYTES) {
      setZipError(`Zip must be under ${formatBytes(MAX_ZIP_BYTES)}`);
      return;
    }
    setZipFile(file);
  };

  const uploadZip = async (): Promise<{ path: string; fileName: string } | null> => {
    if (!zipFile || !challengeId) return null;
    setZipUploading(true);
    setZipError(null);
    try {
      const { signedUrl, path } = await api.post<{
        signedUrl: string;
        token: string;
        path: string;
      }>(`/api/submissions/${challengeId}/upload-url`, {});
      const res = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: zipFile,
      });
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status}): ${await res.text().catch(() => '')}`);
      }
      return { path, fileName: zipFile.name };
    } catch (err) {
      setZipError(err instanceof Error ? err.message : 'Upload failed');
      return null;
    } finally {
      setZipUploading(false);
    }
  };

  const saveDraft = async (
    opts: { thenSubmit?: boolean } = {},
  ): Promise<ApiSubmission | null> => {
    if (!challengeId) return null;
    setActionError(null);
    const urlErr = validateUrls();
    if (urlErr) {
      setActionError(urlErr);
      return null;
    }
    setSavingDraft(true);
    try {
      let zipMeta: { path: string; fileName: string } | null = null;
      if (zipFile) {
        zipMeta = await uploadZip();
        if (!zipMeta) {
          setSavingDraft(false);
          return null;
        }
      }

      const body: Record<string, unknown> = {
        githubUrl,
        deployedUrl,
        notes,
        convertOnWin,
      };
      if (zipMeta) {
        body.zipPath = zipMeta.path;
        body.zipFileName = zipMeta.fileName;
      } else if (submission?.zipPath) {
        body.zipPath = submission.zipPath;
        body.zipFileName = submission.zipFileName;
      }

      const saved = await api.put<ApiSubmission>(
        `/api/submissions/${challengeId}`,
        body,
      );
      setSubmission(saved);
      setZipFile(null); // clear pending upload
      setSavedAt(new Date().toISOString());
      return saved;
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Save failed');
      return null;
    } finally {
      if (!opts.thenSubmit) setSavingDraft(false);
    }
  };

  const handleSubmitFinal = async () => {
    if (!challengeId) return;
    setActionError(null);
    setSubmitting(true);
    try {
      const draft = await saveDraft({ thenSubmit: true });
      if (!draft) {
        setSubmitting(false);
        setSavingDraft(false);
        return;
      }
      const locked = await api.post<ApiSubmission>(
        `/api/submissions/${challengeId}/submit`,
        {},
      );
      setSubmission(locked);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
      setSavingDraft(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-950 py-12">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Loading challenge…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <SignInGate
        onBack={() => navigate('/challenges')}
      />
    );
  }

  if (loadError || !challenge) {
    return (
      <div className="min-h-screen bg-slate-950 py-12">
        <div className="max-w-md mx-auto px-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-6">{loadError ?? 'Challenge not found'}</p>
          <button
            onClick={() => navigate('/challenges')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors"
          >
            Back to Challenges
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-3xl mx-auto px-6">
        <button
          onClick={() => navigate('/challenges')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Challenges
        </button>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{challenge.title}</h1>
              {challenge.company && (
                <p className="text-sm text-slate-400">
                  {challenge.company.name}
                  {challenge.verified && ' ✓'}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <Badge>{challenge.difficulty}</Badge>
            <Badge>{challenge.language}</Badge>
            <span>Due {dueDateLabel}</span>
            <StateBadge state={challenge.state} />
          </div>
        </motion.div>

        {locked && (
          <Banner
            tone="success"
            icon={<Lock className="w-5 h-5" />}
            title="Submitted"
            body={
              submission?.submittedAt
                ? `Your submission was locked at ${new Date(submission.submittedAt).toLocaleString()}. You can no longer edit.`
                : 'Your submission is locked.'
            }
          />
        )}

        {!locked && !challengeOpen && (
          <Banner
            tone="warning"
            icon={<AlertCircle className="w-5 h-5" />}
            title="Closed"
            body="This challenge is past its due date. New submissions are no longer accepted."
          />
        )}

        <div className="space-y-6">
          {/* Challenge details (description + requirements + tags) */}
          <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Description</h3>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                {challenge.description}
              </p>
            </div>

            {challenge.requirements && (
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Requirements</h3>
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {challenge.requirements}
                </p>
              </div>
            )}

            {challenge.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {challenge.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {challenge.estimatedTime && (
              <div className="text-xs text-slate-500">
                Estimated time: <span className="text-slate-300 font-medium">{challenge.estimatedTime}</span>
              </div>
            )}
          </div>

          {/* Zip upload */}
          <Section title="1. Upload your project (.zip)" subtitle={`Up to ${formatBytes(MAX_ZIP_BYTES)}. Exclude node_modules.`}>
            {submission?.zipFileName && !zipFile && (
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
                <FileArchive className="w-4 h-4" />
                Current upload: <span className="font-mono text-slate-300">{submission.zipFileName}</span>
              </div>
            )}
            <label
              className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-xl transition-colors ${
                canEdit
                  ? 'border-slate-700 hover:border-blue-500 cursor-pointer'
                  : 'border-slate-800 opacity-60 cursor-not-allowed'
              }`}
            >
              <Upload className="w-5 h-5 text-slate-500" />
              <span className="text-sm text-slate-400">
                {zipFile ? zipFile.name : 'Click to choose a .zip file'}
              </span>
              <input
                type="file"
                accept=".zip,application/zip"
                disabled={!canEdit}
                onChange={handleSelectZip}
                className="hidden"
              />
            </label>
            {zipFile && (
              <p className="text-xs text-slate-500 mt-2">
                {formatBytes(zipFile.size)} — uploaded when you Save Draft or Submit Final
              </p>
            )}
            {zipError && (
              <p className="text-red-400 text-xs mt-2">{zipError}</p>
            )}
          </Section>

          {/* Links */}
          <Section title="2. Links (optional)" subtitle="Most graders will skim these first.">
            <div className="space-y-4">
              <Field label="GitHub URL">
                <input
                  type="url"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://github.com/you/repo"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
                />
              </Field>
              <Field label="Deployed URL">
                <input
                  type="url"
                  value={deployedUrl}
                  onChange={(e) => setDeployedUrl(e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://your-demo.vercel.app"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors disabled:opacity-60"
                />
              </Field>
            </div>
          </Section>

          {/* Notes */}
          <Section title="3. Notes for the grader" subtitle="What did you build? Any tradeoffs to flag?">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
              rows={6}
              maxLength={4000}
              placeholder="Describe your approach, key decisions, what you'd do with more time…"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors resize-none disabled:opacity-60"
            />
            <p className="text-xs text-slate-500 mt-1">{notes.length} / 4000</p>
          </Section>

          {/* Convert-on-win opt-in */}
          <Section
            title="4. If you win 1st place"
            subtitle="Auto-publish your winning solution as a guided lesson on the School page so others can learn from it."
          >
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={convertOnWin}
                onChange={(e) => setConvertOnWin(e.target.checked)}
                disabled={!canEdit}
                className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
              />
              <span className="text-sm text-slate-300">
                Turn my submission into a public learning project on{' '}
                <span className="text-blue-400 font-semibold">School</span> if I take 1st.
                <span className="block text-xs text-slate-500 mt-1">
                  We'll generate a step-by-step lesson from your notes + the challenge requirements,
                  attributed to you.
                </span>
              </span>
            </label>
          </Section>

          {/* Actions */}
          {canEdit && (
            <div className="flex flex-col gap-3">
              {actionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                  {actionError}
                </div>
              )}
              {savedAt && !actionError && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Draft saved {formatRelative(savedAt)}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => saveDraft()}
                  disabled={savingDraft || submitting || zipUploading}
                  className="flex-1 px-6 py-4 rounded-xl font-bold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingDraft || zipUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Draft'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitFinal}
                  disabled={savingDraft || submitting || zipUploading}
                  className="flex-1 px-6 py-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Final'}
                </button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Save Draft keeps editing open until the due date. Submit Final locks it.
              </p>
            </div>
          )}
        </div>
      </div>
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
    <div className="glass-panel rounded-2xl p-6 border border-slate-800">
      <h2 className="text-lg font-bold mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
        {label}
      </label>
      {children}
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-full text-xs font-bold">
      {children}
    </span>
  );
}

function StateBadge({ state }: { state: 'open' | 'closed' | 'graded' }) {
  const map = {
    open: { label: 'Open', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' },
    closed: { label: 'Closed', cls: 'bg-amber-500/10 text-amber-300 border-amber-500/20' },
    graded: { label: 'Graded', cls: 'bg-violet-500/10 text-violet-300 border-violet-500/20' },
  };
  const s = map[state];
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Banner({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'success' | 'warning';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const tones = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-200',
  };
  return (
    <div className={`mb-6 p-4 rounded-xl border ${tones[tone]} flex items-start gap-3`}>
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="font-bold">{title}</p>
        <p className="text-sm opacity-90">{body}</p>
      </div>
    </div>
  );
}

function SignInGate({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-md mx-auto px-6">
        <div className="glass-panel rounded-2xl p-10 text-center">
          <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sign in to submit</h1>
          <p className="text-slate-400 text-sm mb-6">
            You need an account to submit a project to a challenge. Sign in from the top nav.
          </p>
          <button
            onClick={onBack}
            className="w-full h-11 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl transition-colors"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
