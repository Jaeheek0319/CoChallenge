import 'dotenv/config';
import { randomUUID } from 'crypto';
import express from 'express';
import { Agent, fetch as undiciFetch } from 'undici';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { getDb } from './db';
import { requireAuth } from './auth';

const app = express();
app.use(express.json({ limit: '2mb' }));

interface ProjectDoc {
  _id: string;
  userId: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  files: unknown[];
  steps: unknown[];
  currentStep: number;
  updatedAt: string;
  forkedFromSchoolId?: string;
}

interface Podium {
  firstUserId: string | null;
  secondUserId: string | null;
  thirdUserId: string | null;
  rationale: { first: string; second: string; third: string };
  gradedAt: string;
}

interface AIRankingDetail {
  ranking: string[];
  deltas: number[];
  reasoning: string;
  rankedAt: string;
}

interface ChallengeDoc {
  _id: string;
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
  podium: Podium | null;
  ranked?: boolean;
  rankingDetail?: AIRankingDetail;
  schoolProjectId?: string | null;
  createdAt: string;
}

interface SubmissionDoc {
  _id: string;
  challengeId: string;
  userId: string;
  authorEmail: string;
  authorUsername: string;
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

interface EloChangeDoc {
  _id: string;
  userId: string;
  challengeId: string;
  delta: number;
  newRating: number;
  reason: string;
  createdAt: string;
}

interface SchoolProjectDoc {
  _id: string;
  title: string;
  description: string;
  language: string;
  difficulty: string;
  learningGoals: string[];
  files: unknown[];
  steps: unknown[];
  sourceChallengeId: string | null;
  sourceWinnerId: string | null;
  sourceWinnerUsername: string | null;
  likes: number;
  createdAt: string;
  updatedAt: string;
}

interface VerifiedCompany {
  name: string;
  logoFile: string;
}

const VERIFIED_COMPANY_DOMAINS: Record<string, VerifiedCompany> = {
  'stripe.com': { name: 'Stripe', logoFile: 'stripe.svg' },
  'vercel.com': { name: 'Vercel', logoFile: 'vercel.svg' },
  'airbnb.com': { name: 'Airbnb', logoFile: 'airbnb.svg' },
  'linear.app': { name: 'Linear', logoFile: 'linear.svg' },
  'autodb.app': { name: 'AutoDB', logoFile: 'autodb.svg' },
};

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const LOGO_BUCKET = process.env.SUPABASE_LOGO_BUCKET ?? 'logos';
const SUBMISSION_BUCKET = process.env.SUPABASE_SUBMISSION_BUCKET ?? 'challenge-submissions';
const SUBMISSION_DOWNLOAD_TTL_SECONDS = 300;

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function publicLogoUrl(file: string): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${LOGO_BUCKET}/${file}`;
}

async function generateSignedUploadUrl(path: string) {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SECRET_KEY not configured on server');
  }
  const { data, error } = await supabaseAdmin.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(error?.message ?? 'failed to create upload url');
  return data;
}

async function generateSignedDownloadUrl(path: string) {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SECRET_KEY not configured on server');
  }
  const { data, error } = await supabaseAdmin.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(path, SUBMISSION_DOWNLOAD_TTL_SECONDS);
  if (error || !data) throw new Error(error?.message ?? 'failed to create download url');
  return data;
}

const FLASK_URL = process.env.FLASK_URL ?? 'http://localhost:5000';

// Flask's ADK pipeline can take well over the default 5min undici timeout,
// especially with retry/backoff after a rate-limit hit. Allow up to 10min.
const flaskDispatcher = new Agent({
  headersTimeout: 10 * 60_000,
  bodyTimeout: 10 * 60_000,
  connectTimeout: 30_000,
});

async function generateLessonViaFlask(
  prompt: string,
  language: string,
  difficulty: string,
): Promise<{
  title: string;
  description: string;
  learningGoals: string[];
  files: unknown[];
  steps: unknown[];
  language?: string;
  difficulty?: string;
}> {
  const res = await undiciFetch(`${FLASK_URL}/api/generateProject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, language, difficulty }),
    dispatcher: flaskDispatcher,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Flask generateProject ${res.status}: ${detail}`);
  }
  return (await res.json()) as Awaited<ReturnType<typeof generateLessonViaFlask>>;
}

function normalizeLessonStep(rawStep: unknown): unknown {
  if (!rawStep || typeof rawStep !== 'object') return rawStep;
  const step = rawStep as Record<string, unknown>;
  // ADK occasionally emits `solution` as a {filename: code} object instead
  // of a single string. Flatten it to match the LessonStep contract.
  if (step.solution && typeof step.solution === 'object' && !Array.isArray(step.solution)) {
    const entries = Object.entries(step.solution as Record<string, unknown>);
    step.solution = entries
      .map(([file, code]) =>
        `=== ${file} ===\n${typeof code === 'string' ? code : JSON.stringify(code)}`,
      )
      .join('\n\n');
  } else if (typeof step.solution !== 'string') {
    step.solution = '';
  }
  return step;
}

function buildSchoolProjectPrompt(
  challenge: ChallengeDoc,
  winner: SubmissionDoc,
): string {
  return [
    `Build a guided lesson that walks a learner from a blank slate to recreating this challenge's winning solution.`,
    ``,
    `CHALLENGE TITLE: ${challenge.title}`,
    `DESCRIPTION: ${challenge.description}`,
    challenge.requirements ? `REQUIREMENTS: ${challenge.requirements}` : '',
    challenge.resources ? `RESOURCES: ${challenge.resources}` : '',
    challenge.starterCode ? `STARTER CODE PROVIDED:\n${challenge.starterCode}` : '',
    ``,
    `1ST PLACE WINNER NOTES: ${winner.notes || '(no notes)'}`,
    winner.githubUrl ? `WINNER GITHUB: ${winner.githubUrl}` : '',
    winner.deployedUrl ? `WINNER DEMO: ${winner.deployedUrl}` : '',
    ``,
    `Produce 5-8 progressive steps. The final step's solution should reach the same outcome the winner achieved.`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function convertWinnerToSchoolProject(
  challenge: ChallengeDoc,
): Promise<string | null> {
  if (challenge.schoolProjectId) return challenge.schoolProjectId;
  const firstUserId = challenge.podium?.firstUserId;
  if (!firstUserId) return null;

  const db = await getDb();
  const winner = await db
    .collection<SubmissionDoc>('challenge_submissions')
    .findOne({ challengeId: challenge._id, userId: firstUserId });
  if (!winner) return null;
  if (!winner.convertOnWin) return null;

  const prompt = buildSchoolProjectPrompt(challenge, winner);
  const generated = await generateLessonViaFlask(
    prompt,
    challenge.language,
    challenge.difficulty,
  );

  const winnerProfile = await db
    .collection<ProfileDoc>('profiles')
    .findOne({ _id: firstUserId });

  const now = new Date().toISOString();
  const schoolDoc: SchoolProjectDoc = {
    _id: randomUUID(),
    title: typeof generated.title === 'string' && generated.title ? generated.title : challenge.title,
    description:
      typeof generated.description === 'string' && generated.description
        ? generated.description
        : challenge.description,
    language: challenge.language,
    difficulty: challenge.difficulty,
    learningGoals: Array.isArray(generated.learningGoals)
      ? generated.learningGoals.filter((g): g is string => typeof g === 'string')
      : [],
    files: Array.isArray(generated.files) ? generated.files : [],
    steps: Array.isArray(generated.steps)
      ? generated.steps.map(normalizeLessonStep)
      : [],
    sourceChallengeId: challenge._id,
    sourceWinnerId: firstUserId,
    sourceWinnerUsername: winnerProfile?.username ?? winner.authorUsername ?? null,
    likes: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection<SchoolProjectDoc>('school_projects').insertOne(schoolDoc);
  await db
    .collection<ChallengeDoc>('challenges')
    .updateOne({ _id: challenge._id }, { $set: { schoolProjectId: schoolDoc._id } });

  return schoolDoc._id;
}

async function deleteSubmissionObject(path: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.storage.from(SUBMISSION_BUCKET).remove([path]);
}

const ALLOWED_DIFFICULTIES = new Set(['Beginner', 'Intermediate', 'Advanced']);
const ELO_STARTING_VALUE = 500;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_YEAR_MS = 365 * ONE_DAY_MS;
const SUBMISSION_NOTES_MAX = 4000;
const SUBMISSION_URL_MAX = 500;

// ─── AI ranking ────────────────────────────────────────────────────────────
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? '';
const RANKER_MODEL = process.env.RANKER_MODEL ?? 'gemini-2.5-flash';
const RANKER_MIN_DELTA = -200;
const RANKER_MAX_DELTA = 200;
const genai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

/**
 * Min-max normalized deltas. Returns N values in descending order, linearly
 * spaced from RANKER_MAX_DELTA (best, index 0) to RANKER_MIN_DELTA (worst,
 * index N-1). Deterministic, no randomness.
 *   N=1 → [0]   (no relative ranking possible with a single submission)
 *   N=2 → [max, min]
 *   N=5 → [200, 100, 0, -100, -200]
 */
function minMaxNormDeltas(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];
  const range = RANKER_MIN_DELTA - RANKER_MAX_DELTA;
  return Array.from({ length: n }, (_, i) =>
    Math.round(RANKER_MAX_DELTA + (i * range) / (n - 1)),
  );
}

