import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Download,
  ExternalLink,
  Github,
  Linkedin,
  Mail,
  Trophy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

interface ApiChallenge {
  id: string;
  authorId: string;
  title: string;
  description: string;
  difficulty: string;
  language: string;
  dueDate: string;
  state: 'open' | 'closed' | 'graded';
  verified: boolean;
  podium: {
    firstUserId: string | null;
    secondUserId: string | null;
    thirdUserId: string | null;
    rationale: { first: string; second: string; third: string };
    gradedAt: string;
  } | null;
  ranked?: boolean;
  rankingDetail?: {
    ranking: string[];
    deltas: number[];
    reasoning: string;
    rankedAt: string;
  };
}

interface ApiSubmissionWithAuthor {
  id: string;
  challengeId: string;
  userId: string;
  zipPath: string | null;
  zipFileName: string | null;
  githubUrl: string;
  deployedUrl: string;
  notes: string;
  submittedAt: string | null;
  author: {
    userId: string;
    email: string;
    username: string;
    fullName: string;
    avatarUrl: string;
    linkedinUrl: string;
    githubUrl: string;
    twitterUrl: string;
  };
}

type Slot = 'first' | 'second' | 'third';
const SLOT_LABEL: Record<Slot, string> = { first: '1st', second: '2nd', third: '3rd' };