async function rankSubmissionsWithAI(
  challenge: ChallengeDoc,
  submissions: SubmissionDoc[],
): Promise<{ ranking: string[]; reasoning: string }> {
  if (!genai) throw new Error('GEMINI_API_KEY not configured');
  if (submissions.length === 0) return { ranking: [], reasoning: '' };

  const submissionBlock = submissions
    .map(
      (s) =>
        `[${s.userId}]
  GitHub: ${s.githubUrl || '(none)'}
  Deployed: ${s.deployedUrl || '(none)'}
  Notes: ${s.notes || '(none)'}`,
    )
    .join('\n\n');

  const prompt = `You are an expert evaluator for coding challenge submissions. Rank these submissions from BEST to WORST based on how well they appear to satisfy the challenge requirements.

CHALLENGE TITLE: ${challenge.title}
DESCRIPTION: ${challenge.description}
REQUIREMENTS: ${challenge.requirements || '(none provided)'}
DIFFICULTY: ${challenge.difficulty}

You can only see submission metadata (GitHub URL, deployed demo URL, builder's notes). You cannot inspect actual code. Use signals like: presence of a GitHub repo, presence of a working demo, depth and clarity of notes, alignment with stated requirements.

SUBMISSIONS:
${submissionBlock}

Return ONLY valid JSON. The "ranking" array must contain ALL the userIds above, ordered from best to worst, no duplicates, no extras.
{
  "ranking": ["userId-best", "userId-second-best", "..."],
  "reasoning": "one or two sentence summary"
}`;

  const response = await genai.models.generateContent({
    model: RANKER_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  });

  const text = (response.text ?? '').trim();
  let parsed: { ranking?: unknown; reasoning?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`AI returned invalid JSON: ${text.slice(0, 200)}`);
  }
  const ranking = Array.isArray(parsed.ranking)
    ? parsed.ranking.filter((x): x is string => typeof x === 'string')
    : [];
  const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning : '';
  return { ranking, reasoning };
}

async function reverseEloChangesForChallenge(challengeId: string): Promise<number> {
  const db = await getDb();
  const changes = await db
    .collection<EloChangeDoc>('elo_changes')
    .find({ challengeId })
    .toArray();
  for (const ch of changes) {
    await db
      .collection<ProfileDoc>('profiles')
      .updateOne({ _id: ch.userId }, { $inc: { elo: -ch.delta } });
  }
  await db.collection('elo_changes').deleteMany({ challengeId });
  return changes.length;
}

function deriveChallengeState(doc: ChallengeDoc): 'open' | 'closed' | 'graded' {
  if (doc.podium) return 'graded';
  const due = Date.parse(doc.dueDate);
  if (!Number.isFinite(due)) return 'open';
  return Date.now() < due ? 'open' : 'closed';
}

function challengeToResponse(doc: ChallengeDoc) {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest, state: deriveChallengeState(doc) };
}

function submissionToResponse(doc: SubmissionDoc) {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

async function globalEloRank(userId: string, elo: number): Promise<number> {
  const db = await getDb();
  const higherElo = await db
    .collection<ProfileDoc>('profiles')
    .countDocuments({ elo: { $gt: elo } });
  const tiedAhead = await db
    .collection<ProfileDoc>('profiles')
    .countDocuments({ elo, _id: { $lt: userId } });
  return higherElo + tiedAhead + 1;
}

interface ProfileDoc {
  _id: string;
  userId: string;
  username: string;
  fullName: string;
  bio: string;
  avatarUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  twitterUrl: string;
  githubAccessToken?: string;
  elo: number;
  updatedAt: string;
}

const emptyProfile = (userId: string, username: string): ProfileDoc => ({
  _id: userId,
  userId,
  username,
  fullName: '',
  bio: '',
  avatarUrl: '',
  linkedinUrl: '',
  githubUrl: '',
  twitterUrl: '',
  elo: ELO_STARTING_VALUE,
  updatedAt: '',
});

const RESERVED_USERNAMES = new Set([
  'admin', 'settings', 'api', 'login', 'signup', 'logout',
  'null', 'undefined', 'me', 'search', 'user', 'users',
  'profile', 'profiles', 'auth', 'health', 'home',
]);

class UsernameValidationError extends Error {}

function validateUsername(raw: unknown): string {
  if (typeof raw !== 'string') throw new UsernameValidationError('username must be a string');
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.length < 3 || trimmed.length > 30) {
    throw new UsernameValidationError('username must be 3-30 characters');
  }
  if (!/^[a-z0-9_-]+$/.test(trimmed)) {
    throw new UsernameValidationError('username may only contain letters, numbers, _ and -');
  }
  if (RESERVED_USERNAMES.has(trimmed)) {
    throw new UsernameValidationError('username is reserved');
  }
  return trimmed;
}

function deriveUsernameBase(email: string): string {
  if (!email || !email.includes('@')) return 'user';
  const cleaned = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const sliced = cleaned.slice(0, 25);
  if (sliced.length < 3) return `user-${sliced || ''}`.slice(0, 30);
  if (RESERVED_USERNAMES.has(sliced)) return `${sliced}-1`;
  return sliced;
}

async function pickAvailableUsername(base: string): Promise<string> {
  const db = await getDb();
  const collection = db.collection<ProfileDoc>('profiles');
  if (!(await collection.findOne({ username: base }))) return base;
  for (let i = 1; i < 1000; i++) {
    const candidate = `${base}-${i}`.slice(0, 30);
    if (!(await collection.findOne({ username: candidate }))) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`.slice(0, 30);
}

let indexesEnsured = false;
async function ensureIndexes(): Promise<void> {
  if (indexesEnsured) return;
  const db = await getDb();
  await db.collection<ProfileDoc>('profiles').createIndex(
    { username: 1 },
    {
      unique: true,
      partialFilterExpression: { username: { $type: 'string', $gt: '' } },
    }
  );
  indexesEnsured = true;
}

async function loadProfile(userId: string): Promise<ProfileDoc> {
  const db = await getDb();
  const doc = await db.collection<ProfileDoc>('profiles').findOne({ _id: userId });
  if (!doc) return emptyProfile(userId, '');
  return { ...emptyProfile(userId, doc.username ?? ''), ...doc };
}

async function applyElo(
  userId: string,
  challengeId: string,
  delta: number,
  reason: string,
): Promise<EloChangeDoc> {
  const db = await getDb();
  const profile = await loadProfile(userId);
  const newRating = Math.max(0, profile.elo + delta);
  await db.collection<ProfileDoc>('profiles').updateOne(
    { _id: userId },
    {
      $set: { elo: newRating, updatedAt: new Date().toISOString() },
      $setOnInsert: {
        userId,
        fullName: '',
        bio: '',
        avatarUrl: '',
        linkedinUrl: '',
        githubUrl: '',
        twitterUrl: '',
      },
    },
    { upsert: true },
  );
  const change: EloChangeDoc = {
    _id: randomUUID(),
    userId,
    challengeId,
    delta,
    newRating,
    reason,
    createdAt: new Date().toISOString(),
  };
  await db.collection<EloChangeDoc>('elo_changes').insertOne(change);
  return change;
}

function isValidAvatarUrl(url: string, userId: string): boolean {
  if (url === '') return true;
  const re = /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/avatars\/([^/]+)\/[^/]+\.(png|jpe?g|webp)(\?.*)?$/i;
  const m = url.match(re);
  if (!m) return false;
  return m[1] === userId;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({ userId: req.userId, dbConnected: true });
  } catch (err) {
    res.status(500).json({ error: 'db ping failed', detail: String(err) });
  }
});

app.get('/api/profile', requireAuth, async (req, res) => {
  try {
    await ensureIndexes();
    const db = await getDb();
    const collection = db.collection<ProfileDoc>('profiles');
    let doc = await collection.findOne({ _id: req.userId! });

    if (!doc) {
      const base = deriveUsernameBase(req.userEmail ?? '');
      const username = await pickAvailableUsername(base);
      doc = emptyProfile(req.userId!, username);
      await collection.insertOne(doc);
    } else if (!doc.username) {
      const base = deriveUsernameBase(req.userEmail ?? '');
      const username = await pickAvailableUsername(base);
      await collection.updateOne({ _id: req.userId! }, { $set: { username } });
      doc.username = username;
    }

    // Backfill any missing fields (elo, etc.) for older profiles
    const profile: ProfileDoc = { ...emptyProfile(req.userId!, doc.username), ...doc };
    const { _id, userId, ...rest } = profile;
    res.json({ ...rest, globalRank: await globalEloRank(userId, profile.elo) });
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/profile/check-username', requireAuth, async (req, res) => {
  let username: string;
  try {
    username = validateUsername(req.query.username);
  } catch (err) {
    if (err instanceof UsernameValidationError) {
      return res.json({ available: false, reason: err.message });
    }
    return res.status(500).json({ error: 'check failed', detail: String(err) });
  }
  try {
    const db = await getDb();
    const existing = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!existing) return res.json({ available: true });
    return res.json({
      available: existing._id === req.userId,
      isMine: existing._id === req.userId,
    });
  } catch (err) {
    res.status(500).json({ error: 'check failed', detail: String(err) });
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    await ensureIndexes();
    const body = req.body ?? {};
    const trim = (s: unknown, max: number): string =>
      typeof s === 'string' ? s.trim().slice(0, max) : '';

    let username: string;
    try {
      username = validateUsername(body.username);
    } catch (err) {
      if (err instanceof UsernameValidationError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    const fullName = trim(body.fullName, 100);
    const bio = trim(body.bio, 280);
    const avatarUrl = trim(body.avatarUrl, 500);
    const linkedinUrl = trim(body.linkedinUrl, 300);
    const githubUrl = trim(body.githubUrl, 300);
    const twitterUrl = trim(body.twitterUrl, 300);

    const validUrl = (u: string) => u === '' || /^https?:\/\//i.test(u);
    if (!validUrl(linkedinUrl) || !validUrl(githubUrl) || !validUrl(twitterUrl)) {
      return res.status(400).json({ error: 'urls must start with http(s)://' });
    }
    if (!isValidAvatarUrl(avatarUrl, req.userId!)) {
      return res.status(400).json({ error: 'avatarUrl must be a Supabase avatars/<userId>/* URL' });
    }

    const db = await getDb();
    const collection = db.collection<ProfileDoc>('profiles');

    const conflict = await collection.findOne({
      username,
      _id: { $ne: req.userId! },
    });
    if (conflict) {
      return res.status(409).json({ error: 'username is taken' });
    }

    const existing = await loadProfile(req.userId!);
    const doc: ProfileDoc = {
      _id: req.userId!,
      userId: req.userId!,
      username,
      fullName,
      bio,
      avatarUrl,
      linkedinUrl,
      githubUrl,
      twitterUrl,
      elo: existing.elo,
      updatedAt: new Date().toISOString(),
    };
    if (existing.githubAccessToken) {
      doc.githubAccessToken = existing.githubAccessToken;
    }
    await collection.replaceOne({ _id: req.userId! }, doc, { upsert: true });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'save failed', detail: String(err) });
  }
});

// GitHub OAuth Integration
app.get('/api/auth/github/url', requireAuth, (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return res.status(500).json({ error: 'GITHUB_CLIENT_ID not configured' });
  // We use the userId as the state to know who is connecting
  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&state=${req.userId}&scope=repo`;
  res.json({ url });
});