export function GradeChallenge() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [challenge, setChallenge] = useState<ApiChallenge | null>(null);
  const [submissions, setSubmissions] = useState<ApiSubmissionWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Podium picks: keyed by slot → userId
  const [picks, setPicks] = useState<Record<Slot, string>>({ first: '', second: '', third: '' });
  const [rationale, setRationale] = useState<Record<Slot, string>>({ first: '', second: '', third: '' });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [ranking, setRanking] = useState(false);
  const [rankError, setRankError] = useState<string | null>(null);
  const [rankResult, setRankResult] = useState<{
    rankingDetail: {
      ranking: string[];
      deltas: number[];
      reasoning: string;
      rankedAt: string;
    };
    eloChanges: Array<{ userId: string; delta: number; newRating: number; reason: string }>;
  } | null>(null);

  useEffect(() => {
    if (!challengeId || authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    Promise.all([
      api.get<ApiChallenge>(`/api/challenges/${challengeId}`),
      api.get<ApiSubmissionWithAuthor[]>(`/api/challenges/${challengeId}/submissions`),
    ])
      .then(([ch, subs]) => {
        if (cancelled) return;
        setChallenge(ch);
        setSubmissions(subs);
        if (ch.podium) {
          setPicks({
            first: ch.podium.firstUserId ?? '',
            second: ch.podium.secondUserId ?? '',
            third: ch.podium.thirdUserId ?? '',
          });
          setRationale(ch.podium.rationale);
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

  const submissionsById = useMemo(
    () => new Map(submissions.map((s) => [s.userId, s])),
    [submissions],
  );

  const usedUserIds = new Set(Object.values(picks).filter(Boolean));
  const isCreator = user && challenge && user.id === challenge.authorId;
  const alreadyGraded = Boolean(challenge?.podium);
  const alreadyRanked = Boolean(challenge?.ranked);
  const canGrade = isCreator && challenge?.state === 'closed' && !alreadyGraded;
  const canRank = isCreator && alreadyGraded && !alreadyRanked;

  const handlePick = (slot: Slot, userId: string) => {
    setPicks((p) => ({ ...p, [slot]: userId }));
  };

  const handleSave = async () => {
    if (!challengeId || !canGrade) return;
    setSaveError(null);

    const filled = (Object.keys(picks) as Slot[]).filter((s) => picks[s]);
    if (filled.length === 0) {
      setSaveError('Pick at least one podium slot.');
      return;
    }
    const userIds = filled.map((s) => picks[s]);
    if (new Set(userIds).size !== userIds.length) {
      setSaveError('A user can only appear in one podium slot.');
      return;
    }

    setSaving(true);
    try {
      const result = await api.post<{
        challenge: ApiChallenge;
        eloChanges: Array<{ userId: string; delta: number; newRating: number; reason: string }>;
      }>(`/api/challenges/${challengeId}/grade`, {
        podium: {
          firstUserId: picks.first || null,
          secondUserId: picks.second || null,
          thirdUserId: picks.third || null,
          rationale,
        },
      });
      setChallenge(result.challenge);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRunRanking = async () => {
    if (!challengeId || !canRank) return;
    setRankError(null);
    setRanking(true);
    try {
      const result = await api.post<{
        ranked: boolean;
        verified: boolean;
        rankingDetail: {
          ranking: string[];
          deltas: number[];
          reasoning: string;
          rankedAt: string;
        };
        eloChanges: Array<{ userId: string; delta: number; newRating: number; reason: string }>;
      }>(`/api/challenges/${challengeId}/rank`, {});
      setRankResult({ rankingDetail: result.rankingDetail, eloChanges: result.eloChanges });
      setChallenge((c) => (c ? { ...c, ranked: true, rankingDetail: result.rankingDetail } : c));
    } catch (err) {
      setRankError(err instanceof Error ? err.message : 'Ranking failed');
    } finally {
      setRanking(false);
    }
  };

  // ─── States ───────────────────────────────────────────────────────────────

  if (authLoading || loading) {
    return <CenterPanel><Loader2 className="w-6 h-6 animate-spin mr-3" />Loading…</CenterPanel>;
  }

  if (!user) {
    return (
      <CenterPanel>
        <div className="text-center">
          <p className="text-slate-300 mb-4">Sign in to grade your challenges.</p>
          <button onClick={() => navigate('/challenges')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors">
            Back to Challenges
          </button>
        </div>
      </CenterPanel>
    );
  }

  if (loadError || !challenge) {
    return (
      <CenterPanel>
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <p className="text-slate-300 mb-6">{loadError ?? 'Challenge not found'}</p>
          <button onClick={() => navigate('/profile')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors">
            Back to Profile
          </button>
        </div>
      </CenterPanel>
    );
  }

  if (!isCreator) {
    return (
      <CenterPanel>
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Only the challenge creator can grade.</h1>
          <button onClick={() => navigate('/challenges')} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors">
            Back to Challenges
          </button>
        </div>
      </CenterPanel>
    );
  }

  if (challenge.state === 'open') {
    return (
      <CenterPanel>
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">Cannot grade yet</h1>
          <p className="text-slate-400 mb-6">
            Submissions close at {new Date(challenge.dueDate).toLocaleString()}. Come back after that.
          </p>
          <button onClick={() => navigate('/profile')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg font-bold transition-colors">
            Back to Profile
          </button>
        </div>
      </CenterPanel>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-12">
      <div className="max-w-5xl mx-auto px-6">
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Profile
        </button>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <Trophy className="w-6 h-6 text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Grade: {challenge.title}</h1>
              <p className="text-sm text-slate-400">
                {submissions.length} submission{submissions.length === 1 ? '' : 's'} · Closed{' '}
                {new Date(challenge.dueDate).toLocaleString()}
              </p>
            </div>
          </div>
          {challenge.verified ? (
            <div className="inline-flex items-center gap-2 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified · elo is allocated when you run the AI ranking step below
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700 px-3 py-1.5 rounded-full">
              Unverified · grading is recorded but no elo will be awarded
            </div>
          )}
        </motion.div>

        {alreadyGraded && (
          <Banner
            tone="success"
            title="Graded"
            body={`This challenge was graded on ${new Date(challenge.podium!.gradedAt).toLocaleString()}. Picks below are read-only.`}
          />
        )}

        {saved && (
          <Banner
            tone="success"
            title="Grading saved"
            body="Podium picks are locked. Run AI ranking below to allocate elo (verified challenges only)."
          />
        )}

        {submissions.length === 0 ? (
          <div className="text-center p-12 glass-panel rounded-3xl border-dashed">
            <h3 className="text-xl font-bold mb-2">No submissions</h3>
            <p className="text-slate-500">
              Nobody submitted to this challenge before the due date.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mb-10">
              {submissions.map((s) => (
                <SubmissionCard
                  key={s.id}
                  submission={s}
                  challengeId={challenge.id}
                  pickedSlot={
                    (Object.keys(picks) as Slot[]).find((slot) => picks[slot] === s.userId) ?? null
                  }
                  disabled={!canGrade}
                />
              ))}
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-slate-800 mb-6">
              <h2 className="text-xl font-bold mb-1">Podium</h2>
              <p className="text-sm text-slate-500 mb-6">
                Pick the top three submissions. Rationale is optional but helpful.
              </p>
              <div className="space-y-5">
                {(['first', 'second', 'third'] as Slot[]).map((slot) => (
                  <PodiumSlot
                    key={slot}
                    slot={slot}
                    submissions={submissions}
                    pickedUserId={picks[slot]}
                    otherPicks={[...usedUserIds].filter((id) => id !== picks[slot])}
                    onPick={(userId) => handlePick(slot, userId)}
                    rationale={rationale[slot]}
                    onChangeRationale={(v) => setRationale((r) => ({ ...r, [slot]: v }))}
                    submissionsById={submissionsById}
                    disabled={!canGrade}
                    verified={challenge.verified}
                  />
                ))}
              </div>
            </div>

            {canGrade && (
              <div className="flex flex-col gap-3">
                {saveError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                    {saveError}
                  </div>
                )}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full px-6 py-4 rounded-xl font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-lg shadow-violet-900/30 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                  Save grading
                </button>
                <p className="text-xs text-slate-500 text-center">
                  Grading is final once saved. Make sure your picks are correct.
                </p>
              </div>
            )}

            {(canRank || alreadyRanked || rankResult) && (
              <div className="glass-panel rounded-2xl p-6 border border-slate-800 mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h2 className="text-xl font-bold">AI ranking & elo</h2>
                </div>
                <p className="text-sm text-slate-500 mb-4">
                  {challenge.verified
                    ? 'Locks the podium picks at the top, asks Gemini to semantically rank the remaining submissions, then distributes truncated-normal elo deltas in [-200, +200].'
                    : 'Locks the podium picks at the top and asks Gemini to semantically rank the remaining submissions. Unverified challenges do not award elo.'}
                </p>

                {rankError && (
                  <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
                    {rankError}
                  </div>
                )}

                {(rankResult || alreadyRanked) && challenge.rankingDetail ? (
                  <RankingResult
                    detail={rankResult?.rankingDetail ?? challenge.rankingDetail!}
                    submissions={submissions}
                    podium={challenge.podium}
                    verified={challenge.verified}
                  />
                ) : canRank ? (
                  <button
                    onClick={handleRunRanking}
                    disabled={ranking}
                    className="w-full px-6 py-4 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-all active:scale-95 shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2"
                  >
                    {ranking ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Asking Gemini…
                      </>
                    ) : (
                      <>
                        <Trophy className="w-4 h-4" />
                        Run AI ranking
                      </>
                    )}
                  </button>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function RankingResult({
  detail,
  submissions,
  podium,
  verified,
}: {
  detail: { ranking: string[]; deltas: number[]; reasoning: string; rankedAt: string };
  submissions: ApiSubmissionWithAuthor[];
  podium: ApiChallenge['podium'];
  verified: boolean;
}) {
  const userMap = new Map(submissions.map((s) => [s.userId, s]));
  const podiumIds = new Set(
    [podium?.firstUserId, podium?.secondUserId, podium?.thirdUserId].filter(Boolean) as string[],
  );

  return (
    <div>
      {detail.reasoning && (
        <div className="p-3 mb-4 bg-slate-900/60 border border-slate-800 rounded-lg text-sm text-slate-300 italic">
          “{detail.reasoning}”
        </div>
      )}
      <div className="space-y-2">
        {detail.ranking.map((userId, i) => {
          const sub = userMap.get(userId);
          const delta = detail.deltas[i];
          const isPodium = podiumIds.has(userId);
          const placement = isPodium ? `${i + 1}` : `#${i + 1}`;
          return (
            <div
              key={userId}
              className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                isPodium
                  ? 'bg-violet-500/10 border-violet-500/20'
                  : 'bg-slate-900/40 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    isPodium ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {placement}
                </span>
                <span className="font-medium truncate">
                  {sub?.author.fullName || `@${sub?.author.username ?? userId.slice(0, 8)}`}
                </span>
              </div>
              {verified ? (
                <span
                  className={`font-bold text-sm ${
                    delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-slate-400'
                  }`}
                >
                  {delta > 0 ? '+' : ''}
                  {delta} elo
                </span>
              ) : (
                <span className="text-xs text-slate-500 italic">no elo (unverified)</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SubmissionCard({
  submission,
  challengeId,
  pickedSlot,
  disabled,
}: {
  submission: ApiSubmissionWithAuthor;
  challengeId: string;
  pickedSlot: Slot | null;
  disabled: boolean;
}) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const { signedUrl } = await api.get<{ signedUrl: string }>(
        `/api/challenges/${challengeId}/submissions/${submission.userId}/download-url`,
      );
      window.open(signedUrl, '_blank');
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const author = submission.author;
  const displayName = author.fullName || `@${author.username}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-panel rounded-2xl p-6 border transition-colors ${
        pickedSlot
          ? 'border-violet-500/50 bg-violet-500/5'
          : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          {author.avatarUrl ? (
            <img src={author.avatarUrl} alt={displayName} className="w-10 h-10 rounded-full bg-slate-800 object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{author.email}</p>
          </div>
        </div>
        {pickedSlot && (
          <span className="px-3 py-1 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0">
            <Trophy className="w-3.5 h-3.5" />
            {SLOT_LABEL[pickedSlot]}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {submission.zipPath && (
          <button
            onClick={handleDownload}
            disabled={downloading || disabled}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-bold transition-colors"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            {submission.zipFileName ?? 'submission.zip'}
          </button>
        )}
        {submission.githubUrl && (
          <a
            href={submission.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        )}
        {submission.deployedUrl && (
          <a
            href={submission.deployedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Demo
          </a>
        )}
        {author.linkedinUrl && (
          <a
            href={author.linkedinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Linkedin className="w-3.5 h-3.5" />
            LinkedIn
          </a>
        )}
        {author.email && (
          <a
            href={`mailto:${author.email}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            <Mail className="w-3.5 h-3.5" />
            Email
          </a>
        )}
      </div>

      {downloadError && (
        <p className="text-red-400 text-xs mb-3">{downloadError}</p>
      )}

      {submission.notes && (
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Notes</p>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{submission.notes}</p>
        </div>
      )}
    </motion.div>
  );
}

function PodiumSlot({
  slot,
  submissions,
  pickedUserId,
  otherPicks,
  onPick,
  rationale,
  onChangeRationale,
  submissionsById,
  disabled,
  verified,
}: {
  slot: Slot;
  submissions: ApiSubmissionWithAuthor[];
  pickedUserId: string;
  otherPicks: string[];
  onPick: (userId: string) => void;
  rationale: string;
  onChangeRationale: (v: string) => void;
  submissionsById: Map<string, ApiSubmissionWithAuthor>;
  disabled: boolean;
  verified: boolean;
}) {
  const slotColor = {
    first: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    second: 'text-slate-300 bg-slate-500/10 border-slate-500/30',
    third: 'text-orange-300 bg-orange-500/10 border-orange-500/30',
  }[slot];

  const pickedSub = pickedUserId ? submissionsById.get(pickedUserId) : null;

  return (
    <div className="border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className={`w-12 h-12 rounded-xl border flex items-center justify-center font-bold ${slotColor}`}>
          {SLOT_LABEL[slot]}
        </span>
        <div className="flex-1 min-w-0">
          <select
            value={pickedUserId}
            onChange={(e) => onPick(e.target.value)}
            disabled={disabled}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <option value="">— pick a submission —</option>
            {submissions.map((s) => {
              const taken = otherPicks.includes(s.userId);
              return (
                <option key={s.userId} value={s.userId} disabled={taken}>
                  {s.author.fullName || `@${s.author.username}`} {taken ? '(in another slot)' : ''}
                </option>
              );
            })}
          </select>
          {pickedSub && (
            <p className="text-xs text-slate-500 mt-1 truncate">{pickedSub.author.email}</p>
          )}
        </div>
        {pickedUserId && (
          <span className="text-xs font-bold text-emerald-300 flex items-center gap-1 flex-shrink-0">
            <Check className="w-3.5 h-3.5" />
            picked
          </span>
        )}
      </div>
      <textarea
        value={rationale}
        onChange={(e) => onChangeRationale(e.target.value)}
        disabled={disabled || !pickedUserId}
        rows={2}
        maxLength={2000}
        placeholder="(optional) Why did this submission deserve this slot?"
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors disabled:opacity-60 resize-none"
      />
    </div>
  );
}

function CenterPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 text-slate-400">
      <div className="flex items-center">{children}</div>
    </div>
  );
}

function Banner({
  tone,
  title,
  body,
}: {
  tone: 'success';
  title: string;
  body: string;
}) {
  const tones = {
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200',
  };
  return (
    <div className={`mb-6 p-4 rounded-xl border ${tones[tone]}`}>
      <p className="font-bold mb-1">{title}</p>
      <p className="text-sm opacity-90">{body}</p>
    </div>
  );
}