app.get('/api/auth/github/callback', async (req, res) => {
  const { code, state: userId } = req.query;
  if (!code || !userId) return res.redirect('/profile?error=missing_code_or_state');

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error('GitHub Token Error:', tokenData);
      return res.redirect('/profile?error=github_token_error');
    }

    const accessToken = tokenData.access_token;
    
    // Fetch GitHub User Info
    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const githubUser = await userRes.json();

    await ensureIndexes();
    const db = await getDb();
    const existing = await db.collection<ProfileDoc>('profiles').findOne({ _id: String(userId) });

    const username =
      existing?.username ??
      (await pickAvailableUsername(
        githubUser.login
          ? deriveUsernameBase(`${githubUser.login}@github.com`)
          : `user-${String(userId).slice(0, 8)}`
      ));

    const updateDoc = {
      ...emptyProfile(String(userId), username),
      ...existing,
      githubAccessToken: accessToken,
      githubUrl: existing?.githubUrl || githubUser.html_url || '',
    };

    await db.collection<ProfileDoc>('profiles').replaceOne({ _id: String(userId) }, updateDoc as ProfileDoc, { upsert: true });
    
    res.redirect('/profile?github_connected=true');
  } catch (err) {
    console.error('GitHub Callback Error:', err);
    res.redirect('/profile?error=github_callback_failed');
  }
});

app.post('/api/auth/github/disconnect', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    await db.collection<ProfileDoc>('profiles').updateOne(
      { _id: req.userId! },
      { $unset: { githubAccessToken: "", githubUrl: "" } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'disconnect failed', detail: String(err) });
  }
});

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ProjectDoc>('projects')
      .find({ userId: req.userId! })
      .toArray();
    const projects = docs.map(({ _id, userId, ...rest }) => ({ id: _id, ...rest }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const { id: _ignore, ...body } = req.body ?? {};
    const doc: ProjectDoc = {
      _id: id,
      userId: req.userId!,
      title: body.title ?? '',
      description: body.description ?? '',
      language: body.language ?? '',
      difficulty: body.difficulty ?? '',
      learningGoals: body.learningGoals ?? [],
      files: body.files ?? [],
      steps: body.steps ?? [],
      currentStep: body.currentStep ?? 0,
      updatedAt: body.updatedAt ?? new Date().toISOString(),
    };
    await db
      .collection<ProjectDoc>('projects')
      .replaceOne({ _id: id, userId: req.userId! }, doc, { upsert: true });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'save failed', detail: String(err) });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const result = await db
      .collection<ProjectDoc>('projects')
      .deleteOne({ _id: req.params.id, userId: req.userId! });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: 'delete failed', detail: String(err) });
  }
});

app.post('/api/projects/:id/export', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const profile = await db.collection<ProfileDoc>('profiles').findOne({ _id: req.userId! });
    
    if (!profile?.githubAccessToken) {
      return res.status(400).json({ error: 'GitHub account not connected' });
    }

    const project = await db.collection<ProjectDoc>('projects').findOne({ _id: req.params.id, userId: req.userId! });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const repoName = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'lahacks-project';
    const repoDescription = project.description || 'Exported project from LaHacks Learning Dashboard';

    // 1. Create Repository
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${profile.githubAccessToken}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        description: repoDescription,
        private: false,
        auto_init: true,
      }),
    });

    const repoData = await createRepoRes.json();
    if (createRepoRes.status !== 201) {
      // If repo exists, github returns 422
      if (createRepoRes.status === 422 && repoData.errors?.[0]?.message === 'name already exists on this account') {
        return res.status(400).json({ error: 'A repository with this name already exists on your GitHub.' });
      }
      console.error('GitHub Create Repo Error:', repoData);
      return res.status(500).json({ error: 'Failed to create GitHub repository', details: repoData });
    }

    // 2. Commit files to the repo
    // We will do a simple push via the contents API. Since it's multiple files, a tree commit is better, 
    // but for simplicity we can just create them one by one or create a gist if preferred.
    // For a real repo, uploading multiple files correctly requires Trees API. 
    // We'll create files sequentially for simplicity since it's usually just a few files (index.html, styles.css, script.js).
    
    const files = project.files as { name: string; content: string }[];
    for (const file of files) {
      // Clean path, remove leading slash
      const cleanPath = file.name.startsWith('/') ? file.name.slice(1) : file.name;
      await fetch(`https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/contents/${cleanPath}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${profile.githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Add ${cleanPath}`,
          content: Buffer.from(file.content || '').toString('base64'),
        }),
      });
    }

    res.json({ success: true, url: repoData.html_url });
  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: 'Export failed', detail: String(err) });
  }
});

app.get('/api/challenges', async (_req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ChallengeDoc>('challenges')
      .find({})
      .sort({ likes: -1, createdAt: -1 })
      .toArray();
    res.json(docs.map(challengeToResponse));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.post('/api/challenges', requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const language = typeof body.language === 'string' ? body.language.trim() : '';
    const difficulty = typeof body.difficulty === 'string' ? body.difficulty.trim() : '';

    if (!title || title.length > 120) {
      return res.status(400).json({ error: 'title required (1-120 chars)' });
    }
    if (!description || description.length > 1000) {
      return res.status(400).json({ error: 'description required (1-1000 chars)' });
    }
    if (!language || language.length > 40) {
      return res.status(400).json({ error: 'language required (1-40 chars)' });
    }
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be Beginner | Intermediate | Advanced' });
    }

    const dueDateRaw = typeof body.dueDate === 'string' ? body.dueDate.trim() : '';
    const dueDateMs = Date.parse(dueDateRaw);
    if (!Number.isFinite(dueDateMs)) {
      return res.status(400).json({ error: 'dueDate required (ISO 8601 timestamp)' });
    }
    const now = Date.now();
    if (dueDateMs - now < ONE_DAY_MS) {
      return res.status(400).json({ error: 'dueDate must be at least 1 day in the future' });
    }
    if (dueDateMs - now > ONE_YEAR_MS) {
      return res.status(400).json({ error: 'dueDate must be within 1 year' });
    }

    const tags = Array.isArray(body.tags)
      ? body.tags
          .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
          .filter((t: string) => t.length > 0 && t.length <= 30)
          .slice(0, 12)
      : [];

    const requirements =
      typeof body.requirements === 'string' ? body.requirements.slice(0, 4000) : '';
    const resources =
      typeof body.resources === 'string' ? body.resources.slice(0, 4000) : '';
    const starterCode =
      typeof body.starterCode === 'string' ? body.starterCode.slice(0, 10000) : '';
    const estimatedTime =
      typeof body.estimatedTime === 'string' ? body.estimatedTime.trim().slice(0, 40) : '';

    const submittedCompanyName =
      typeof body.company?.name === 'string' ? body.company.name.trim().slice(0, 60) : '';
    const submittedCompanyRole =
      typeof body.company?.role === 'string' ? body.company.role.trim().slice(0, 60) : '';

    const email = (req.userEmail ?? '').toLowerCase();
    const domain = email.includes('@') ? email.split('@')[1] : '';
    const verifiedCompany = VERIFIED_COMPANY_DOMAINS[domain] ?? null;

    let company: ChallengeDoc['company'] = null;
    let logoUrl: string | null = null;
    if (verifiedCompany) {
      company = { name: verifiedCompany.name, role: submittedCompanyRole || 'Engineer' };
      logoUrl = publicLogoUrl(verifiedCompany.logoFile);
    } else if (submittedCompanyName) {
      company = { name: submittedCompanyName, role: submittedCompanyRole };
    }

    const username = email ? email.split('@')[0] : 'anonymous';

    const doc: ChallengeDoc = {
      _id: randomUUID(),
      authorId: req.userId!,
      authorEmail: email,
      authorUsername: username,
      title,
      description,
      language,
      difficulty,
      tags,
      requirements,
      resources,
      starterCode,
      estimatedTime,
      company,
      verified: Boolean(verifiedCompany),
      logoUrl,
      likes: 0,
      dueDate: new Date(dueDateMs).toISOString(),
      podium: null,
      createdAt: new Date().toISOString(),
    };

    const db = await getDb();
    await db.collection<ChallengeDoc>('challenges').insertOne(doc);

    res.status(201).json(challengeToResponse(doc));
  } catch (err) {
    res.status(500).json({ error: 'create failed', detail: String(err) });
  }
});

async function publicProfile(doc: ProfileDoc) {
  return {
    username: doc.username,
    fullName: doc.fullName,
    bio: doc.bio,
    avatarUrl: doc.avatarUrl,
    linkedinUrl: doc.linkedinUrl,
    githubUrl: doc.githubUrl,
    twitterUrl: doc.twitterUrl,
    elo: doc.elo,
    globalRank: await globalEloRank(doc.userId, doc.elo),
    updatedAt: doc.updatedAt,
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<ProfileDoc>('profiles')
      .find({ username: { $type: 'string', $gt: '' } })
      .toArray();
    const profiles = docs
      .map((doc) => ({ ...emptyProfile(doc._id, doc.username), ...doc }))
      .sort((a, b) => {
        if (b.elo !== a.elo) return b.elo - a.elo;
        return a._id.localeCompare(b._id);
      })
      .slice(0, 100)
      .map((doc, index) => ({
        username: doc.username,
        fullName: doc.fullName,
        avatarUrl: doc.avatarUrl,
        elo: doc.elo,
        globalRank: index + 1,
        updatedAt: doc.updatedAt,
      }));
    res.json(profiles);
  } catch (err) {
    res.status(500).json({ error: 'leaderboard failed', detail: String(err) });
  }
});

app.get('/api/users/search', async (req, res) => {
  try {
    const q = String(req.query.q ?? '').trim();
    if (!q) return res.json([]);
    const re = new RegExp(escapeRegex(q), 'i');
    const db = await getDb();
    const docs = await db
      .collection<ProfileDoc>('profiles')
      .find({
        $and: [
          { username: { $type: 'string', $gt: '' } },
          { $or: [{ username: re }, { fullName: re }] },
        ],
      })
      .limit(10)
      .toArray();
    res.json(
      docs.map((d) => ({
        username: d.username,
        fullName: d.fullName,
        avatarUrl: d.avatarUrl,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: 'search failed', detail: String(err) });
  }
});

app.get('/api/users/:username', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const doc = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!doc) return res.status(404).json({ error: 'not found' });
    const profile: ProfileDoc = { ...emptyProfile(doc._id, doc.username), ...doc };
    res.json(await publicProfile(profile));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/users/:username/projects', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const docs = await db
      .collection<ProjectDoc>('projects')
      .find({ userId: profile.userId })
      .sort({ updatedAt: -1 })
      .toArray();
    const projects = docs.map(({ _id, userId, files, steps, ...rest }) => ({
      id: _id,
      ...rest,
      totalSteps: Array.isArray(steps) ? steps.length : 0,
    }));
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/users/:username/challenges', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const docs = await db
      .collection<ChallengeDoc>('challenges')
      .find({ authorId: profile.userId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json(docs.map(({ _id, authorEmail, ...rest }) => ({ id: _id, ...rest })));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Single challenge fetch ────────────────────────────────────────────────
app.get('/api/challenges/:id', async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(challengeToResponse(doc));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Podium wins for a user (verified challenges only) ────────────────────
app.get('/api/users/:username/podium-wins', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const userId = profile.userId;

    const challenges = await db
      .collection<ChallengeDoc>('challenges')
      .find({
        verified: true,
        podium: { $ne: null },
        $or: [
          { 'podium.firstUserId': userId },
          { 'podium.secondUserId': userId },
          { 'podium.thirdUserId': userId },
        ],
      })
      .sort({ 'podium.gradedAt': -1 })
      .toArray();

    const byPlacement = { first: 0, second: 0, third: 0 };
    const byDifficulty = { Beginner: 0, Intermediate: 0, Advanced: 0 };
    const wins = challenges.map((c) => {
      let placement: 1 | 2 | 3 = 3;
      if (c.podium!.firstUserId === userId) {
        placement = 1;
        byPlacement.first++;
      } else if (c.podium!.secondUserId === userId) {
        placement = 2;
        byPlacement.second++;
      } else {
        placement = 3;
        byPlacement.third++;
      }
      const diff = c.difficulty as keyof typeof byDifficulty;
      if (diff in byDifficulty) byDifficulty[diff]++;
      return {
        challengeId: c._id,
        title: c.title,
        company: c.company,
        difficulty: c.difficulty,
        placement,
        gradedAt: c.podium!.gradedAt,
      };
    });

    res.json({ total: wins.length, byPlacement, byDifficulty, wins });
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Challenges I created (for profile "Challenges Created" tab) ───────────
app.get('/api/challenges/mine/created', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenges = await db
      .collection<ChallengeDoc>('challenges')
      .find({ authorId: req.userId! })
      .sort({ createdAt: -1 })
      .toArray();
    if (challenges.length === 0) return res.json([]);

    const ids = challenges.map((c) => c._id);
    const counts = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .aggregate<{ _id: string; total: number; locked: number }>([
        { $match: { challengeId: { $in: ids } } },
        {
          $group: {
            _id: '$challengeId',
            total: { $sum: 1 },
            locked: { $sum: { $cond: ['$locked', 1, 0] } },
          },
        },
      ])
      .toArray();
    const countMap = new Map(counts.map((c) => [c._id, c]));

    res.json(
      challenges.map((c) => {
        const count = countMap.get(c._id);
        return {
          ...challengeToResponse(c),
          submissionCount: count?.locked ?? 0,
          draftCount: (count?.total ?? 0) - (count?.locked ?? 0),
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── My submissions across all challenges (for Challenge Dojo) ─────────────
app.get('/api/submissions/mine', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const submissions = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .find({ userId: req.userId! })
      .sort({ updatedAt: -1 })
      .toArray();
    if (submissions.length === 0) return res.json([]);

    const challengeIds = [...new Set(submissions.map((s) => s.challengeId))];
    const challenges = await db
      .collection<ChallengeDoc>('challenges')
      .find({ _id: { $in: challengeIds } })
      .toArray();
    const challengeMap = new Map(challenges.map((c) => [c._id, c]));

    res.json(
      submissions.map((s) => {
        const ch = challengeMap.get(s.challengeId);
        let placement: 1 | 2 | 3 | null = null;
        if (ch?.podium) {
          if (ch.podium.firstUserId === s.userId) placement = 1;
          else if (ch.podium.secondUserId === s.userId) placement = 2;
          else if (ch.podium.thirdUserId === s.userId) placement = 3;
        }
        return {
          ...submissionToResponse(s),
          challenge: ch ? challengeToResponse(ch) : null,
          placement,
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── My submission for a specific challenge ────────────────────────────────
app.get('/api/submissions/:challengeId/me', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .findOne({ challengeId: req.params.challengeId, userId: req.userId! });
    if (!doc) return res.status(404).json({ error: 'no submission yet' });
    res.json(submissionToResponse(doc));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Save draft submission (or update unlocked one) ────────────────────────
app.put('/api/submissions/:challengeId', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.challengeId });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (deriveChallengeState(challenge) !== 'open') {
      return res.status(400).json({ error: 'challenge is closed; submissions locked' });
    }

    const existing = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .findOne({ challengeId: challenge._id, userId: req.userId! });
    if (existing?.locked) {
      return res.status(409).json({ error: 'submission already locked; cannot edit' });
    }

    const body = req.body ?? {};
    const trim = (s: unknown, max: number) =>
      typeof s === 'string' ? s.trim().slice(0, max) : '';
    const githubUrl = trim(body.githubUrl, SUBMISSION_URL_MAX);
    const deployedUrl = trim(body.deployedUrl, SUBMISSION_URL_MAX);
    const notes = typeof body.notes === 'string' ? body.notes.slice(0, SUBMISSION_NOTES_MAX) : '';
    const validUrl = (u: string) => u === '' || /^https?:\/\//i.test(u);
    if (!validUrl(githubUrl) || !validUrl(deployedUrl)) {
      return res.status(400).json({ error: 'urls must start with http(s)://' });
    }

    const zipPath =
      typeof body.zipPath === 'string' && body.zipPath.startsWith(`${challenge._id}/`)
        ? body.zipPath
        : (existing?.zipPath ?? null);
    const zipFileName =
      typeof body.zipFileName === 'string' ? body.zipFileName.slice(0, 200) : (existing?.zipFileName ?? null);

    const now = new Date().toISOString();
    const email = (req.userEmail ?? '').toLowerCase();
    const username = email ? email.split('@')[0] : 'anonymous';

    const convertOnWin =
      typeof body.convertOnWin === 'boolean'
        ? body.convertOnWin
        : (existing?.convertOnWin ?? true);

    const doc: SubmissionDoc = {
      _id: existing?._id ?? randomUUID(),
      challengeId: challenge._id,
      userId: req.userId!,
      authorEmail: email,
      authorUsername: username,
      zipPath,
      zipFileName,
      githubUrl,
      deployedUrl,
      notes,
      locked: false,
      convertOnWin,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      submittedAt: null,
    };

    await db
      .collection<SubmissionDoc>('challenge_submissions')
      .replaceOne(
        { challengeId: challenge._id, userId: req.userId! },
        doc,
        { upsert: true },
      );
    res.json(submissionToResponse(doc));
  } catch (err) {
    res.status(500).json({ error: 'save failed', detail: String(err) });
  }
});

// ─── Get a signed upload URL for the zip ───────────────────────────────────
app.post('/api/submissions/:challengeId/upload-url', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.challengeId });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (deriveChallengeState(challenge) !== 'open') {
      return res.status(400).json({ error: 'challenge is closed' });
    }
    const existing = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .findOne({ challengeId: challenge._id, userId: req.userId! });
    if (existing?.locked) {
      return res.status(409).json({ error: 'submission already locked' });
    }

    const path = `${challenge._id}/${req.userId!}.zip`;
    const data = await generateSignedUploadUrl(path);
    res.json({ ...data, path });
  } catch (err) {
    res.status(500).json({ error: 'upload-url failed', detail: String(err) });
  }
});

// ─── Lock submission (final submit) ────────────────────────────────────────
app.post('/api/submissions/:challengeId/submit', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.challengeId });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (deriveChallengeState(challenge) !== 'open') {
      return res.status(400).json({ error: 'challenge is closed' });
    }

    const existing = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .findOne({ challengeId: challenge._id, userId: req.userId! });
    if (!existing) return res.status(404).json({ error: 'no draft to submit' });
    if (existing.locked) return res.status(409).json({ error: 'already submitted' });
    if (!existing.zipPath && !existing.githubUrl && !existing.deployedUrl) {
      return res.status(400).json({ error: 'submit requires a zip, GitHub URL, or deployed URL' });
    }

    const now = new Date().toISOString();
    await db
      .collection<SubmissionDoc>('challenge_submissions')
      .updateOne(
        { _id: existing._id },
        { $set: { locked: true, submittedAt: now, updatedAt: now } },
      );
    res.json({ ...submissionToResponse(existing), locked: true, submittedAt: now, updatedAt: now });
  } catch (err) {
    res.status(500).json({ error: 'submit failed', detail: String(err) });
  }
});

// ─── List submissions for a challenge (creator only) ───────────────────────
app.get('/api/challenges/:id/submissions', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.id });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (challenge.authorId !== req.userId) {
      return res.status(403).json({ error: 'only challenge creator can view submissions' });
    }

    const submissions = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .find({ challengeId: challenge._id, locked: true })
      .sort({ submittedAt: 1 })
      .toArray();
    if (submissions.length === 0) return res.json([]);

    const userIds = submissions.map((s) => s.userId);
    const profiles = await db
      .collection<ProfileDoc>('profiles')
      .find({ _id: { $in: userIds } })
      .toArray();
    const profileMap = new Map(profiles.map((p) => [p._id, p]));

    res.json(
      submissions.map((s) => {
        const p = profileMap.get(s.userId);
        return {
          ...submissionToResponse(s),
          author: {
            userId: s.userId,
            email: s.authorEmail,
            username: s.authorUsername,
            fullName: p?.fullName ?? '',
            avatarUrl: p?.avatarUrl ?? '',
            linkedinUrl: p?.linkedinUrl ?? '',
            githubUrl: p?.githubUrl ?? '',
            twitterUrl: p?.twitterUrl ?? '',
          },
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Signed download URL for a submission zip (creator only) ───────────────
app.get(
  '/api/challenges/:challengeId/submissions/:userId/download-url',
  requireAuth,
  async (req, res) => {
    try {
      const db = await getDb();
      const challenge = await db
        .collection<ChallengeDoc>('challenges')
        .findOne({ _id: req.params.challengeId });
      if (!challenge) return res.status(404).json({ error: 'challenge not found' });
      if (challenge.authorId !== req.userId) {
        return res.status(403).json({ error: 'only challenge creator can download submissions' });
      }
      const submission = await db
        .collection<SubmissionDoc>('challenge_submissions')
        .findOne({ challengeId: challenge._id, userId: req.params.userId });
      if (!submission?.zipPath) {
        return res.status(404).json({ error: 'no zip uploaded for this submission' });
      }
      const data = await generateSignedDownloadUrl(submission.zipPath);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: 'download-url failed', detail: String(err) });
    }
  },
);

// ─── Grade challenge — creator only, after due date ────────────────────────
app.post('/api/challenges/:id/grade', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.id });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (challenge.authorId !== req.userId) {
      return res.status(403).json({ error: 'only challenge creator can grade' });
    }
    if (deriveChallengeState(challenge) === 'open') {
      return res.status(400).json({ error: 'cannot grade until due date passes' });
    }
    if (challenge.podium) {
      return res.status(409).json({ error: 'already graded' });
    }

    const body = req.body ?? {};
    const podiumIn = body.podium ?? {};
    const slots: Array<'firstUserId' | 'secondUserId' | 'thirdUserId'> = [
      'firstUserId',
      'secondUserId',
      'thirdUserId',
    ];
    const ids: (string | null)[] = slots.map((k) =>
      typeof podiumIn[k] === 'string' && podiumIn[k].length > 0 ? podiumIn[k] : null,
    );
    const filled = ids.filter((x): x is string => Boolean(x));
    if (filled.length === 0) {
      return res.status(400).json({ error: 'pick at least one podium slot' });
    }
    if (new Set(filled).size !== filled.length) {
      return res.status(400).json({ error: 'podium slots must be distinct users' });
    }

    const lockedSubmissions = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .find({ challengeId: challenge._id, locked: true })
      .toArray();
    const validUserIds = new Set(lockedSubmissions.map((s) => s.userId));
    for (const id of filled) {
      if (!validUserIds.has(id)) {
        return res.status(400).json({ error: `userId ${id} did not submit to this challenge` });
      }
    }

    const trim = (s: unknown) => (typeof s === 'string' ? s.slice(0, 2000) : '');
    const podium: Podium = {
      firstUserId: ids[0],
      secondUserId: ids[1],
      thirdUserId: ids[2],
      rationale: {
        first: trim(podiumIn.rationale?.first),
        second: trim(podiumIn.rationale?.second),
        third: trim(podiumIn.rationale?.third),
      },
      gradedAt: new Date().toISOString(),
    };

    await db
      .collection<ChallengeDoc>('challenges')
      .updateOne({ _id: challenge._id }, { $set: { podium } });

    // Auto-convert the 1st-place winner's submission into a public School
    // project, if they opted in via the convertOnWin flag at submit time.
    // Best-effort: a Flask/Gemini failure must not block grading.
    let schoolProjectId: string | null = null;
    try {
      schoolProjectId = await convertWinnerToSchoolProject({
        ...challenge,
        podium,
      });
    } catch (err) {
      console.error('[school-conversion] failed:', err);
    }

    // Elo is allocated by /api/challenges/:id/rank, not at grade time.
    res.json({
      challenge: {
        ...challengeToResponse({
          ...challenge,
          podium,
          schoolProjectId: schoolProjectId ?? challenge.schoolProjectId ?? null,
        }),
      },
      eloChanges: [],
      schoolProjectId,
    });
  } catch (err) {
    res.status(500).json({ error: 'grade failed', detail: String(err) });
  }
});

// ─── AI ranking — creator only, after grading ──────────────────────────────
app.post('/api/challenges/:id/rank', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const challenge = await db
      .collection<ChallengeDoc>('challenges')
      .findOne({ _id: req.params.id });
    if (!challenge) return res.status(404).json({ error: 'challenge not found' });
    if (challenge.authorId !== req.userId) {
      return res.status(403).json({ error: 'only challenge creator can rank' });
    }
    if (!challenge.podium) {
      return res.status(400).json({ error: 'grade the challenge first' });
    }
    if (challenge.ranked) {
      return res.status(409).json({ error: 'already ranked' });
    }

    const submissions = await db
      .collection<SubmissionDoc>('challenge_submissions')
      .find({ challengeId: challenge._id, locked: true })
      .toArray();
    if (submissions.length === 0) {
      return res.status(400).json({ error: 'no submissions to rank' });
    }

    const podium = challenge.podium;
    const podiumIds: string[] = [
      podium.firstUserId,
      podium.secondUserId,
      podium.thirdUserId,
    ].filter((x): x is string => Boolean(x));
    const submissionUserIds = new Set(submissions.map((s) => s.userId));
    const validPodiumIds = podiumIds.filter((id) => submissionUserIds.has(id));
    const nonPodium = submissions.filter((s) => !validPodiumIds.includes(s.userId));

    let aiRanking: string[] = [];
    let aiReasoning = '';
    if (nonPodium.length > 0) {
      try {
        const result = await rankSubmissionsWithAI(challenge, nonPodium);
        const validNonPodiumIds = new Set(nonPodium.map((s) => s.userId));
        // Keep only ids the AI returned that are real non-podium submitters,
        // dedupe, then append any missing ones (shouldn't happen but defensive).
        const seen = new Set<string>();
        for (const id of result.ranking) {
          if (validNonPodiumIds.has(id) && !seen.has(id)) {
            seen.add(id);
            aiRanking.push(id);
          }
        }
        for (const s of nonPodium) {
          if (!seen.has(s.userId)) aiRanking.push(s.userId);
        }
        aiReasoning = result.reasoning;
      } catch (err) {
        aiReasoning = `AI ranking unavailable; used random fallback. (${
          err instanceof Error ? err.message : String(err)
        })`;
        aiRanking = nonPodium
          .map((s) => s.userId)
          .sort(() => Math.random() - 0.5);
      }
    }

    // Reverse the stub elo applied during grading
    const reversed = await reverseEloChangesForChallenge(challenge._id);

    // Generate min-max normalized deltas (already descending: max → min)
    const fullOrder = [...validPodiumIds, ...aiRanking];
    const deltas = minMaxNormDeltas(fullOrder.length);

    const eloChanges: EloChangeDoc[] = [];
    if (challenge.verified) {
      for (let i = 0; i < fullOrder.length; i++) {
        const userId = fullOrder[i];
        const delta = deltas[i];
        const podiumIdx = validPodiumIds.indexOf(userId);
        const place =
          podiumIdx === 0
            ? 'Placed 1st'
            : podiumIdx === 1
              ? 'Placed 2nd'
              : podiumIdx === 2
                ? 'Placed 3rd'
                : `Ranked #${i + 1}`;
        const reason = `${place} in "${challenge.title}"`;
        const change = await applyElo(userId, challenge._id, delta, reason);
        eloChanges.push(change);
      }
    }

    const rankingDetail: AIRankingDetail = {
      ranking: fullOrder,
      deltas,
      reasoning: aiReasoning,
      rankedAt: new Date().toISOString(),
    };
    await db
      .collection<ChallengeDoc>('challenges')
      .updateOne(
        { _id: challenge._id },
        { $set: { ranked: true, rankingDetail } },
      );

    res.json({
      ranked: true,
      verified: challenge.verified,
      stubDeltasReversed: reversed,
      rankingDetail,
      eloChanges,
    });
  } catch (err) {
    res.status(500).json({ error: 'rank failed', detail: String(err) });
  }
});

// ─── Elo history for a user (self only for now) ────────────────────────────
app.get('/api/users/me/elo-history', requireAuth, async (req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<EloChangeDoc>('elo_changes')
      .find({ userId: req.userId! })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(docs.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── Public elo history for a user by username ────────────────────────────
app.get('/api/users/:username/elo-history', async (req, res) => {
  try {
    const username = req.params.username.toLowerCase();
    const db = await getDb();
    const profile = await db
      .collection<ProfileDoc>('profiles')
      .findOne({ username });
    if (!profile) return res.status(404).json({ error: 'user not found' });
    const docs = await db
      .collection<EloChangeDoc>('elo_changes')
      .find({ userId: profile.userId })
      .sort({ createdAt: 1 })
      .toArray();
    res.json(docs.map(({ _id, ...rest }) => ({ id: _id, ...rest })));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

// ─── School (public) projects ─────────────────────────────────────────────

function schoolProjectListItem(doc: SchoolProjectDoc) {
  // List shape: omit heavy step/file payloads; include attribution + meta
  const { _id, files, steps, ...rest } = doc;
  return {
    id: _id,
    ...rest,
    totalSteps: Array.isArray(steps) ? steps.length : 0,
  };
}

function schoolProjectDetail(doc: SchoolProjectDoc) {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

app.get('/api/school/projects', async (_req, res) => {
  try {
    const db = await getDb();
    const docs = await db
      .collection<SchoolProjectDoc>('school_projects')
      .find({})
      .sort({ likes: -1, createdAt: -1 })
      .toArray();
    res.json(docs.map(schoolProjectListItem));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.get('/api/school/projects/:id', async (req, res) => {
  try {
    const db = await getDb();
    const doc = await db
      .collection<SchoolProjectDoc>('school_projects')
      .findOne({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(schoolProjectDetail(doc));
  } catch (err) {
    res.status(500).json({ error: 'fetch failed', detail: String(err) });
  }
});

app.post('/api/school/projects', requireAuth, async (req, res) => {
  // Create a school project. For Phase A this is open to any authed user
  // (a manual seed path). Phase B will call this internally on grading.
  try {
    const body = req.body ?? {};
    const trim = (s: unknown, max: number): string =>
      typeof s === 'string' ? s.trim().slice(0, max) : '';

    const title = trim(body.title, 200);
    const description = trim(body.description, 2000);
    const language = trim(body.language, 40);
    const difficulty = trim(body.difficulty, 40);
    if (!title) return res.status(400).json({ error: 'title required' });
    if (!language) return res.status(400).json({ error: 'language required' });
    if (!ALLOWED_DIFFICULTIES.has(difficulty)) {
      return res.status(400).json({ error: 'difficulty must be Beginner|Intermediate|Advanced' });
    }

    const learningGoals = Array.isArray(body.learningGoals)
      ? body.learningGoals
          .filter((g: unknown) => typeof g === 'string')
          .map((g: string) => g.trim().slice(0, 200))
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const files = Array.isArray(body.files) ? body.files : [];
    const steps = Array.isArray(body.steps) ? body.steps : [];

    const sourceChallengeId =
      typeof body.sourceChallengeId === 'string' ? body.sourceChallengeId : null;
    const sourceWinnerId =
      typeof body.sourceWinnerId === 'string' ? body.sourceWinnerId : null;
    const sourceWinnerUsername =
      typeof body.sourceWinnerUsername === 'string'
        ? body.sourceWinnerUsername.toLowerCase()
        : null;

    const now = new Date().toISOString();
    const doc: SchoolProjectDoc = {
      _id: randomUUID(),
      title,
      description,
      language,
      difficulty,
      learningGoals,
      files,
      steps,
      sourceChallengeId,
      sourceWinnerId,
      sourceWinnerUsername,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    };

    const db = await getDb();
    await db.collection<SchoolProjectDoc>('school_projects').insertOne(doc);
    res.status(201).json(schoolProjectDetail(doc));
  } catch (err) {
    res.status(500).json({ error: 'create failed', detail: String(err) });
  }
});

app.post('/api/school/projects/:id/fork', requireAuth, async (req, res) => {
  // Copy a school project into the user's private projects collection.
  // Idempotent: if the user has already forked this school project, return
  // the existing fork instead of creating a duplicate.
  try {
    const db = await getDb();
    const projects = db.collection<ProjectDoc>('projects');

    const existing = await projects.findOne({
      userId: req.userId!,
      forkedFromSchoolId: req.params.id,
    });
    if (existing) {
      const { _id, userId: _u, ...rest } = existing;
      return res.status(200).json({ id: _id, ...rest });
    }

    const source = await db
      .collection<SchoolProjectDoc>('school_projects')
      .findOne({ _id: req.params.id });
    if (!source) return res.status(404).json({ error: 'school project not found' });

    const newId = randomUUID();
    const doc: ProjectDoc = {
      _id: newId,
      userId: req.userId!,
      title: source.title,
      description: source.description,
      language: source.language,
      difficulty: source.difficulty,
      learningGoals: source.learningGoals,
      files: source.files,
      steps: source.steps,
      currentStep: 0,
      updatedAt: new Date().toISOString(),
      forkedFromSchoolId: req.params.id,
    };
    await projects.insertOne(doc);

    const { _id, userId: _u, ...rest } = doc;
    res.status(201).json({ id: _id, ...rest });
  } catch (err) {
    res.status(500).json({ error: 'fork failed', detail: String(err) });
  }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
